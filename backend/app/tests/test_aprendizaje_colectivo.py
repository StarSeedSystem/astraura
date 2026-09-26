"""Capa «colectiva» de las capas de conciencia del OS (Ola 365, 2026-09-26).

El OS manda `preferences.aprendizaje_colectivo` en cada turno. Con `false` ese turno no
entra en el corpus vivo; sin el campo, o con `true`, se aprende como siempre.
"""

import asyncio
import sys
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.core.aprendizaje import APRENDIZAJE_COLECTIVO, aprendizaje_de
from app.core.aprendizaje.corpus import CorpusVivo


def _correr(coro):
    """Bucle propio: `asyncio.run` deja el hilo sin bucle y rompe los tests que usan
    `get_event_loop()` después en la misma sesión."""
    bucle = asyncio.new_event_loop()
    try:
        return bucle.run_until_complete(coro)
    finally:
        bucle.close()


def _mensajes():
    return [
        {"role": "user", "content": "¿qué tiempo hace?"},
        {"role": "assistant", "content": "Soleado y templado."},
    ]


def test_aprendizaje_de_solo_lo_apaga_un_false_explicito():
    assert aprendizaje_de({"aprendizaje_colectivo": False}) is False
    assert aprendizaje_de({"aprendizaje_colectivo": True}) is True
    assert aprendizaje_de({}) is True
    assert aprendizaje_de(None) is True
    # Un valor raro no apaga el aprendizaje por accidente.
    assert aprendizaje_de({"aprendizaje_colectivo": "no"}) is True


def test_con_la_capa_apagada_el_turno_no_entra_en_el_corpus(tmp_path):
    c = CorpusVivo(raiz=tmp_path, activo=True)
    marca = APRENDIZAJE_COLECTIVO.set(False)
    try:
        assert c.registrar("astra", "chat", _mensajes()) is None
    finally:
        APRENDIZAJE_COLECTIVO.reset(marca)
    assert not list(tmp_path.rglob("*.jsonl"))
    # Fuera de ese contexto vuelve a aprender.
    assert c.registrar("astra", "chat", _mensajes())
    assert len(list(tmp_path.rglob("*.jsonl"))) == 1


def test_la_marca_de_un_turno_no_contagia_a_otro_concurrente(tmp_path):
    c = CorpusVivo(raiz=tmp_path, activo=True)

    async def turno(colectivo: bool):
        APRENDIZAJE_COLECTIVO.set(colectivo)
        await asyncio.sleep(0)
        return c.registrar("astra", "chat", _mensajes())

    async def ambos():
        return await asyncio.gather(turno(False), turno(True))

    apagado, encendido = _correr(ambos())
    assert apagado is None
    assert encendido
    assert APRENDIZAJE_COLECTIVO.get() is True


def _orquestador_espia(vistos):
    class _Orq:
        async def generate_response_stream(self, prompt, system_prompt, preferences=None):
            vistos.append(APRENDIZAJE_COLECTIVO.get())
            yield {"type": "token", "token": "ok"}
            yield {"type": "done", "full_text": "ok"}

    mod = types.ModuleType("app.agents.orchestrator")
    mod.orchestrator = _Orq()
    return mod


def test_el_puente_del_os_respeta_la_capa_en_los_dos_caminos(monkeypatch):
    from app.api import starseed_bridge as puente

    vistos = []
    monkeypatch.setitem(sys.modules, "app.agents.orchestrator", _orquestador_espia(vistos))

    def peticion(colectivo, stream):
        prefs = {} if colectivo is None else {"aprendizaje_colectivo": colectivo}
        return puente.BridgeChatRequest(
            messages=[puente.BridgeMessage(role="user", content="hola")],
            preferences=prefs,
            stream=stream,
        )

    async def recorrer(resp):
        async for _ in resp.body_iterator:
            pass

    async def todo():
        r = await puente.starseed_chat(peticion(False, False))
        assert r["response"] == "ok"
        await puente.starseed_chat(peticion(None, False))
        await recorrer(await puente.starseed_chat(peticion(False, True)))
        await recorrer(await puente.starseed_chat(peticion(True, True)))

    _correr(todo())
    assert vistos == [False, True, False, True]
    # Nada queda marcado fuera de las peticiones.
    assert APRENDIZAJE_COLECTIVO.get() is True
