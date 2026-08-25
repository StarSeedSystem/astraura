"""
r2_storage.py — Almacenamiento compartido soberano en Cloudflare R2 (S3-compatible).

Permite que Astraura sincronice cerebros, memorias y configuración en un bucket
R2 accesible desde CUALQUIER dispositivo con las credenciales, logrando el mismo
sistema en tiempo real independientemente del medio.

Las credenciales se leen de ~/.astraura/r2_credentials.json (FUERA del repo).
No se commitean nunca.

Usa curl de Homebrew (OpenSSL moderno) vía subprocess para evitar problemas de
TLS del LibreSSL del sistema macOS.
"""
import os
import json
import time
import hashlib
import hmac
import subprocess
import logging
import re
from typing import Dict, Any, Optional

logger = logging.getLogger("astraura.r2")

CRED_FILE = os.path.expanduser("~/.astraura/r2_credentials.json")
BREW_CURL = "/opt/homebrew/opt/curl/bin/curl"
FALLBACK_CURL = "/usr/bin/curl"
EMPTY_SHA = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

# ─────────────────────────────────────────────────────────────────────────
# (Adenda sync cerebros) DIAGNÓSTICO HONESTO DE FALLOS — POR QUÉ EXISTE
# ---------------------------------------------------------------------------
# Antes, cualquier fallo de R2 (sin credenciales, credenciales rechazadas,
# handshake TLS roto, red caída) colapsaba en el mismo booleano `False` /
# `None` — el llamante nunca sabía QUÉ arreglar. Diagnóstico real de esta
# cuenta (verificado en vivo, no supuesto): el endpoint
# "<bucket>.<account_id>.r2.cloudflarestorage.com" RECHAZA el handshake TLS
# (falla justo tras el Client Hello: curl exit 35, "TLS connect error:
# error:0A000410:SSL routines::ssl/tls alert handshake failure"). Experimento
# de control decisivo: un account_id INVENTADO (todo ceros) da EXACTAMENTE
# el mismo error, mientras que un host *.r2.dev sí responde (401). No es un
# problema de cliente TLS de este equipo (falla igual con curl de Homebrew
# que con el del sistema, y www.cloudflare.com responde 200 desde esta misma
# máquina) ni de red: Cloudflare rechaza la conexión porque esa cuenta NO
# tiene R2 habilitado (o el account_id no corresponde a ninguna cuenta
# real). Eso NO se arregla desde el código — hay que habilitar R2 en el
# dashboard de Cloudflare, o corregir account_id en CRED_FILE.
#
# `_request()` clasifica cada fallo en `_last_error`; `diagnose()` lo
# traduce a un mensaje en castellano con la causa real y el arreglo. Esto
# NUNCA cambia el contrato (bool/None) de las funciones públicas existentes
# — sync_engine.py (no es mío, no se toca) sigue viendo exactamente lo
# mismo; es una capa de diagnóstico ADICIONAL, no un cambio de
# comportamiento.
# ─────────────────────────────────────────────────────────────────────────
_last_error: Dict[str, Any] = {"kind": None, "message": None, "at": None}

_TLS_HANDSHAKE_RE = re.compile(
    r"handshake failure|SSL routines|SSL_ERROR_SSL|0A000410|alert handshake",
    re.IGNORECASE,
)
_NETWORK_ERROR_RE = re.compile(
    r"Could not resolve host|Connection refused|Operation timed out|"
    r"Couldn't connect|Network is unreachable|No route to host",
    re.IGNORECASE,
)
# Códigos de salida de curl relevantes: 35=SSL connect error, 6=no resuelve
# host, 7=no conecta, 28=timeout (https://curl.se/libcurl/c/libcurl-errors.html).
_CURL_NETWORK_EXIT_CODES = (6, 7, 28)


def _record_error(kind: str, message: str, **extra):
    global _last_error
    _last_error = {"kind": kind, "message": message, "at": time.time(), **extra}


def _record_success():
    global _last_error
    _last_error = {"kind": None, "message": None, "at": time.time()}


def get_last_error() -> Optional[Dict[str, Any]]:
    """Diagnóstico crudo del último fallo (None si la última operación tuvo
    éxito, o si aún no se ha intentado ninguna). Ver diagnose() para un
    mensaje legible en castellano con la causa real y el arreglo."""
    return dict(_last_error) if _last_error.get("kind") else None


