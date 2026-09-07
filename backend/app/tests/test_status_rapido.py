# (Ola 278 · AS1 · 2026-09-07) Pruebas del estado rápido para el OS.
#
# Contexto (Mac de Alex, 8 GB): el OS sondea /api/status con un tope de 5 s para
# decidir si Astraura local está lista; como `get_status()` hacía trabajo lento
# síncrono (psutil, glob de modelos, sonda HTTP a Ollama) en el hilo del event
# loop, en cuanto la Mac iba cargada el chat caía a otros modelos. La ola 278:
#   1) `get_status()` recalcula en `asyncio.to_thread(_status_sync)` y cachea la
#      foto 5 s en memoria (`_STATUS_CACHE`), con `?fresco=1` para saltarla.
#   2) nueva ruta `/api/ping` ultraligera (sin psutil/glob/red) para el latido.
#
# Estas pruebas no tocan procesos ni red: se parchea `_status_sync` para que
# devuelva una foto fija y se mide la caché de 5 s y el `/api/ping`.

import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.main import _STATUS_CACHE, _status_sync, get_ping, get_status

import pytest
from fastapi.testclient import TestClient

# (Ola 278 · AS1) `app.main` arranca agentes en segundo plano al importar; para
# no encadenar el arranque, se importa `app` aquí dentro y se usa TestClient.
from app import main as _main


@pytest.fixture()
def app() -> Any:
    """Aplicación ASGI limpia con la caché de estado reseteada, para que cada
    test arranque sin foto previa y sin medir tiempos de un test anterior."""
    _STATUS_CACHE["t"] = 0.0
    _STATUS_CACHE["valor"] = None
    return _main.app


def test_status_devuelve_la_foto_cacheadas(app: Any, monkeypatch: Any) -> None:
    """Dos llamadas seguidas a `/api/status` devuelven el mismo `t` de caché:
    el segundo GET no recalcula (la foto se sirve tal cual). (Ola 278 · AS1)"""
    cliente = TestClient(app)
    monkeypatch.setattr(_main, "_status_sync", lambda: {"foto": "fija", "t_foto": 123})
    r1 = cliente.get("/api/status").json()
    r2 = cliente.get("/api/status").json()
    assert r1["foto"] == "fija"
    assert r1["t_foto"] == 123
    assert r2["t_foto"] == 123


def test_cache_expirada_recalcula(app: Any, monkeypatch: Any) -> None:
    """La caché vive 5 s: tras saltar el reloj más allá del TTL, `/api/status`
    recalcula y devuelve una foto nueva. (Ola 278 · AS1)"""
    cliente = TestClient(app)
    reloj = {"ahora": 1000.0}
    monkeypatch.setattr(time, "time", lambda: reloj["ahora"])
    calls = {"n": 0}

    def _foto():
        calls["n"] += 1
        return {"vuelta": calls["n"]}

    monkeypatch.setattr(_main, "_status_sync", _foto)
    assert cliente.get("/api/status").json()["vuelta"] == 1
    # Dentro de la ventana de 5 s → caché.
    assert cliente.get("/api/status").json()["vuelta"] == 1
    # Expira: salta 6 s → recálculo.
    reloj["ahora"] += 6.0
    assert cliente.get("/api/status").json()["vuelta"] == 2


def test_fresco_ignora_la_cache(app: Any, monkeypatch: Any) -> None:
    """`?fresco=1` fuerza el recálculo aunque la caché esté recién llena.
    (Ola 278 · AS1)"""
    cliente = TestClient(app)
    calls = {"n": 0}

    def _foto():
        calls["n"] += 1
        return {"vuelta": calls["n"]}

    monkeypatch.setattr(_main, "_status_sync", _foto)
    assert cliente.get("/api/status").json()["vuelta"] == 1
    # Mismo instante, pero pidiendo fresco → recálculo.
    assert cliente.get("/api/status?fresco=1").json()["vuelta"] == 2


def test_ping_responde_rapido_y_con_claves(app: Any, monkeypatch: Any) -> None:
    """`/api/ping` responde en < 50 ms con las claves del latido (sin psutil,
    glob ni red: solo `estado_turno()`, barato, y el rastro `_last_source`).
    (Ola 278 · AS1 · 2026-09-07)"""
    cliente = TestClient(app)
    # (Ola 278 · AS1) `estado_turno` puede consultar el puerto; se le da un
    # valor de reserva determinista para no depender del estado real.
    monkeypatch.setattr(_main.bitnet_cpp_manager, "estado_turno", lambda: {
        "dormido": False,
        "cedido_hasta_s": 0,
        "vivo": True,
    })
    t0 = time.time()
    r = cliente.get("/api/ping").json()
    dt = time.time() - t0
    for clave in ("ok", "motor_local", "dormido", "cedido_hasta_s", "vivo", "version", "t"):
        assert clave in r, f"falta la clave {clave} en /api/ping"
    assert r["ok"] is True
    assert r["dormido"] is False
    assert r["vivo"] is True
    assert dt < 0.05, f"/api/ping tardó {dt:.3f} s (tope 50 ms)"