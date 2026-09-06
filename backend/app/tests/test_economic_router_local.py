"""Tests del EconomicRouter: el subagente local (bitnet-158-local) habla con el
llama-server BitNet nativo, y Ollama queda SOLO como respaldo explícito.

Sin red real: se parchean `httpx.AsyncClient` y
`bitnet_cpp_manager.ensure_server`. Las corrutinas se ejecutan con
asyncio.run() en tests síncronos (pytest-asyncio no está en requirements.txt).
"""
import asyncio
import os
import sys
from unittest import mock

import httpx
import pytest

# Asegura que `backend/` está en sys.path para importar `app.*`.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.core import economic_router  # noqa: E402


class _RespuestaFalsa:
    """Doble mínimo de httpx.Response para los POST simulados."""

    def __init__(self, datos):
        self._datos = datos
        self.status_code = 200

    def raise_for_status(self):
        return None

    def json(self):
        return self._datos


class _ClienteFalso:
    """Sustituto de httpx.AsyncClient: responde lo que se le inyecte."""

    def __init__(self, datos, *args, **kwargs):
        self._datos = datos

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json=None, headers=None):
        return _RespuestaFalsa(self._datos)


class _ClienteFallo:
    """Sustituto de httpx.AsyncClient cuyo POST lanza una excepción inyectada,
    para simular un ReadTimeout sin red real."""

    def __init__(self, excepcion, *args, **kwargs):
        self._excepcion = excepcion

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json=None, headers=None):
        raise self._excepcion


class _ClienteCaptura:
    """Sustituto de httpx.AsyncClient que guarda el JSON enviado al POST, para
    poder verificar qué payload recibe el llama-server BitNet."""

    def __init__(self, datos, *args, **kwargs):
        self._datos = datos
        self.payloads = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json=None, headers=None):
        self.payloads.append(json)
        return _RespuestaFalsa(self._datos)


_DATOS_BITNET = {"choices": [{"message": {"content": "hola desde bitnet"}}]}
_DATOS_OLLAMA = {"response": "hola desde ollama"}


@pytest.fixture(autouse=True)
def _entorno_limpio(monkeypatch):
    """Ningún test depende del entorno real de la máquina."""
    monkeypatch.delenv("ASTRAURA_OLLAMA_RESPALDO", raising=False)
    monkeypatch.delenv("ASTRAURA_OLLAMA_URL", raising=False)
    monkeypatch.delenv("ASTRAURA_OLLAMA_MODEL", raising=False)


def test_generar_local_usa_bitnet_nativo(monkeypatch):
    """(a) Con BitNet vivo, devuelve (texto, "bitnet-nativo")."""
    monkeypatch.setattr(
        economic_router.bitnet_cpp_manager, "ensure_server",
        lambda wait_seconds, profile: "http://127.0.0.1:8791")
    monkeypatch.setattr(
        economic_router.httpx, "AsyncClient",
        lambda *a, **k: _ClienteFalso(_DATOS_BITNET))
    router = economic_router.EconomicRouter()
    texto, origen = asyncio.run(router._generar_local("hola"))
    assert texto == "hola desde bitnet"
    assert origen == "bitnet-nativo"


def test_generar_local_sin_bitnet_ni_respaldo_lanza(monkeypatch):
    """(b) BitNet ausente y respaldo desactivado → RuntimeError claro."""
    monkeypatch.setattr(
        economic_router.bitnet_cpp_manager, "ensure_server",
        lambda wait_seconds, profile: None)
    router = economic_router.EconomicRouter()
    with pytest.raises(RuntimeError) as excinfo:
        asyncio.run(router._generar_local("hola"))
    assert "respaldo Ollama desactivado" in str(excinfo.value)


def test_generar_local_cae_a_ollama_con_respaldo(monkeypatch):
    """(c) ASTRAURA_OLLAMA_RESPALDO=1 + BitNet caído → origen "ollama-local"."""
    monkeypatch.setenv("ASTRAURA_OLLAMA_RESPALDO", "1")
    monkeypatch.setattr(
        economic_router.bitnet_cpp_manager, "ensure_server",
        lambda wait_seconds, profile: None)
    monkeypatch.setattr(
        economic_router.httpx, "AsyncClient",
        lambda *a, **k: _ClienteFalso(_DATOS_OLLAMA))
    router = economic_router.EconomicRouter()
    texto, origen = asyncio.run(router._generar_local("hola"))
    assert texto == "hola desde ollama"
    assert origen == "ollama-local"


def test_readtimeout_vacio_nombra_el_tipo(monkeypatch):
    """(d) Un ReadTimeout con mensaje vacío debe verse por su TIPO en el motivo
    (str(ReadTimeout("")) es cadena vacía), sin respaldo Ollama desactivado."""
    monkeypatch.setattr(
        economic_router.bitnet_cpp_manager, "ensure_server",
        lambda wait_seconds, profile: "http://127.0.0.1:8791")
    monkeypatch.setattr(
        economic_router.httpx, "AsyncClient",
        lambda *a, **k: _ClienteFallo(httpx.ReadTimeout("")))
    router = economic_router.EconomicRouter()
    with pytest.raises(RuntimeError) as excinfo:
        asyncio.run(router._generar_local("hola"))
    assert "ReadTimeout" in str(excinfo.value)


def test_payload_bitnet_lleva_max_tokens_propio(monkeypatch):
    """(e) El subagente local pide _MAX_TOKENS_BITNET (256) al BitNet, no los
    512 del ensayo anterior pensado para la nube."""
    cliente = _ClienteCaptura(_DATOS_BITNET)
    monkeypatch.setattr(
        economic_router.bitnet_cpp_manager, "ensure_server",
        lambda wait_seconds, profile: "http://127.0.0.1:8791")
    monkeypatch.setattr(
        economic_router.httpx, "AsyncClient",
        lambda *a, **k: cliente)
    router = economic_router.EconomicRouter()
    texto, origen = asyncio.run(router._generar_local("hola"))
    assert texto == "hola desde bitnet"
    assert origen == "bitnet-nativo"
    assert cliente.payloads, "el POST al BitNet debió enviar un payload"
    assert cliente.payloads[0]["max_tokens"] == economic_router._MAX_TOKENS_BITNET
