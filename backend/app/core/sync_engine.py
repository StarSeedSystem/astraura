"""
sync_engine.py — Sincronización global multi-dispositivo y multi-fuente.

Propaga automáticamente a:
  - Supabase (proyecto StarSeed OS, nxstilnyidvkqeosofuh): capa en línea
    ACCESIBLE desde cualquier medio (la "nube" soberana de Astraura).
  - Cloudflare R2 (opcional, si hay credenciales): espejo adicional.

TODO el estado se sincroniza: cerebros, memorias (StarSeed/Mem0/Director/
Vault/Grafo) y configuración (notificaciones, enjambre, vector store,
enrutamiento de almacenamiento).

Estrategia:
  - pull_all(): en dispositivo NUEVO, descarga las secciones que NO existan
    localmente (seed). No sobrescribe lo existente (evita perder ediciones).
  - push_all(): espeja el estado local a Supabase (+R2) en tiempo real.
  - start_background_sync(): hilo demonio que empuja cambios cada 2 min.

Esto es la base de la "opción de almacenamiento con StarSeed": cualquier
fuente (local, Google Drive, servidor StarSeed, servidores propios/externos)
que el backend pueda leer, converge en Supabase y queda visible desde todos
los medios (navegador, app nativa, terminal, Vercel) en tiempo real.
"""
import os
import json
import time  # (OS · Ola 3)
import threading
import logging

from app.core import r2_storage
from app.core import supabase_sync
from app.core.config import DATA_DIR

logger = logging.getLogger("astraura.sync")

# r2_key -> ruta local relativa a DATA_DIR
SECTIONS = {
    "cerebros/cerebros_registry.json": "cerebros/cerebros_registry.json",
    "memory/starseed_memory.json": "starseed_memory_root/memory_docs.json",
    "memory/mem0.json": "mem0/mem0_store.json",
    "memory/director_vault.json": "vault/director/director_memory_vault.json",
    "memory/knowledge_graph.json": "knowledge_graph/graph.json",
    "config/notifications.json": "notifications/notifications_registry.json",
    "config/swarm_state.json": "swarm/swarm_adaptive_state.json",
    "config/vector_store.json": "vector_store/vectors.json",
    "config/storage_routing.json": "storage_routing/storage_routing_rules.json",
    # (Adenda 153) Secciones que antes NO viajaban: personalidades propias y activa,
    # habilidades, recuerdos nucleares y manifiesto del memory root.
    "config/personalities.json": "personalities/custom_personalities.json",
    "config/active_personality.json": "personalities/active_personality.json",
    "config/skills.json": "starseed_skills.json",
    "memory/recuerdos_core.json": "starseed_memory_root/recuerdos_core.json",
    "memory/memory_manifest.json": "starseed_memory_root/memory.manifest.json",
}

# key plano usado en Supabase astraura_state (sin barras)
def _sb_key(r2_key: str) -> str:
    return r2_key.replace("/", "__")


def _local_path(rel):
    return DATA_DIR / rel


def _read_local(local_rel):
    local = _local_path(local_rel)
    if not local.exists():
        return None
    try:
        return json.loads(local.read_text(encoding="utf-8"))
    except Exception:
        return None


def _air_gapped() -> bool:
    """(OS · Ola 3) Air-Gap REAL: la sincronización en nube se omite por completo."""
    try:
        from app.core.privacy_manager import is_air_gapped
        return is_air_gapped()
    except Exception:
        return False


# (OS · Ola 3) Estado honesto del último empuje para /api/starseed/processes.
last_push_info: dict = {"at": 0.0, "sections": [], "skipped": {}, "unchanged": True, "error": None}


def get_sync_status() -> dict:
    """(OS · Ola 3) Resumen para el OS: destinos disponibles (sin red) y último push."""
    return {
        "supabase_available": bool(_safe_available(supabase_sync)),
        "r2_available": bool(_safe_available(r2_storage)),
        "air_gap": _air_gapped(),
        "last_push_at": last_push_info.get("at", 0.0),
        "last_push_sections": list(last_push_info.get("sections") or []),
        "last_push_skipped": dict(last_push_info.get("skipped") or {}),
        "last_push_unchanged": bool(last_push_info.get("unchanged", True)),
        "last_error": last_push_info.get("error"),
        "sections_total": len(SECTIONS),
    }


def _safe_available(mod) -> bool:
    try:
        return bool(mod.is_available())
    except Exception:
        return False


