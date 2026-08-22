"""
supabase_sync.py — Capa de sincronización universal en línea vía Supabase
(proyecto StarSeed OS: nxstilnyidvkqeosofuh).

Supabase actúa como el "nervio central": todos los cerebros, memorias y
configuraciones de Astraura convergen aquí y se sincronizan en tiempo real
desde CUALQUIER medio y CUALQUIER fuente (local, Google Drive, servidor
StarSeed, servidores propios/externos).

Credenciales en ~/.astraura/supabase_astraura.json (FUERA del repo).
Usa curl de Homebrew (OpenSSL moderno) para evitar TLS issues del LibreSSL.

Tabla: astraura_state (key TEXT PK, data JSONB, updated_at TIMESTAMPTZ)
"""
import os
import json
import time
import subprocess
import logging

logger = logging.getLogger("astraura.supabase")

CRED_FILE = os.path.expanduser("~/.astraura/supabase_astraura.json")
BREW_CURL = "/opt/homebrew/opt/curl/bin/curl"
FALLBACK_CURL = "/usr/bin/curl"


def _load_creds():
    if not os.path.exists(CRED_FILE):
        return None
    try:
        with open(CRED_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"No se pudieron leer credenciales Supabase: {e}")
        return None


def is_available():
    return _load_creds() is not None


def _curl_bin():
    return BREW_CURL if os.path.exists(BREW_CURL) else FALLBACK_CURL


def _rest_url(creds, path):
    return f"{creds['supabase_url'].rstrip('/')}/rest/v1/{path}"


def _headers(creds, extra=None):
    h = [
        "-H", f"apikey: {creds['service_role_key']}",
        "-H", f"Authorization: Bearer {creds['service_role_key']}",
        "-H", "Content-Type: application/json",
        "-H", "Prefer: return=representation",
    ]
    if extra:
        h += extra
    return h


def push_state(key: str, data: dict) -> bool:
    """Upsert una sección de estado en Supabase (last-write-wins por fila)."""
    creds = _load_creds()
    if not creds:
        return False
    payload = json.dumps({"key": key, "data": data, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
    url = _rest_url(creds, "astraura_state?on_conflict=key")
    # Usar archivo temporal para el body: evita "Argument list too long" en
    # macOS (ARG_MAX) cuando el payload es grande (ej. vector_store).
    import tempfile
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8")
    tmp.write(payload)
    tmp.close()
    cmd = [_curl_bin(), "-sS", "-m", "30", "--tlsv1.2", "-X", "POST", url,
           "-w", "\n%{http_code}"] + _headers(creds, ["-H", "Prefer: upsert,return=representation"])
    cmd += ["--data-binary", f"@{tmp.name}"]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=40)
        out = proc.stdout or ""
        parts = out.rsplit("\n", 1)
        status = parts[1].strip() if len(parts) > 1 and parts[1].strip().isdigit() else "0"
        print(f"🧪 [SB] push '{key}' -> HTTP {status}")
        return status in ("200", "201", "204")
    except Exception as e:
        print(f"🧪 [SB] push '{key}' exception: {e}")
        return False
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


def pull_state(key: str):
    """Descarga una sección de estado desde Supabase."""
    creds = _load_creds()
    if not creds:
        return None
    url = _rest_url(creds, f"astraura_state?key=eq.{key}")
    cmd = [_curl_bin(), "-sS", "-m", "30", "--tlsv1.2", "-X", "GET", url,
           "-w", "\n%{http_code}"] + _headers(creds)
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=40)
        out = proc.stdout or ""
        parts = out.rsplit("\n", 1)
        status = parts[1].strip() if len(parts) > 1 and parts[1].strip().isdigit() else "0"
        body = parts[0] if len(parts) > 1 else ""
        if status == "200" and body:
            try:
                rows = json.loads(body)
                if rows:
                    return rows[0].get("data")
            except Exception:
                return None
        return None
    except Exception as e:
        print(f"🧪 [SB] pull '{key}' exception: {e}")
        return None


def pull_all():
    """Descarga todas las filas de astraura_state como dict {key: data}."""
    creds = _load_creds()
    if not creds:
        return {}
    url = _rest_url(creds, "astraura_state?select=key,data")
    cmd = [_curl_bin(), "-sS", "-m", "30", "--tlsv1.2", "-X", "GET", url,
           "-w", "\n%{http_code}"] + _headers(creds)
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=40)
        out = proc.stdout or ""
        parts = out.rsplit("\n", 1)
        status = parts[1].strip() if len(parts) > 1 and parts[1].strip().isdigit() else "0"
        body = parts[0] if len(parts) > 1 else ""
        if status == "200" and body:
            rows = json.loads(body)
            return {r["key"]: r["data"] for r in rows}
        return {}
    except Exception as e:
        print(f"🧪 [SB] pull_all exception: {e}")
        return {}


def push_all(sections: dict):
    """Sube varias secciones {key: data} a Supabase en paralelo lógico."""
    results = {}
    for key, data in sections.items():
        try:
            ok = push_state(key, data)
            results[key] = "pushed" if ok else "failed"
        except Exception as e:
            results[key] = f"error:{e}"
    return results