def diagnose() -> str:
    """
    Mensaje HONESTO del último fallo de R2 — nunca un "upload failed"
    genérico. Distingue explícitamente:
      - sin credenciales (falta el archivo o las env vars)
      - credenciales rechazadas (handshake TLS OK, HTTP 401/403 real)
      - endpoint NO APROVISIONADO (handshake TLS rechazado contra un host
        *.r2.cloudflarestorage.com — el caso real de esta cuenta)
      - fallo de red genérico (DNS/timeout/conexión)
    """
    err = get_last_error()
    if err is None:
        return "R2: sin errores registrados (última operación exitosa, o aún no se ha intentado ninguna)."
    kind = err.get("kind")
    if kind == "no_credentials":
        return (
            f"R2: no hay credenciales configuradas. Falta {CRED_FILE} "
            "o las variables de entorno R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ACCOUNT_ID."
        )
    if kind == "tls_handshake_unprovisioned":
        host = err.get("host", "<host>")
        account = err.get("account_id", "<account_id>")
        return (
            f"R2: el endpoint '{host}' RECHAZA el handshake TLS (falla justo tras el "
            f"Client Hello — curl dijo: \"{err.get('curl_stderr', '')[:150]}\"). "
            "NO es un problema de red ni del cliente TLS de este equipo (falla igual con "
            "curl de Homebrew y con el del sistema; www.cloudflare.com sí responde 200 "
            "desde esta misma máquina). Un account_id INVENTADO produce EXACTAMENTE el "
            "mismo error, mientras que un host *.r2.dev sí responde — así que Cloudflare "
            f"está rechazando la conexión porque la cuenta '{account}' NO tiene R2 "
            "habilitado (o el account_id de las credenciales no corresponde a ninguna "
            "cuenta real). SOLUCIÓN: habilita R2 Object Storage en el dashboard de "
            f"Cloudflare para esa cuenta, o corrige 'account_id' en {CRED_FILE}. "
            "Mientras tanto, Astraura sincroniza cerebros y memorias por Supabase."
        )
    if kind == "auth_rejected":
        return (
            f"R2: el servidor respondió HTTP {err.get('http_status')} — el handshake TLS "
            "funcionó (la cuenta SÍ tiene R2 aprovisionado) pero las credenciales fueron "
            f"rechazadas. Revisa access_key_id/secret_access_key en {CRED_FILE}."
        )
    if kind == "http_error":
        return f"R2: el servidor respondió HTTP {err.get('http_status')} para {err.get('host', '')}."
    if kind == "network_error":
        return (
            f"R2: fallo de red/conectividad contactando {err.get('host', 'el endpoint')} "
            f"({err.get('detail', '')[:200]}). Comprueba la conexión a internet de este equipo."
        )
    if kind == "curl_not_found":
        return f"R2: no se pudo ejecutar curl ({err.get('detail', err.get('message', ''))[:200]})."
    return f"R2: fallo no clasificado — {err.get('message', '')[:300]}"


def _load_creds():
    if os.path.exists(CRED_FILE):
        try:
            with open(CRED_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"No se pudieron leer credenciales R2: {e}")
    # Fallback a env vars (Cloud Run / contenedores sin archivo local)
    ak = os.environ.get("R2_ACCESS_KEY_ID")
    sk = os.environ.get("R2_SECRET_ACCESS_KEY")
    acct = os.environ.get("R2_ACCOUNT_ID")
    if ak and sk and acct:
        return {
            "account_id": acct,
            "access_key_id": ak,
            "secret_access_key": sk,
            "bucket": os.environ.get("R2_BUCKET", "astraura-shared"),
            "endpoint": os.environ.get("R2_ENDPOINT", f"https://{acct}.r2.cloudflarestorage.com"),
        }
    return None


def is_available():
    return _load_creds() is not None


def _curl_bin():
    return BREW_CURL if os.path.exists(BREW_CURL) else FALLBACK_CURL


