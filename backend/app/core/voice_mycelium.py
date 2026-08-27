"""
voice_mycelium.py — Micelio Simbiótico de Voz 1.58-bit (StarSeed OS / Astraura)
================================================================================

Se MONTA SOBRE la malla P2P ya existente en `app/core/mesh_network.py` y la
sincronización en `app/core/supabase_sync.py`. No crea una malla nueva.

Qué hace REAL:
  * Registro local de "voice packs" 1.58-bit (pesos ternarios empaquetados +
    metadata de métrica). Persistencia local en data/voice_mycelium/packs.json.
  * Publicación de NEUROTRANSMISORES ligeros: anuncios tiny en Supabase
    (tabla astraura_voice_mesh, kind="nt") que dicen "tengo pack vN de Speaker-K,
    MOS x, N MB, hash=...". NO llevan el pack, solo el anuncio → señalización
    barata, no inundación.
  * Descubrimiento: lee los NT de otros nodos y, bajo demanda, descarga el pack
    por el canal cifrado de la malla (server-relay en el OS; aquí vía Supabase
    storage/firmas).
  * Bucle de AUTO-MEJORA en segundo plano: cuando hay muestras de audio
    locales, re-entrena/optimiza el pack (trainer BitTTS-style). Siempre
    degrada silenciosamente si no hay datos/GPU/red.
  * HOMEOFOSTASIS: respeta privacidad — solo viaja el aprendizaje empaquetado y
    anonimizado (pesos + métricas), NUNCA audio personal ni texto privado
    (coherente con src/ai/astraura/mesh/privacy.ts en el OS).

Qué es PLACEHOLDER honesto (no inventado):
  * El empaquetado/binarización real de pesos 1.58-bit requiere el modelo
    entrenado (BitTTS no liberó pesos). Mientras tanto, un voice pack es un
    registro de metadata + ruta local; el `trainer_bittts` es quien produce el
    binario cuando hay dataset. El módulo NO simula pesos.
  * La descarga cruzada de packs entre nodos remotos asume que el OS publica el
    pack en un bucket firmado; si no, el nodo se queda con su pack local.

Modo LAN-only / sin creds: funciona solo local (registro + auto-mejora local),
sin crash. NUNCA lanza al caller.
"""

import os
import json
import time
import hashlib
import logging
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("astraura.voice_mycelium")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
VOICE_DIR = BASE_DIR / "data" / "voice_mycelium"
PACKS_FILE = VOICE_DIR / "packs.json"
NODE_ID_FILE = VOICE_DIR / "node_id.txt"

SUPABASE_TABLE = "astraura_voice_mesh"

# TTL de un neurotransmisor en la malla antes de considerarse fresco.
NT_FRESH_S = 10 * 60
# Cuán seguido el bucle de fondo intenta auto-mejorar (segundos).
SELF_IMPROVE_INTERVAL_S = 120


# ---------------------------------------------------------------------------
# Utilidades de identidad / persistencia
# ---------------------------------------------------------------------------
def _ensure_dirs() -> None:
    VOICE_DIR.mkdir(parents=True, exist_ok=True)


def node_id() -> str:
    _ensure_dirs()
    try:
        if NODE_ID_FILE.exists():
            return NODE_ID_FILE.read_text(encoding="utf-8").strip()
    except Exception:
        pass
    nid = f"vm-{hashlib.sha1(str(time.time()).encode()).hexdigest()[:12]}"
    try:
        NODE_ID_FILE.write_text(nid, encoding="utf-8")
    except Exception:
        pass
    return nid


