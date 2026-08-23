"""
security.py — Control de acceso del backend Astraura 1.58-bit (Adenda 153 · StarSeed OS).

Antes: NINGUNA ruta tenía autenticación (salvo /api/v1/*/invoke) con CORS `*`,
y el backend se publicaba por túnel/Cloud Run → ejecución de comandos, lectura y
escritura de archivos, claves de API y cambios del OS al alcance de cualquiera.

Ahora, tres modos (variable de entorno `ASTRAURA_AUTH_MODE`):

  · "local-only" (POR DEFECTO) — las rutas PELIGROSAS (ejecución de código y
    comandos, sistema de archivos, proyectos en disco, OS, túnel, claves de API,
    bóveda, almacenamiento, navegador server-side, sync) solo se aceptan desde
    LOOPBACK (127.0.0.1/::1 sin cabeceras de proxy) o con una clave válida. El
    chat, las lecturas y los catálogos siguen abiertos (compatibles con la UI
    pública y con StarSeed OS).
  · "key" — TODA ruta /api/* exige clave (salvo /api/status, /api/starseed/health,
    /active_tunnel.json, /api/bitnet/status y los estáticos de la UI).
  · "open" — comportamiento previo, sin auth. Solo para desarrollo aislado.

Claves aceptadas (cabecera `X-Astraura-Key`, `Authorization: Bearer …` o `?api_key=`):
  · la CLAVE MAESTRA: `ASTRAURA_API_KEY` (env) o `~/.astraura/master_key.txt`
    (se genera al arrancar si no existe; en los logs se imprime la RUTA, nunca la clave);
  · cualquier clave de personalidad/agente ACTIVA (`ast_…`) de los vault engines,
    respetando su scope: `exec_terminal` para ejecutar, `fs_write` para escribir,
    `fs_read` para leer, `sync_external` para túnel/sync, `modify_*` para claves.

Cloud Run / cloudflared: la conexión llega desde 127.0.0.1 (túnel) o desde un
front-end de Google, pero SIEMPRE con `CF-Connecting-IP` / `X-Forwarded-For` →
se trata como remota (no loopback). Las comparaciones de clave son en tiempo
constante (`hmac.compare_digest`).
"""
from __future__ import annotations

import hmac
import os
import re
import secrets
from pathlib import Path
from typing import Callable, Dict, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

AUTH_MODES = ("local-only", "key", "open")

# Rutas SIEMPRE públicas (latido, descubrimiento, UI estática).
PUBLIC_PATHS = re.compile(
    r"^(/api/status|/api/bitnet/status|/api/starseed/health|/active_tunnel\.json|/api/system/tunnel/status)$"
)

# Rutas PELIGROSAS → scope requerido. Orden: la primera que casa decide.
DANGEROUS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^/api/system/exec"), "exec_terminal"),
    (re.compile(r"^/api/execute/"), "exec_terminal"),
    (re.compile(r"^/api/creations/execute_sample"), "exec_terminal"),
    (re.compile(r"^/api/projects/file/"), "fs_write"),
    (re.compile(r"^/api/projects/(apply_proposal|link_folder|export|vault/save)"), "fs_write"),
    (re.compile(r"^/api/creations/(fork_version|recycle)"), "fs_write"),
    (re.compile(r"^/api/system/os/"), "fs_write"),
    (re.compile(r"^/api/system/(open_native|index-path|index_path)"), "fs_write"),
    (re.compile(r"^/api/system/(fs|file|search|item_details)"), "fs_read"),
    (re.compile(r"^/api/system/storage/"), "fs_read"),
    (re.compile(r"^/api/system/universal_device_access"), "fs_write"),
    (re.compile(r"^/api/system/tunnel/(start|stop|restart|qr_data)"), "sync_external"),
    (re.compile(r"^/api/system/sync/"), "sync_external"),
    (re.compile(r"^/api/sync/"), "sync_external"),
    (re.compile(r"^/api/routing_storage/sync"), "sync_external"),
    (re.compile(r"^/api/storage/"), "fs_write"),
    (re.compile(r"^/api/cerebros/(scan_folder|link_gdrive|portable/|external/|sync_sources)"), "fs_read"),
    (re.compile(r"^/api/cerebros/context_metrics"), "fs_read"),
    (re.compile(r"^/api/vault"), "modify_personality_profile"),
    (re.compile(r"^/api/personalities/api_keys"), "modify_personality_profile"),
    (re.compile(r"^/api/personalities/[^/]+/(api_status|generate_key|revoke_key|restore_key|update_permissions|sync_server|trigger_sync)"), "modify_personality_profile"),
    (re.compile(r"^/api/agents_api/"), "modify_agent_config"),
    (re.compile(r"^/api/browser/(navigate|action)"), "fs_read"),
    (re.compile(r"^/api/workflows/(run|save|toggle)"), "exec_terminal"),
    (re.compile(r"^/api/workflows/[^/]+$"), "exec_terminal"),  # DELETE
    (re.compile(r"^/api/discovery/scan"), "fs_read"),
    (re.compile(r"^/api/installer/script"), "fs_read"),
]