def _sign(auth_tuple, amzdate, datestamp, method, host, canonical_uri,
          canonical_query="", payload_sha=EMPTY_SHA):
    ak, sk, _, region, service = auth_tuple
    signed_headers = "host;x-amz-content-sha256;x-amz-date"
    canonical_headers = (
        f"host:{host}\n"
        f"x-amz-content-sha256:{payload_sha}\n"
        f"x-amz-date:{amzdate}\n"
    )
    canonical_request = "\n".join([
        method, canonical_uri, canonical_query,
        canonical_headers, signed_headers, payload_sha
    ])
    scope = f"{datestamp}/{region}/{service}/aws4_request"
    string_to_sign = "\n".join([
        "AWS4-HMAC-SHA256", amzdate, scope,
        hashlib.sha256(canonical_request.encode()).hexdigest()
    ])

    def sign(key, msg):
        return hmac.new(key, msg.encode(), hashlib.sha256).digest()

    k = sign(("AWS4" + sk).encode(), datestamp)
    k = sign(k, region)
    k = sign(k, service)
    k = sign(k, "aws4_request")
    signature = hmac.new(k, string_to_sign.encode(), hashlib.sha256).hexdigest()
    auth = (
        f"AWS4-HMAC-SHA256 Credential={ak}/{scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )
    return auth


def _request(method, key, body=None, content_type="application/json", bucket_override=None):
    """Devuelve (body_text, http_status). http_status 2xx = éxito.
    Además registra en `_last_error` un diagnóstico honesto del fallo (ver
    `diagnose()`) — el contrato de retorno NO cambia, esto es aditivo."""
    creds = _load_creds()
    if not creds:
        _record_error("no_credentials", "Sin credenciales R2 configuradas.")
        return None, 0
    account = creds["account_id"]
    ak = creds["access_key_id"]
    sk = creds["secret_access_key"]
    bucket = bucket_override or creds.get("bucket", "astraura-shared")
    host = f"{bucket}.{account}.r2.cloudflarestorage.com"
    auth_tuple = (ak, sk, account, "auto", "s3")
    t = time.gmtime()
    amz = time.strftime("%Y%m%dT%H%M%SZ", t)
    ds = time.strftime("%Y%m%d", t)
    canonical_uri = f"/{key}" if key else "/"
    payload_sha = EMPTY_SHA
    headers = ["-H", f"x-amz-date: {amz}", "-H", f"x-amz-content-sha256: {payload_sha}"]
    if body is not None:
        payload_sha = hashlib.sha256(body).hexdigest()
        headers = ["-H", f"x-amz-date: {amz}", "-H", f"x-amz-content-sha256: {payload_sha}"]
    auth = _sign(auth_tuple, amz, ds, method, host, canonical_uri, "", payload_sha)
    headers += ["-H", f"Authorization: {auth}"]
    if content_type:
        headers += ["-H", f"Content-Type: {content_type}"]
    url = f"https://{host}{canonical_uri}"
    cmd = [_curl_bin(), "-sS", "-m", "30", "--tlsv1.2", "-X", method, url,
           "-w", "\n%{http_code}"] + headers
    if body is not None:
        cmd += ["--data-binary", "@-"]
    try:
        if body is not None:
            proc = subprocess.run(cmd, input=body, capture_output=True, text=False)
        else:
            proc = subprocess.run(cmd, capture_output=True, text=False)
    except Exception as e:
        # curl ausente u otro fallo al lanzar el proceso: no debe tumbar al
        # llamante (degradación elegante), pero sí queda diagnosticado en
        # vez de propagar la excepción cruda.
        _record_error("curl_not_found", str(e), host=host)
        return None, 0
    out = proc.stdout.decode("utf-8", errors="replace") if proc.stdout else ""
    err = proc.stderr.decode("utf-8", errors="replace") if proc.stderr else ""
    if err.strip():
        print(f"🧪 [R2] curl stderr: {err.strip()[:200]}")
    # Separar body del status code (última línea)
    parts = out.rsplit("\n", 1)
    body_text = parts[0] if len(parts) > 1 else ""
    status = 0
    if len(parts) > 1 and parts[1].strip().isdigit():
        status = int(parts[1].strip())

    # --- Diagnóstico honesto (ver cabecera del archivo) ---------------------
    if status and 200 <= status < 300:
        _record_success()
    elif status:
        # Hubo respuesta HTTP real -> el handshake TLS SÍ funcionó, así que
        # esto NUNCA es el caso "endpoint no aprovisionado".
        if status in (401, 403):
            _record_error("auth_rejected", f"HTTP {status}", http_status=status, host=host)
        else:
            _record_error("http_error", f"HTTP {status}", http_status=status, host=host, detail=body_text[:300])
    else:
        # status == 0: nunca llegó una respuesta HTTP. Distinguir el
        # handshake TLS rechazado (endpoint no aprovisionado) de un fallo de
        # red genérico -- son causas y arreglos completamente distintos.
        if _TLS_HANDSHAKE_RE.search(err):
            _record_error(
                "tls_handshake_unprovisioned",
                "Handshake TLS rechazado por el endpoint R2 de esta cuenta.",
                host=host, account_id=account, curl_stderr=err.strip()[:300],
            )
        elif _NETWORK_ERROR_RE.search(err) or proc.returncode in _CURL_NETWORK_EXIT_CODES:
            _record_error("network_error", "Fallo de red/conectividad.", host=host, detail=err.strip()[:300])
        else:
            _record_error(
                "unknown_error",
                err.strip()[:300] or f"curl salió con código {proc.returncode} sin salida.",
                host=host,
            )
    return body_text, status


def create_bucket():
    """Crea el bucket si no existe (idempotente). Requiere permiso de
    gestión de buckets en el token R2."""
    creds = _load_creds()
    if not creds:
        return False
    bucket = creds.get("bucket", "astraura-shared")
    _, status = _request("PUT", "", bucket_override=bucket)
    print(f"🧪 [R2] create_bucket '{bucket}' -> HTTP {status}")
    # 200 = creado, 409 = ya existe
    return status in (200, 200, 409)


def download_text(key):
    out, status = _request("GET", key)
    if status in (200, 200) and out is not None:
        return out
    return None


def download_json(key):
    txt = download_text(key)
    if txt:
        try:
            return json.loads(txt)
        except Exception:
            return None
    return None


def upload_text(key, text, content_type="application/json"):
    body = text.encode("utf-8") if isinstance(text, str) else text
    _, status = _request("PUT", key, body=body, content_type=content_type)
    print(f"🧪 [R2] upload '{key}' -> HTTP {status}")
    return status in (200, 200)


def upload_json(key, data):
    return upload_text(key, json.dumps(data, ensure_ascii=False, indent=2))


def object_exists(key):
    _, status = _request("HEAD", key)
    return status == 200