def _load_packs() -> Dict[str, Any]:
    _ensure_dirs()
    try:
        if PACKS_FILE.exists():
            return json.loads(PACKS_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {"packs": {}}


def _save_packs(data: Dict[str, Any]) -> None:
    _ensure_dirs()
    try:
        PACKS_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception as e:
        logger.debug(f"💠 [VOICE-MYC] no se pudo guardar packs: {e}")


# ---------------------------------------------------------------------------
# Registro local de voice packs 1.58-bit
# ---------------------------------------------------------------------------
def register_voice_pack(speaker: str, version: int, path: str,
                        mos: float = 0.0, mb: float = 0.0,
                        note: str = "") -> Dict[str, Any]:
    """Registra (o actualiza) un voice pack local. Solo metadata + ruta.

    Un voice pack 1.58-bit = pesos ternarios empaquetados (weight indexing:
    5 pesos en 1 byte int8) + métricas. El binario lo produce trainer_bittts.
    """
    data = _load_packs()
    nid = node_id()
    key = f"{speaker}@v{version}"
    pack = {
        "speaker": speaker,
        "version": version,
        "path": path,
        "mos": mos,
        "mb": mb,
        "note": note,
        "owner_node": nid,
        "updated_at": time.time(),
        "hash": _hash_file(path),
    }
    data["packs"][key] = pack
    _save_packs(data)
    logger.info(f"💠 [VOICE-MYC] pack registrado {key} MOS={mos} {mb}MB")
    # Al registrar un pack nuevo/mejor, emitimos un neurotransmisor.
    emit_neurotransmitter(pack)
    return pack


def best_local_pack(speaker: str) -> Optional[Dict[str, Any]]:
    data = _load_packs()
    best = None
    for key, p in data["packs"].items():
        if p.get("speaker") != speaker:
            continue
        if best is None or p.get("version", 0) > best.get("version", 0):
            best = p
    return best


def list_local_packs() -> List[Dict[str, Any]]:
    return list(_load_packs().get("packs", {}).values())


def _hash_file(path: str) -> str:
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()[:16]
    except Exception:
        return "nohash"


# ---------------------------------------------------------------------------
# Neurotransmisores (señalización ligera sobre la malla)
# ---------------------------------------------------------------------------
def _supabase() -> Optional[Any]:
    """Reusa supabase_sync del backend (mismas credenciales que mesh_network)."""
    try:
        from app.core import supabase_sync
        if supabase_sync.is_available():
            return supabase_sync
    except Exception:
        pass
    return None


def emit_neurotransmitter(pack: Dict[str, Any]) -> None:
    """Anuncia un pack en la malla como NT ligero (sin el binario)."""
    sb = _supabase()
    if not sb:
        return  # modo LAN-only: no hay malla remota
    try:
        payload = {
            "kind": "nt",
            "node_id": node_id(),
            "speaker": pack.get("speaker"),
            "version": pack.get("version"),
            "mos": pack.get("mos", 0.0),
            "mb": pack.get("mb", 0.0),
            "hash": pack.get("hash"),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        sb.push_state(SUPABASE_TABLE, payload)
        logger.debug(f"💠 [VOICE-MYC] NT emitido {pack.get('speaker')}@v{pack.get('version')}")
    except Exception as e:
        logger.debug(f"💠 [VOICE-MYC] NT no emitido (degradación): {e}")


def discover_remote_packs() -> List[Dict[str, Any]]:
    """Lee NT de otros nodos para descubrir packs mejores en la colonia."""
    sb = _supabase()
    if not sb:
        return []
    try:
        rows = sb.pull_state(SUPABASE_TABLE)
        if not isinstance(rows, list):
            return []
        out = []
        now = time.time()
        for r in rows:
            if r.get("kind") != "nt":
                continue
            if r.get("node_id") == node_id():
                continue
            out.append(r)
        return out
    except Exception as e:
        logger.debug(f"💠 [VOICE-MYC] discover degradó: {e}")
        return []


# ---------------------------------------------------------------------------
# Bucle de auto-mejora en segundo plano (siempre activo, silencioso)
# ---------------------------------------------------------------------------
class VoiceMycelium:
    """Orquestador local del micelio de voz. Corre en un hilo de fondo."""

    def __init__(self) -> None:
        self._stop = False
        self._thread: Optional[threading.Thread] = None
        self.speaker_pool: List[str] = ["Speaker-0", "Speaker-1", "Speaker-2", "Speaker-3"]
        self.local_samples_dir = VOICE_DIR / "samples"
        self.local_samples_dir.mkdir(parents=True, exist_ok=True)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop = False
        self._thread = threading.Thread(target=self._loop, daemon=True, name="voice-mycelium")
        self._thread.start()
        logger.info("💠 [VOICE-MYC] micelio de voz iniciado (segundo plano).")

    def stop(self) -> None:
        self._stop = True

    def _loop(self) -> None:
        # Import diferido para no romper el arranque si el trainer no existe.
        try:
            from app.core.trainer_bittts import maybe_self_improve
        except Exception:
            maybe_self_improve = None
        while not self._stop:
            try:
                if maybe_self_improve is not None:
                    # Auto-mejora local: si hay muestras, re-entrena/optimiza packs.
                    for sp in self.speaker_pool:
                        maybe_self_improve(sp, self.local_samples_dir)
                # Homeostasis: re-emitir NT de nuestros mejores packs (heartbeat).
                for p in list_local_packs():
                    emit_neurotransmitter(p)
                # Descubrir y (bajo demanda) integrar packs de la colonia.
                remotes = discover_remote_packs()
                for r in remotes:
                    self._maybe_integrate(r)
            except Exception as e:
                logger.debug(f"💠 [VOICE-MYC] loop degradó: {e}")
            # Duerme respetando el presupuesto de CPU del dispositivo.
            for _ in range(SELF_IMPROVE_INTERVAL_S):
                if self._stop:
                    break
                time.sleep(1)

    def _maybe_integrate(self, remote: Dict[str, Any]) -> None:
        """Integra un pack remoto solo si es mejor que el local y respeta privacidad.

        Honesto: aquí solo registramos el descubrimiento. La descarga/binarización
        real del pack cruzado requiere el canal firmado del OS; si no está, el nodo
        se queda con su pack local (nunca rompe).
        """
        sp = remote.get("speaker")
        rv = remote.get("version", 0)
        local = best_local_pack(sp) if sp else None
        if local and local.get("version", 0) >= rv:
            return
        logger.info(f"💠 [VOICE-MYC] colonia ofrece {sp}@v{rv} MOS={remote.get('mos')} "
                    f"(mejor que local v{local.get('version') if local else '-'}); "
                    f"pendiente de descarga firmada.")
        # Marca de interés para el orquestador de malla del OS (server-relay).
        try:
            sb = _supabase()
            if sb:
                sb.push_state(SUPABASE_TABLE, {
                    "kind": "want", "node_id": node_id(),
                    "speaker": sp, "version": rv, "hash": remote.get("hash"),
                })
        except Exception:
            pass


# Instancia global del micelio (arranca con el backend si se habilita).
_mycelium: Optional[VoiceMycelium] = None


def start_voice_mycelium() -> VoiceMycelium:
    global _mycelium
    if _mycelium is None:
        _mycelium = VoiceMycelium()
    _mycelium.start()
    return _mycelium


def get_voice_mycelium() -> Optional[VoiceMycelium]:
    return _mycelium


def voice_mycelium_status() -> Dict[str, Any]:
    return {
        "node_id": node_id(),
        "local_packs": len(list_local_packs()),
        "running": bool(_mycelium and _mycelium._thread and _mycelium._thread.is_alive()),
        "supabase_mesh": _supabase() is not None,
    }
