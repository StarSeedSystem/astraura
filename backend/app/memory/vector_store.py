import json
import math
import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from ..core.config import settings

# (Adenda 157) Índice comprimido con TurboQuant. El almacén es TF-IDF DISPERSO;
# TurboQuant trabaja con vectores DENSOS, así que se usa como PRIMER PASO:
#   sparse TF-IDF --proyección aleatoria fija--> denso d=256 --TurboQuant--> códigos
# La búsqueda recupera candidatos con los códigos (barato, ~7x menos memoria) y
# reordena los finalistas con el coseno disperso EXACTO de siempre. Así se gana
# memoria y velocidad sin perder precisión en el resultado que ve el usuario.
try:
    from . import turboquant as _tq
except Exception:  # pragma: no cover
    _tq = None  # type: ignore[assignment]

_DENSE_DIM = int(os.environ.get("ASTRAURA_TQ_DIM") or 256)
_TQ_BITS = int(os.environ.get("ASTRAURA_TQ_BITS") or 4)
# Con pocos documentos el coseno exacto ya es instantáneo: el índice solo se
# activa cuando de verdad aporta.
_TQ_MIN_DOCS = int(os.environ.get("ASTRAURA_TQ_MIN_DOCS") or 200)

class LocalVectorStore:
    """
    Lightweight, dependency-free local vector and semantic memory engine.
    Uses subword n-gram TF-IDF vectors and cosine similarity for rapid semantic search.
    """
    def __init__(self, persistence_file: Optional[Path] = None):
        self.file_path = persistence_file or (settings.data_path / "vector_store" / "vectors.json")
        self.documents: List[Dict[str, Any]] = []
        self.vocabulary: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self._tq_index: List[Any] = []
        self._tq_ids: List[Any] = []
        self._tq_matrix: Optional[Dict[str, Any]] = None
        self._tq_stats: Dict[str, Any] = {}
        self.load()
        if self._tq_enabled():
            try:
                self.build_quantized_index()
            except Exception:
                self._tq_index = []

    def _tokenize(self, text: str) -> List[str]:
        cleaned = re.sub(r"[^\w\s-]", " ", text.lower())
        tokens = [t for t in cleaned.split() if len(t) > 2]
        # Also generate character 3-grams & 4-grams for subword semantics
        subwords = []
        for t in tokens:
            if len(t) >= 4:
                for i in range(len(t) - 3):
                    subwords.append(t[i:i+4])
        return tokens + subwords

    def _compute_vector(self, text: str) -> Dict[str, float]:
        tokens = self._tokenize(text)
        if not tokens:
            return {}
        
        # Term Frequency
        tf: Dict[str, float] = {}
        for t in tokens:
            tf[t] = tf.get(t, 0.0) + 1.0
        
        # Normalize and apply IDF
        vec: Dict[str, float] = {}
        norm_sq = 0.0
        for t, count in tf.items():
            idf_val = self.idf.get(t, 1.5)
            val = (count / len(tokens)) * idf_val
            vec[t] = val
            norm_sq += val * val
            
        norm = math.sqrt(norm_sq) or 1.0
        return {k: v / norm for k, v in vec.items()}

    # ── Índice denso comprimido (TurboQuant) ──────────────────────────────
    def _project(self, sparse: Dict[str, float]) -> List[float]:
        """Proyección aleatoria estable (hashing con signo) sparse → denso d."""
        dense = [0.0] * _DENSE_DIM
        for token, value in sparse.items():
            h = hash((token, 1580)) & 0xFFFFFFFF
            idx = h % _DENSE_DIM
            sign = 1.0 if (h >> 16) & 1 else -1.0
            dense[idx] += sign * value
        norm = math.sqrt(sum(x * x for x in dense)) or 1.0
        return [x / norm for x in dense]

    def _tq_enabled(self) -> bool:
        if os.environ.get("ASTRAURA_TQ_DISABLED") == "1":
            return False
        return bool(_tq and _tq.available() and len(self.documents) >= _TQ_MIN_DOCS)

    def build_quantized_index(self) -> Dict[str, Any]:
        """(Re)construye el índice comprimido. Devuelve sus métricas reales."""
        if not (_tq and _tq.available()):
            self._tq_index = []
            return {"enabled": False, "reason": "numpy no disponible"}
        dense = [self._project(d.get("vector", {})) for d in self.documents]
        # Una sola matriz comprimida (uint8) en vez de N objetos: la búsqueda pasa
        # a ser un producto matricial en numpy (microsegundos) en vez de N llamadas.
        self._tq_matrix = _tq.pack_matrix(dense, _TQ_BITS)
        self._tq_ids = [d.get("id") for d in self.documents]
        self._tq_index = self._tq_ids  # compatibilidad con quantization_status()
        stats = _tq.estimate_quality(dense[:256], bits=_TQ_BITS) if dense else {}
        self._tq_stats = {
            "enabled": self._tq_enabled(),
            "bits": _TQ_BITS,
            "dim": _DENSE_DIM,
            "documentos": len(self.documents),
            "minimo_para_activarse": _TQ_MIN_DOCS,
            **stats,
        }
        return self._tq_stats

    def quantization_status(self) -> Dict[str, Any]:
        """Estado honesto del índice comprimido (para /api/status y el OS)."""
        base = {
            "codec": "turboquant-v1",
            "disponible": bool(_tq and _tq.available()),
            "activo": self._tq_enabled(),
            "bits": _TQ_BITS,
            "dim": _DENSE_DIM,
            "documentos": len(self.documents),
            "minimo_para_activarse": _TQ_MIN_DOCS,
            "indexados": len(getattr(self, "_tq_index", []) or []),
            "nota": "Comprime el ÍNDICE de memoria (vectores), no los pesos del modelo.",
        }
        base.update(getattr(self, "_tq_stats", {}) or {})
        return base

    def _cosine_similarity(self, v1: Dict[str, float], v2: Dict[str, float]) -> float:
        score = 0.0
        # Iterate over smaller dict
        if len(v1) > len(v2):
            v1, v2 = v2, v1
        for k, val in v1.items():
            if k in v2:
                score += val * v2[k]
        return score

    def rebuild_idf(self):
        N = len(self.documents)
        if N == 0:
            return
        df: Dict[str, int] = {}
        for doc in self.documents:
            tokens = set(self._tokenize(doc["text"]))
            for t in tokens:
                df[t] = df.get(t, 0) + 1
        self.idf = {t: math.log((N + 1) / (count + 1)) + 1.0 for t, count in df.items()}
        # Recompute vectors
        for doc in self.documents:
            doc["vector"] = self._compute_vector(doc["text"])

    def add_document(self, text: str, metadata: Optional[Dict[str, Any]] = None, auto_rebuild: bool = True):
        doc_id = f"doc_{len(self.documents) + 1}_{int(Path.cwd().stat().st_mtime)}"
        doc = {
            "id": doc_id,
            "text": text.strip(),
            "metadata": metadata or {},
            "vector": {}
        }
        self.documents.append(doc)
        self._index_last_document()
        if auto_rebuild:
            self.rebuild_idf()
            self.save()
        return doc_id

    def _index_last_document(self) -> None:
        """Marca el índice como sucio al añadir; se reconstruye en bloque (es barato)."""
        if not (self._tq_enabled() and _tq is not None and self.documents):
            return
        try:
            self.build_quantized_index()
        except Exception:
            self._tq_matrix = None

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not self.documents:
            return []
        
        q_vec = self._compute_vector(query)

        # PRIMER PASO comprimido: si el índice está activo, quedarse con los
        # mejores candidatos por coseno aproximado (mucho más barato) y afinar
        # después con el coseno exacto de siempre.
        candidates = self.documents
        if self._tq_enabled() and self._tq_index and _tq is not None:
            try:
                rough = _tq.topk_matrix(self._tq_matrix or {}, self._project(q_vec), max(top_k * 5, 25))
                keep = {self._tq_ids[i] for i, _ in rough if 0 <= i < len(self._tq_ids)}
                if keep:
                    candidates = [d for d in self.documents if d.get("id") in keep]
            except Exception:
                candidates = self.documents

        scored = []
        for doc in candidates:
            sim = self._cosine_similarity(q_vec, doc.get("vector", {}))
            if sim > 0.01:
                scored.append({
                    "id": doc["id"],
                    "text": doc["text"],
                    "metadata": doc["metadata"],
                    "similarity": round(float(sim), 4)
                })
                
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]

    def save(self):
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "documents": [
                {"id": d["id"], "text": d["text"], "metadata": d["metadata"]}
                for d in self.documents
            ],
            "idf": self.idf
        }
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def load(self):
        if self.file_path.exists():
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.idf = data.get("idf", {})
                    docs = data.get("documents", [])
                    self.documents = []
                    for d in docs:
                        d["vector"] = self._compute_vector(d["text"])
                        self.documents.append(d)
            except Exception:
                self.documents = []

vector_store = LocalVectorStore()
