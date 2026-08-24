"""
═══════════════════════════════════════════════════════════════════════════════
TURBOQUANT — cuantización de VECTORES para la memoria soberana (Adenda 157)
-------------------------------------------------------------------------------
Implementación en NumPy del «Algorithm 1» de *TurboQuant: Online Vector
Quantization with Near-optimal Distortion Rate* (Zandieh et al., ICLR 2026),
tal y como lo describe la implementación de referencia en C#
(https://github.com/outmatic/TurboQuant, MIT). Aquí se reescribe para Python
porque el backend soberano es Python y no queremos añadir .NET a la neurona.

QUÉ CUANTIZA Y QUÉ NO (honestidad):
  · SÍ: los VECTORES de la memoria — mem0, el índice TF-IDF/embeddings del
    exocórtex y las cachés de similitud. 6-8× menos espacio a 4 bits
    conservando coseno > 0.99 en datos normalizados.
  · NO: los PESOS del modelo. Los pesos ternarios de BitNet b1.58 (i2_s) siguen
    exactamente igual — eso lo hace el motor nativo, no este módulo.

CÓMO FUNCIONA (3 pasos del paper):
  1. Rotación ortogonal aleatoria (semilla fija ⇒ reproducible) para «esparcir»
     la energía del vector: tras rotar, cada coordenada de un vector unitario se
     distribuye ~ N(0, 1/d), y su valor absoluto sigue una Beta(d/2, 1/2).
  2. Cuantizador de Lloyd-Max sobre ESA distribución (no uniforme): los niveles
     se calculan una vez por (bits, dimensión) y se cachean.
  3. Empaquetado de bits (2, 3 o 4 bits por coordenada) en un `bytes` compacto.

Similitud aproximada sin descomprimir: producto punto por tabla de niveles
(equivalente al LUT 16×16 de la implementación de referencia).
═══════════════════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

try:
    import numpy as np
except Exception:  # pragma: no cover - numpy es dependencia del backend
    np = None  # type: ignore[assignment]

__all__ = [
    "TurboQuantCodec",
    "QuantizedVector",
    "available",
    "quantize_vector",
    "dequantize_vector",
    "approx_cosine",
    "estimate_quality",
    "pack_matrix",
    "topk_matrix",
]

SUPPORTED_BITS = (2, 3, 4)
_ROTATION_CACHE: Dict[Tuple[int, int], "np.ndarray"] = {}
_LEVELS_CACHE: Dict[Tuple[int, int], "np.ndarray"] = {}


def available() -> bool:
    """¿Se puede usar? (numpy presente). Nunca lanza."""
    return np is not None


@dataclass
class QuantizedVector:
    """Vector comprimido + lo mínimo para reconstruirlo."""
    codes: bytes
    dim: int
    bits: int
    norm: float
    seed: int

    def nbytes(self) -> int:
        return len(self.codes) + 16  # códigos + cabecera (norma, dim, bits, semilla)

    def to_dict(self) -> Dict[str, object]:
        return {
            "codes": self.codes.hex(),
            "dim": self.dim,
            "bits": self.bits,
            "norm": self.norm,
            "seed": self.seed,
            "codec": "turboquant-v1",
        }

    @staticmethod
    def from_dict(d: Dict[str, object]) -> "QuantizedVector":
        return QuantizedVector(
            codes=bytes.fromhex(str(d.get("codes") or "")),
            dim=int(d.get("dim") or 0),
            bits=int(d.get("bits") or 4),
            norm=float(d.get("norm") or 0.0),
            seed=int(d.get("seed") or 0),
        )


# ───────────────────────── 1 · rotación ortogonal ─────────────────────────

def _rotation(dim: int, seed: int) -> "np.ndarray":
    """Matriz ortogonal Q (QR de una gaussiana) cacheada por (dim, semilla)."""
    key = (dim, seed)
    cached = _ROTATION_CACHE.get(key)
    if cached is not None:
        return cached
    rng = np.random.default_rng(seed)
    q, r = np.linalg.qr(rng.standard_normal((dim, dim)))
    # Fijar los signos hace la descomposición única (y por tanto reproducible).
    q = q * np.sign(np.diag(r))
    _ROTATION_CACHE[key] = q.astype(np.float32)
    return _ROTATION_CACHE[key]


# ─────────────── 2 · niveles Lloyd-Max sobre la Beta(d/2, 1/2) ───────────────

def _levels(bits: int, dim: int, iterations: int = 60, samples: int = 400_000) -> "np.ndarray":
    """
    Niveles óptimos (Lloyd-Max) para las coordenadas de un vector unitario ya
    rotado. En vez de integrar la Beta analíticamente, se estima por Monte Carlo
    con semilla fija: mismo resultado en cada arranque y sin dependencias extra.
    """
    key = (bits, dim)
    cached = _LEVELS_CACHE.get(key)
    if cached is not None:
        return cached
    rng = np.random.default_rng(1_580_000 + bits * 1000 + dim)
    # Muestreo EXACTO y barato de la marginal: una coordenada de un vector unitario
    # uniforme es z / sqrt(z² + χ²(d-1)). Así se evita generar (samples × dim)
    # vectores completos — de ~80 s a milisegundos, con la misma distribución.
    z = rng.standard_normal(samples).astype(np.float64)
    rest = rng.chisquare(max(1, dim - 1), size=samples).astype(np.float64)
    coords = (z / np.sqrt(z * z + rest + 1e-12)).astype(np.float32)
    n = 1 << bits
    # Inicialización por cuantiles: reparte los niveles donde hay masa.
    levels = np.quantile(coords, (np.arange(n) + 0.5) / n).astype(np.float32)
    for _ in range(iterations):
        edges = (levels[1:] + levels[:-1]) / 2.0
        idx = np.searchsorted(edges, coords)
        for k in range(n):
            sel = coords[idx == k]
            if sel.size:
                levels[k] = float(sel.mean())
        levels.sort()
    _LEVELS_CACHE[key] = levels.astype(np.float32)
    return _LEVELS_CACHE[key]


# ───────────────────────── 3 · empaquetado de bits ─────────────────────────

def _pack(codes: "np.ndarray", bits: int) -> bytes:
    bitstring = np.unpackbits(codes.astype(np.uint8)[:, None], axis=1)[:, -bits:]
    flat = bitstring.reshape(-1)
    pad = (-flat.size) % 8
    if pad:
        flat = np.concatenate([flat, np.zeros(pad, dtype=np.uint8)])
    return np.packbits(flat).tobytes()


def _unpack(blob: bytes, count: int, bits: int) -> "np.ndarray":
    flat = np.unpackbits(np.frombuffer(blob, dtype=np.uint8))[: count * bits]
    chunks = flat.reshape(count, bits)
    weights = (1 << np.arange(bits - 1, -1, -1)).astype(np.uint16)
    return (chunks * weights).sum(axis=1).astype(np.uint8)


# ───────────────────────── API pública ─────────────────────────

class TurboQuantCodec:
    """Códec reutilizable (cachea rotación y niveles para su dimensión)."""

    def __init__(self, dim: int, bits: int = 4, seed: int = 158):
        if not available():
            raise RuntimeError("TurboQuant necesita numpy")
        if bits not in SUPPORTED_BITS:
            bits = 4
        self.dim = int(dim)
        self.bits = int(bits)
        self.seed = int(seed)
        self._q = _rotation(self.dim, self.seed)
        self._lv = _levels(self.bits, self.dim)

    def quantize(self, vector: Sequence[float]) -> QuantizedVector:
        v = np.asarray(vector, dtype=np.float32).reshape(-1)
        if v.size != self.dim:
            v = np.resize(v, self.dim)
        norm = float(np.linalg.norm(v))
        unit = v / (norm + 1e-12)
        rotated = unit @ self._q
        edges = (self._lv[1:] + self._lv[:-1]) / 2.0
        codes = np.searchsorted(edges, rotated).astype(np.uint8)
        return QuantizedVector(codes=_pack(codes, self.bits), dim=self.dim, bits=self.bits, norm=norm, seed=self.seed)

    def dequantize(self, qv: QuantizedVector) -> "np.ndarray":
        codes = _unpack(qv.codes, self.dim, self.bits)
        rotated = self._lv[np.clip(codes, 0, len(self._lv) - 1)]
        unit = rotated @ self._q.T
        n = np.linalg.norm(unit)
        if n > 0:
            unit = unit / n
        return (unit * qv.norm).astype(np.float32)

    def approx_dot(self, a: QuantizedVector, b: QuantizedVector) -> float:
        """Producto punto aproximado SIN reconstruir el vector completo."""
        ca = self._lv[np.clip(_unpack(a.codes, self.dim, self.bits), 0, len(self._lv) - 1)]
        cb = self._lv[np.clip(_unpack(b.codes, self.dim, self.bits), 0, len(self._lv) - 1)]
        na, nb = np.linalg.norm(ca), np.linalg.norm(cb)
        if na == 0 or nb == 0:
            return 0.0
        return float((ca @ cb) / (na * nb) * a.norm * b.norm)

    def approx_cosine(self, a: QuantizedVector, b: QuantizedVector) -> float:
        denom = (a.norm * b.norm) or 1.0
        return float(max(-1.0, min(1.0, self.approx_dot(a, b) / denom)))


_CODECS: Dict[Tuple[int, int], TurboQuantCodec] = {}


def _codec(dim: int, bits: int) -> TurboQuantCodec:
    key = (int(dim), int(bits))
    if key not in _CODECS:
        _CODECS[key] = TurboQuantCodec(dim, bits)
    return _CODECS[key]


def quantize_vector(vector: Sequence[float], bits: int = 4) -> Optional[Dict[str, object]]:
    """Comprime un vector → dict serializable. `None` si no se puede (nunca lanza)."""
    try:
        if not available() or len(vector) == 0:
            return None
        return _codec(len(vector), bits).quantize(vector).to_dict()
    except Exception:
        return None


def dequantize_vector(payload: Dict[str, object]) -> Optional[List[float]]:
    """Reconstruye el vector aproximado desde el dict. `None` si no se puede."""
    try:
        if not available() or not payload:
            return None
        qv = QuantizedVector.from_dict(payload)
        if qv.dim <= 0:
            return None
        return _codec(qv.dim, qv.bits).dequantize(qv).tolist()
    except Exception:
        return None


def approx_cosine(a: Dict[str, object], b: Dict[str, object]) -> Optional[float]:
    """Coseno aproximado entre dos vectores comprimidos (sin descomprimir del todo)."""
    try:
        if not available():
            return None
        qa, qb = QuantizedVector.from_dict(a), QuantizedVector.from_dict(b)
        if qa.dim != qb.dim or qa.bits != qb.bits:
            return None
        return _codec(qa.dim, qa.bits).approx_cosine(qa, qb)
    except Exception:
        return None


def estimate_quality(vectors: Sequence[Sequence[float]], bits: int = 4) -> Dict[str, float]:
    """
    Mide de VERDAD lo que se gana y lo que se pierde con una muestra real de la
    memoria: ratio de compresión y coseno medio/mínimo tras reconstruir.
    Devuelve `{}` si no se puede medir (sin numpy o sin muestra).
    """
    try:
        # OJO: `not vectors` con un array de numpy lanza («truth value is ambiguous»);
        # por eso se comprueba la longitud explícitamente.
        if not available() or len(vectors) == 0:
            return {}
        dim = len(vectors[0])
        codec = _codec(dim, bits)
        cosines: List[float] = []
        raw_bytes = 0
        q_bytes = 0
        for v in list(vectors)[:256]:
            arr = np.asarray(v, dtype=np.float32).reshape(-1)
            if arr.size != dim:
                continue
            qv = codec.quantize(arr)
            back = codec.dequantize(qv)
            na, nb = np.linalg.norm(arr), np.linalg.norm(back)
            if na and nb:
                cosines.append(float(arr @ back / (na * nb)))
            raw_bytes += arr.size * 4
            q_bytes += qv.nbytes()
        if not cosines:
            return {}
        return {
            "bits": float(bits),
            "dim": float(dim),
            "muestras": float(len(cosines)),
            "coseno_medio": float(sum(cosines) / len(cosines)),
            "coseno_minimo": float(min(cosines)),
            "ratio_compresion": float(raw_bytes / max(1, q_bytes)),
            "bytes_originales": float(raw_bytes),
            "bytes_comprimidos": float(q_bytes),
        }
    except Exception:
        return {}

# ───────────────── Búsqueda vectorizada sobre un lote comprimido ─────────────────

def pack_matrix(vectors: Sequence[Sequence[float]], bits: int = 4) -> Optional[Dict[str, object]]:
    """
    Comprime N vectores de golpe en UNA matriz de códigos (uint8). Es lo que hace
    práctico el índice: la búsqueda luego es un único producto matricial en numpy,
    no N llamadas de Python.
    """
    try:
        if not available() or len(vectors) == 0:
            return None
        arr = np.asarray(vectors, dtype=np.float32)
        if arr.ndim != 2:
            return None
        n, dim = arr.shape
        codec = _codec(dim, bits)
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        unit = arr / (norms + 1e-12)
        rotated = unit @ codec._q
        edges = (codec._lv[1:] + codec._lv[:-1]) / 2.0
        codes = np.searchsorted(edges, rotated).astype(np.uint8)  # (n, dim)
        return {"codes": codes, "norms": norms.reshape(-1).astype(np.float32), "dim": int(dim), "bits": int(bits), "n": int(n)}
    except Exception:
        return None


def topk_matrix(index: Dict[str, object], query: Sequence[float], k: int = 25) -> List[Tuple[int, float]]:
    """
    Devuelve [(fila, coseno aproximado)] con los k mejores del índice, en una sola
    pasada vectorizada. Lista vacía si no se puede (nunca lanza).
    """
    try:
        if not available() or not index:
            return []
        codes = index.get("codes")
        dim = int(index.get("dim") or 0)
        bits = int(index.get("bits") or 4)
        if codes is None or dim <= 0:
            return []
        codec = _codec(dim, bits)
        q = np.asarray(query, dtype=np.float32).reshape(-1)
        if q.size != dim:
            q = np.resize(q, dim)
        qn = np.linalg.norm(q)
        if qn == 0:
            return []
        q_rot = (q / qn) @ codec._q
        levels = codec._lv[np.clip(np.asarray(codes), 0, len(codec._lv) - 1)]  # (n, dim)
        row_norms = np.linalg.norm(levels, axis=1) + 1e-12
        sims = (levels @ q_rot) / row_norms
        kk = int(max(1, min(k, sims.shape[0])))
        idx = np.argpartition(-sims, kk - 1)[:kk]
        idx = idx[np.argsort(-sims[idx])]
        return [(int(i), float(sims[i])) for i in idx]
    except Exception:
        return []