PROXY_HEADERS = ("cf-connecting-ip", "x-forwarded-for", "x-real-ip", "forwarded")


def auth_mode() -> str:
    m = (os.environ.get("ASTRAURA_AUTH_MODE") or "local-only").strip().lower()
    return m if m in AUTH_MODES else "local-only"


def keys_dir() -> Path:
    d = os.environ.get("ASTRAURA_KEYS_DIR")
    p = Path(d).expanduser() if d else Path.home() / ".astraura" / "keys"
    try:
        p.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    return p


_master_cache: Optional[str] = None


def master_key() -> str:
    """Clave maestra: env o archivo; se crea si falta (modos con auth)."""
    global _master_cache
    if _master_cache:
        return _master_cache
    env = (os.environ.get("ASTRAURA_API_KEY") or "").strip()
    if env:
        _master_cache = env
        return env
    f = Path.home() / ".astraura" / "master_key.txt"
    try:
        if f.exists():
            v = f.read_text(encoding="utf-8").strip()
            if v:
                _master_cache = v
                return v
        f.parent.mkdir(parents=True, exist_ok=True)
        v = "ast_master_" + secrets.token_hex(24)
        f.write_text(v + "\n", encoding="utf-8")
        try:
            os.chmod(f, 0o600)
        except Exception:
            pass
        print(f"🔐 [Seguridad] Clave maestra generada en {f} (no se imprime). Úsala como X-Astraura-Key.")
        _master_cache = v
        return v
    except Exception:
        # Sin disco escribible (contenedor efímero): clave volátil por proceso.
        v = "ast_master_" + secrets.token_hex(24)
        _master_cache = v
        return v


def extract_key(request: Request) -> str:
    k = request.headers.get("x-astraura-key") or request.query_params.get("api_key") or ""
    if not k:
        auth = request.headers.get("authorization") or ""
        if auth.lower().startswith("bearer "):
            k = auth[7:].strip()
    return k.strip()


def is_loopback(request: Request) -> bool:
    host = (request.client.host if request.client else "") or ""
    if host not in ("127.0.0.1", "::1", "localhost"):
        return False
    # Túnel/Cloud Run: llega por loopback pero con cabeceras de proxy → remoto.
    return not any(h in request.headers for h in PROXY_HEADERS)


def dangerous_scope(path: str) -> Optional[str]:
    for rx, scope in DANGEROUS:
        if rx.search(path):
            return scope
    return None


def key_is_master(raw: str) -> bool:
    if not raw:
        return False
    try:
        return hmac.compare_digest(raw.encode("utf-8"), master_key().encode("utf-8"))
    except Exception:
        return False


def key_has_scope(raw: str, scope: Optional[str]) -> bool:
    """Maestra ⇒ todo. Clave ast_ de personalidad/agente ⇒ según su scope."""
    if key_is_master(raw):
        return True
    if not raw:
        return False
    try:
        from .personality_api_engine import personality_api_engine
        a = personality_api_engine.verify_api_key_access(raw, required_scope=scope)
        if a.get("authenticated"):
            return True
    except Exception:
        pass
    try:
        from .agent_vault_engine import agent_vault_engine
        a = agent_vault_engine.verify_agent_api_key_access(raw, required_scope=scope)
        if a.get("authenticated"):
            return True
    except Exception:
        pass
    return False


def mask_key(raw: Optional[str]) -> str:
    s = str(raw or "")
    if len(s) <= 12:
        return "••••"
    return f"{s[:8]}…{s[-4:]}"


class AstrauraAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        mode = auth_mode()
        path = request.url.path
        if mode == "open" or request.method == "OPTIONS":
            return await call_next(request)
        if PUBLIC_PATHS.match(path) or not path.startswith("/api/"):
            return await call_next(request)

        scope = dangerous_scope(path)
        raw = extract_key(request)

        if mode == "key":
            if key_has_scope(raw, scope):
                return await call_next(request)
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": "Este backend exige clave (X-Astraura-Key). Modo ASTRAURA_AUTH_MODE=key.",
                    "auth_mode": mode,
                },
            )

        # local-only: solo las peligrosas requieren loopback o clave con scope.
        if scope is None:
            return await call_next(request)
        if is_loopback(request) or key_has_scope(raw, scope):
            return await call_next(request)
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "error": "Ruta protegida: solo desde esta máquina (loopback) o con X-Astraura-Key con permiso "
                         f"'{scope}'. Modo ASTRAURA_AUTH_MODE=local-only.",
                "auth_mode": mode,
                "required_scope": scope,
            },
        )


def security_status() -> Dict[str, object]:
    """Resumen honesto para /api/status y el panel del OS."""
    return {
        "auth_mode": auth_mode(),
        "keys_dir": str(keys_dir()),
        "master_key_source": "env" if os.environ.get("ASTRAURA_API_KEY") else "file",
        "dangerous_routes": len(DANGEROUS),
    }
