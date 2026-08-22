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


def pull_all(verbose: bool = False) -> dict:
    """Descarga secciones de Supabase/R2 que NO existan localmente (seed)."""
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


def push_all(verbose: bool = False) -> dict:
    """Espeja el estado local a Supabase (+R2) en tiempo real."""
    results = {}
    # Supabase (capa en línea)
    if supabase_sync.is_available():
        sb_sections = {}
        for r2_key, local_rel in SECTIONS.items():
            data = _read_local(local_rel)
            if data is not None:
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
        for r2_key, local_rel in SECTIONS.items():
            data = _read_local(local_rel)
            if data is None:
                continue
            try:
                ok = r2_storage.upload_json(r2_key, data)
                r2_results[r2_key] = "pushed" if ok else "push-failed"
            except Exception as e:
                r2_results[r2_key] = f"error:{e}"
        results["r2"] = r2_results
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
