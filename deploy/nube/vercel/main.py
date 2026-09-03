"""Astraura · NUBE StarSeed (Vercel · siempre online, gratis).

Punto de encuentro público del ecosistema: no hace inferencia pesada (eso vive
en cada neurona), sino que dice QUIÉN está vivo y DÓNDE, para que el OS
publicado no dependa de que un ordenador concreto esté encendido.

  GET /api/status   → estado de la nube (siempre responde)
  GET /api/neurona  → neurona pública anunciada (túnel) y su salud
  GET /api/fuentes  → fuentes de IA gratuitas recomendadas cuando no hay neurona

Sin secretos: solo usa la clave pública (anon) de Supabase y datos ya públicos.
"""
import json
import os
import time
import urllib.request

from fastapi import FastAPI

VERSION = "1.0.0"
ARRANQUE = time.time()
SUPABASE = os.environ.get("SUPABASE_URL", "https://pqzdpmedcsgcedkvndzl.supabase.co")
# Backend completo (Cloud Run, escala a cero): inferencia, cerebros, enjambre.
BACKEND = os.environ.get("ASTRAURA_BACKEND_URL", "https://astraura-nube-334237619848.us-central1.run.app")
ANON = os.environ.get("SUPABASE_ANON_KEY", "")

app = FastAPI(title="Astraura · nube StarSeed", version=VERSION)


def _json(url: str, cabeceras: dict | None = None, timeout: float = 4.0):
    """GET que nunca lanza: devuelve None si algo falla."""
    try:
        req = urllib.request.Request(url, headers=cabeceras or {})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read() or b"null")
    except Exception:
        return None


@app.get("/")
@app.get("/api/status")
def estado() -> dict:
    return {
        "ok": True,
        "servicio": "astraura-nube",
        "modo": "nube",
        "version": VERSION,
        "os": "https://starseed-os.vercel.app",
        "backend": BACKEND,
        "codigo": "https://github.com/StarSeedSystem/astraura",
        "activo_desde_s": round(time.time() - ARRANQUE, 3),
    }


@app.get("/api/neurona")
def neurona() -> dict:
    """Neurona pública anunciada por su dueño (túnel) y si responde ahora."""
    filas = None
    if ANON:
        filas = _json(
            f"{SUPABASE}/rest/v1/relevo_eventos?select=t,texto&tipo=eq.tunel&order=t.desc&limit=1",
            {"apikey": ANON, "Authorization": f"Bearer {ANON}"},
        )
    base = (filas or [{}])[0].get("texto") if filas else None
    salud = None
    if base:
        # El backend responde en /api/status; si esa ruta no existe en su versión,
        # /api/cerebros sirve igual como señal de vida.
        for ruta in ("/api/status", "/api/cerebros"):
            salud = _json(f"{base}{ruta}")
            if salud is not None:
                break
    return {
        "anunciada": base,
        "viva": salud is not None,
        "detalle": salud if salud is not None else ("anunciada pero sin respuesta ahora" if base else "sin neurona pública anunciada"),
    }


@app.get("/api/backend")
def backend() -> dict:
    """Salud del backend completo en Cloud Run (arranca en frío en ~2-3 s)."""
    salud = _json(f"{BACKEND}/api/status", timeout=25.0)
    return {"url": BACKEND, "vivo": salud is not None, "detalle": salud or "sin respuesta"}


@app.get("/api/fuentes")
def fuentes() -> dict:
    """Qué usar cuando no hay neurona: todo gratuito y servido por el propio OS."""
    return {
        "recomendadas": [
            {"id": "nvidia-nim", "via": "/api/ai/nvidia", "nota": "82 modelos, clave compartida del servidor"},
            {"id": "openrouter-free", "via": "/api/ai/openrouter", "nota": "modelos :free"},
            {"id": "astraura-nube", "via": BACKEND, "nota": "backend completo en Cloud Run, escala a cero"},
            {"id": "astraura-local", "via": "neurona propia", "nota": "instala Astraura en tu equipo para inferencia local"},
        ],
        "politica": "gratis primero; la nube nunca bloquea al usuario",
    }
