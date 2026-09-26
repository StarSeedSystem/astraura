"""Presupuesto de fondo de cognition (2026-09-26).

Con el llama-server compartido (Mac de 8 GB), el fondo usa como mucho una fracción del
tiempo del motor y cede al chat en cuanto un turno interactivo pide el hueco.
"""

import asyncio
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.core import cognition
from app.core.aprendizaje import corpus_vivo


def _correr(coro):
    """Bucle propio: `asyncio.run` deja el hilo sin bucle y rompe los tests que usan
    `get_event_loop()` después en la misma sesión."""
    bucle = asyncio.new_event_loop()
    try:
        return bucle.run_until_complete(coro)
    finally:
        bucle.close()


@pytest.fixture(autouse=True)
def _motor_falso(monkeypatch):
    monkeypatch.setattr(cognition, "engine_mode", lambda ttl=5.0: "bitnet-native")
    monkeypatch.setattr(corpus_vivo, "activo", False)
    monkeypatch.setattr(cognition, "_chat_pide_el_motor", lambda: False)
    monkeypatch.setitem(cognition._fondo, "en_curso", 0)
    monkeypatch.setitem(cognition._fondo, "libre_desde", 0.0)
    yield


def _consumo(duracion, registro=None):
    async def _falso(prompt, system, context_chunks, tool_data, max_tokens, temperature, meta):
        try:
            await asyncio.sleep(duracion)
            meta["source"] = "bitnet-native"
            return "texto real del motor"
        finally:
            if registro is not None:
                registro.append("terminado")
    return _falso


def test_en_servidor_compartido_la_siguiente_espera_su_descanso(monkeypatch):
    monkeypatch.setenv("ASTRAURA_FONDO_CICLO", "0.25")
    monkeypatch.setattr(cognition, "_consume", _consumo(0.2))

    async def dos():
        return await cognition.generate("hola"), await cognition.generate("hola otra vez")

    primera, segunda = _correr(dos())
    assert primera["real"] is True
    assert segunda["real"] is False and "presupuesto de fondo" in segunda["error"]
    estado = cognition.fondo_estado()
    assert estado["en_curso"] == 0 and estado["descansa_s"] >= 0
    # 0,2 s de trabajo con ciclo 0,25 → ~0,6 s de descanso: pasado, vuelve a generar.
    cognition._fondo["libre_desde"] = 0.0
    assert _correr(cognition.generate("ya descansó"))["real"] is True


def test_sin_servidor_compartido_no_hay_presupuesto(monkeypatch):
    monkeypatch.setenv("ASTRAURA_FONDO_CICLO", "1")
    monkeypatch.setattr(cognition, "_consume", _consumo(0.05))

    async def dos():
        return await cognition.generate("a"), await cognition.generate("b")

    a, b = _correr(dos())
    assert a["real"] is True and b["real"] is True


def test_cede_al_chat_y_corta_la_generacion_de_fondo(monkeypatch):
    monkeypatch.setenv("ASTRAURA_FONDO_CICLO", "0.25")
    registro = []
    monkeypatch.setattr(cognition, "_consume", _consumo(30.0, registro))
    llega_el_chat = {"t": None}

    def chat():
        import time as _t
        if llega_el_chat["t"] is None:
            llega_el_chat["t"] = _t.monotonic() + 0.3
        return _t.monotonic() >= llega_el_chat["t"]

    monkeypatch.setattr(cognition, "_chat_pide_el_motor", chat)
    import time as _t
    t0 = _t.monotonic()
    r = _correr(cognition.generate("tarea larga de fondo"))
    assert r["real"] is False and r["error"] == "cedido al chat"
    assert _t.monotonic() - t0 < 5.0
    assert registro == ["terminado"]  # la generación se canceló de verdad
    assert cognition._fondo["en_curso"] == 0


def test_un_fallo_antes_de_generar_no_deja_el_fondo_trabado(monkeypatch):
    monkeypatch.setenv("ASTRAURA_FONDO_CICLO", "0.25")

    def roto():
        raise RuntimeError("sin bucle")

    monkeypatch.setattr(cognition, "_get_semaphore", roto)
    r = _correr(cognition.generate("x"))
    assert r["real"] is False
    assert cognition._fondo["en_curso"] == 0