def pull_all(verbose: bool = False) -> dict:
    """Descarga secciones de Supabase/R2 que NO existan localmente (seed)."""
    if _air_gapped():  # (OS · Ola 3)
        return {"success": False, "skipped": "air-gap", "seeded": {}}
    results = {}
    # Prioridad: Supabase (capa en línea accesible)
    if supabase_sync.is_available():
        try:
            rows = supabase_sync.pull_all()
            for r2_key, local_rel in SECTIONS.items():
                sbk = _sb_key(r2_key)
                remote = rows.get(sbk)
                if remote is None:
                    continue
                local = _local_path(local_rel)
                if not local.exists():
                    local.parent.mkdir(parents=True, exist_ok=True)
                    local.write_text(json.dumps(remote, ensure_ascii=False, indent=2), encoding="utf-8")
                    results[r2_key] = "seeded-supabase"
        except Exception as e:
            results["supabase-error"] = str(e)
    # R2 como espejo adicional
    if r2_storage.is_available():
        try:
            for r2_key, local_rel in SECTIONS.items():
                local = _local_path(local_rel)
                remote = r2_storage.download_json(r2_key)
                if remote is None or local.exists():
                    continue
                local.parent.mkdir(parents=True, exist_ok=True)
                local.write_text(json.dumps(remote, ensure_ascii=False, indent=2), encoding="utf-8")
                results[r2_key] = "seeded-r2"
        except Exception as e:
            results["r2-error"] = str(e)
    return {"success": True, "seeded": results}


# (Adenda 153) Empuje INCREMENTAL: solo se sube una sección si cambió desde el
# último push (hash SHA-256 del JSON serializado) y si no supera el tope de
# tamaño (`ASTRAURA_SYNC_MAX_MB`, defecto 5 MB) — antes se subían 4 MB de
# vectores cada 2 min aunque nada hubiera cambiado, y una sección de 24 MB
# habría roto el upsert.
_last_hashes: dict = {}


def _section_payload(local_rel):
    """Devuelve (data, hash, size_bytes) o (None, None, 0)."""
    import hashlib
    data = _read_local(local_rel)
    if data is None:
        return None, None, 0
    try:
        raw = json.dumps(data, ensure_ascii=False, sort_keys=True).encode("utf-8")
    except Exception:
        return None, None, 0
    return data, hashlib.sha256(raw).hexdigest(), len(raw)


def _max_bytes() -> int:
    try:
        return int(float(os.environ.get("ASTRAURA_SYNC_MAX_MB", "5")) * 1024 * 1024)
    except Exception:
        return 5 * 1024 * 1024


def push_all(verbose: bool = False, force: bool = False) -> dict:
    """Espeja el estado local a Supabase (+R2). Incremental: solo lo que cambió."""
    if _air_gapped():  # (OS · Ola 3)
        last_push_info.update({"error": "air-gap"})
        return {"success": False, "skipped": "air-gap", "pushed": {}}
    results = {}
    skipped = {}
    changed_sections = {}
    for r2_key, local_rel in SECTIONS.items():
        data, h, size = _section_payload(local_rel)
        if data is None:
            continue
        if size > _max_bytes():
            skipped[r2_key] = f"demasiado grande ({size // 1024} KB > {_max_bytes() // 1024} KB); compacta con scripts/compact_memory_docs.py"
            continue
        if not force and _last_hashes.get(r2_key) == h:
            continue
        changed_sections[r2_key] = (data, h)
    if skipped:
        results["skipped"] = skipped
    if not changed_sections:
        # (OS · Ola 3) Registrar el tick aunque no hubiera cambios.
        last_push_info.update({"at": time.time(), "skipped": skipped, "unchanged": True, "error": None})
        return {"success": True, "pushed": results, "unchanged": True}
    # Supabase (capa en línea)
    if supabase_sync.is_available():
        sb_sections = {}
        for r2_key, (data, _h) in changed_sections.items():
            sb_sections[_sb_key(r2_key)] = data
        try:
            results["supabase"] = supabase_sync.push_all(sb_sections)
        except Exception as e:
            results["supabase"] = f"error:{e}"
    # R2 espejo
    if r2_storage.is_available():
        try:
            r2_storage.create_bucket()
        except Exception:
            pass
        r2_results = {}
        for r2_key, (data, _h) in changed_sections.items():
            try:
                ok = r2_storage.upload_json(r2_key, data)
                r2_results[r2_key] = "pushed" if ok else "push-failed"
            except Exception as e:
                r2_results[r2_key] = f"error:{e}"
        results["r2"] = r2_results
    # Recordar qué se subió (solo si hubo al menos un destino disponible).
    if supabase_sync.is_available() or r2_storage.is_available():
        for r2_key, (_data, h) in changed_sections.items():
            _last_hashes[r2_key] = h
    # (OS · Ola 3) Estado honesto del último push para el OS.
    last_push_info.update({
        "at": time.time(),
        "sections": list(changed_sections.keys()),
        "skipped": skipped,
        "unchanged": False,
        "error": None,
    })
    return {"success": True, "pushed": results}


def start_background_sync():
    """Hilo demonio: empuja el estado a Supabase/R2 cada 2 min."""
    def _loop():
        import time as _t
        while True:
            try:
                push_all()
            except Exception:
                pass
            _t.sleep(120)
    t = threading.Thread(target=_loop, daemon=True)
    t.start()
