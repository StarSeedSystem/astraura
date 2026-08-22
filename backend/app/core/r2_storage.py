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

logger = logging.getLogger("astraura.r2")

CRED_FILE = os.path.expanduser("~/.astraura/r2_credentials.json")
BREW_CURL = "/opt/homebrew/opt/curl/bin/curl"
FALLBACK_CURL = "/usr/bin/curl"
EMPTY_SHA = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


def _load_creds():
    if not os.path.exists(CRED_FILE):
        return None
    try:
        with open(CRED_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"No se pudieron leer credenciales R2: {e}")
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


def _request(method, key, body=None, content_type="application/json"):
    creds = _load_creds()
    if not creds:
        return None, "no-credentials"
    account = creds["account_id"]
    ak = creds["access_key_id"]
    sk = creds["secret_access_key"]
    bucket = creds.get("bucket", "astraura-shared")
    host = f"{bucket}.{account}.r2.cloudflarestorage.com"
    auth_tuple = (ak, sk, account, "auto", "s3")
    t = time.gmtime()
    amz = time.strftime("%Y%m%dT%H%M%SZ", t)
    ds = time.strftime("%Y%m%d", t)
    canonical_uri = f"/{key}"
    payload_sha = EMPTY_SHA
    headers = [
        "-H", f"x-amz-date: {amz}",
        "-H", f"x-amz-content-sha256: {payload_sha}",
    ]
    if body is not None:
        payload_sha = hashlib.sha256(body).hexdigest()
        headers = ["-H", f"x-amz-date: {amz}", "-H", f"x-amz-content-sha256: {payload_sha}"]
    auth = _sign(auth_tuple, amz, ds, method, host, canonical_uri, "", payload_sha)
    headers += ["-H", f"Authorization: {auth}"]
    if content_type:
        headers += ["-H", f"Content-Type: {content_type}"]
    url = f"https://{host}{canonical_uri}"
    cmd = [_curl_bin(), "-sS", "-m", "30", "--tlsv1.2", "-X", method, url] + headers
    if body is not None:
        cmd += ["--data-binary", "@-"]
        proc = subprocess.run(cmd, input=body, capture_output=True, text=False)
    else:
        proc = subprocess.run(cmd, capture_output=True, text=False)
    return proc.stdout, proc.returncode


def download_text(key):
    out, code = _request("GET", key)
    if code == 0 and out is not None:
        return out.decode("utf-8", errors="replace")
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
    _, code = _request("PUT", key, body=body, content_type=content_type)
    return code == 0


def upload_json(key, data):
    return upload_text(key, json.dumps(data, ensure_ascii=False, indent=2))


def object_exists(key):
    out, code = _request("HEAD", key)
    return code == 0
