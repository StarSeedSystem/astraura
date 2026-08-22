"""
sync_engine.py — Sincronización global multi-dispositivo con Cloudflare R2.

Propaga automáticamente a R2 (almacenamiento compartido soberano) TODO el
estado del sistema: cerebros, memorias (StarSeed/Mem0/Director/Vault/Grafo)
y configuración (notificaciones, enjambre, vector store, enrutamiento).

Estrategia:
  - pull_all(): al iniciar en un dispositivo NUEVO, descarga las secciones que
    NO existan localmente (seed). No sobrescribe lo existente (evita perder
    ediciones locales).
  - push_all(): espeja el estado local a R2 cada 2 min (last-write-wins global).
  - start_background_sync(): hilo demonio que empuja cambios en tiempo real.

Cualquier dispositivo con ~/.astraura/r2_credentials.json ve el MISMO sistema.
"""
import os
import json
import threading
import logging

from app.core import r2_storage
from app.core.config import DATA_DIR

logger = logging.getLogger("astraura.sync")

# (r2_key, ruta local relativa a DATA_DIR)
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


def _local_path(rel):
    return DATA_DIR / rel


def pull_all(verbose: bool = False) -> dict:
    """Descarga secciones de R2 que NO existan localmente (seed en dispositivo nuevo)."""
    if not r2_storage.is_available():
        return {"success": False, "reason": "no-credentials"}
    results = {}
    for r2_key, local_rel in SECTIONS.items():
        local = _local_path(local_rel)
        try:
            remote = r2_storage.download_json(r2_key)
        except Exception:
            remote = None
        if remote is None:
            continue
        if not local.exists():
            try:
                local.parent.mkdir(parents=True, exist_ok=True)
                local.write_text(json.dumps(remote, ensure_ascii=False, indent=2), encoding="utf-8")
                results[r2_key] = "seeded"
                if verbose:
                    print(f"🧪 [R2] Seeded local from R2: {r2_key}")
            except Exception as e:
                results[r2_key] = f"seed-error:{e}"
    return {"success": True, "seeded": results}


def push_all(verbose: bool = False) -> dict:
    """Espeja el estado local a R2 (last-write-wins global en tiempo real)."""
    if not r2_storage.is_available():
        return {"success": False, "reason": "no-credentials"}
    # Asegurar que el bucket exista (idempotente)
    try:
        r2_storage.create_bucket()
    except Exception:
        pass
    results = {}
    for r2_key, local_rel in SECTIONS.items():
        local = _local_path(local_rel)
        if not local.exists():
            continue
        try:
            data = json.loads(local.read_text(encoding="utf-8"))
            ok = r2_storage.upload_json(r2_key, data)
            results[r2_key] = "pushed" if ok else "push-failed"
        except Exception as e:
            results[r2_key] = f"error:{e}"
    return {"success": True, "pushed": results}


def start_background_sync():
    """Hilo demonio: empuja el estado a R2 cada 2 min (sincronización
    multi-dispositivo en tiempo real)."""
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
