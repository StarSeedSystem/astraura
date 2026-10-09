# (2026-10-09) Pruebas del chat en capas REAL (`/api/chat/layered`).
#
# Por qué: la versión anterior dormía 0,4/0,5/0,3 s, declaraba «100% Validada»
# sin validar y no devolvía respuesta. Aquí se fija que cada capa usa el motor
# que dice (Needle → memoria/web → BitNet → Jev), que la respuesta llega en
# `layered_pipeline_complete` y que una respuesta dudosa se reescribe una vez.
# Sin red ni BitNet: motores sustituidos.

import asyncio
import contextlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.agents import layered_quantum_orchestrator as L  # noqa: E402


def test_es_espanol() -> None:
    assert L.es_espanol("¿Cuál es la capital de Francia?")
    assert L.es_espanol("dime la capital de francia")
    assert not L.es_espanol("What is the capital of France?")
    assert not L.es_espanol("")


def test_fuentes_elegidas_respeta_al_reflejo() -> None:
    d = {"ok": True, "llamadas": [{"nombre": "buscar_web", "argumentos": {"consulta": "noticias bitnet"}}]}
    out = L.fuentes_elegidas(d, "qué hay de nuevo en bitnet")
    assert out["web"] == "noticias bitnet" and out["memoria"] == "qué hay de nuevo en bitnet"
    assert L.fuentes_elegidas({"ok": True, "llamadas": []}, "hola")["web"] is None
    sin = L.fuentes_elegidas({"ok": False, "error": "no instalado"}, "hola")
    assert sin["web"] is None and "no disponible (no instalado)" in sin["motivo"]
    assert L.fuentes_elegidas(None, "x", {"research_depth": "academic"})["web"] == "x"
    assert L.fuentes_elegidas(d, "x", {"web": False})["web"] is None


def test_veredicto() -> None:
    assert L.veredicto(None) == "sin juicio"
    assert L.veredicto(0.8) == "aprobada"
    assert L.veredicto(0.3) == "dudosa"


def _preparar(monkeypatch, juicios):
    from app.core import needle3_engine as N
    from app.core import turnero
    from app.agents import orchestrator as O

    monkeypatch.setattr(N.needle3_engine, "decidir",
                        lambda *a, **k: {"ok": True, "llamadas": [], "ms": 3, "confianza": 0.9})
    monkeypatch.setattr(O.AstrauraOrchestrator, "gather_context_items",
                        staticmethod(lambda q, *a, **k: [{"line": "París es la capital de Francia.", "source": "memory"}]))

    @contextlib.asynccontextmanager
    async def turno_libre(tipo="chat"):
        yield

    monkeypatch.setattr(turnero, "turno", turno_libre)
    llamadas = []

    async def generar(prompt, sistema, contexto=None, max_tokens=256, temperatura=0.3):
        llamadas.append(("responder", sistema, prompt, temperatura))
        return ("Paris." if temperatura < 0.5 else "The capital of France is Paris."), "bitnet-native"

    async def traducir(texto, a_ingles):
        llamadas.append(("a-ingles" if a_ingles else "a-espanol", texto))
        if a_ingles:
            return "What is the capital of France?", "bitnet-native"
        return "La capital de Francia es París.", "bitnet-native"

    cola = list(juicios)

    async def juzgar(pregunta, respuesta, en_ingles):
        return {"p_si": cola.pop(0), "ms": 5, "motor": "bitnet-nprobs"}

    monkeypatch.setattr(L, "_generar", generar)
    monkeypatch.setattr(L, "_traducir", traducir)
    monkeypatch.setattr(L, "_juzgar", juzgar)
    monkeypatch.setattr(L, "_bitnet_congelado", lambda: False)
    return llamadas


def _correr(prompt, prefs=None):
    async def todo():
        return [ev async for ev in L.layered_quantum_orchestrator.execute_phased_layered_pipeline(prompt, prefs)]
    return asyncio.run(todo())


def test_pipeline_devuelve_respuesta_real_con_puente(monkeypatch) -> None:
    llamadas = _preparar(monkeypatch, [0.9])
    eventos = _correr("¿Cuál es la capital de Francia?")
    fin = eventos[-1]
    assert fin["type"] == "layered_pipeline_complete"
    assert fin["answer"] == "La capital de Francia es París."
    assert fin["answer_en"] == "Paris." and fin["language_bridge"] is True
    assert fin["engine"] == "bitnet-native"
    assert fin["judge"]["p_correct"] == 0.9 and fin["judge"]["verdict"] == "aprobada"
    assert fin["memory_items"] == 1
    # Tres pasos reales de BitNet: traducir, responder en inglés, traducir de vuelta.
    assert [c[0] for c in llamadas] == ["a-ingles", "responder", "a-espanol"]
    assert llamadas[1][1] == L.SISTEMA_EN and llamadas[1][2] == "What is the capital of France?"
    # Nada de ubicación ni sellos inventados.
    texto = repr(eventos)
    assert "location" not in texto and "100% Validada" not in texto and "Soberano" not in texto
    fases = [e["phase"] for e in eventos if e["type"] == "layered_phase_progress"]
    assert fases == [1, 2, 3, 4]


def test_respuesta_dudosa_se_reescribe_y_se_queda_la_mejor(monkeypatch) -> None:
    _preparar(monkeypatch, [0.2, 0.7])
    fin = _correr("What is the capital of France?")[-1]
    assert fin["language_bridge"] is False
    assert fin["judge"]["rewritten"] is True and fin["judge"]["p_correct"] == 0.7
    assert fin["answer"] == "The capital of France is Paris."


def test_reescritura_peor_conserva_la_original(monkeypatch) -> None:
    _preparar(monkeypatch, [0.4, 0.1])
    fin = _correr("What is the capital of France?")[-1]
    assert fin["judge"]["p_correct"] == 0.4 and fin["answer"] == "Paris."


def test_contexto_del_modelo_sin_sus_respuestas_previas(monkeypatch) -> None:
    """El bucle medido: «La capital de Francia es Madrid» guardado como recuerdo
    volvía como primer contexto. Con solo_verificadas no entra; la UI lo sigue viendo."""
    from app.agents import orchestrator as O
    from app.memory import mem0_engine as M0
    from app.memory import knowledge_graph as KG
    from app.memory import starseed_memory_engine as SM

    monkeypatch.setattr(M0.mem0_engine, "search_memories", lambda *a, **k: [
        {"memory": "Usuario consultó a Astraura: ¿Cuál es la capital de Francia? -> Síntesis: La capital de Francia es Madrid.",
         "category": "chat_episodic"},
        {"memory": "Alex vive cerca de la capital y prefiere respuestas breves sobre Francia.", "category": "preferencias"},
    ])
    monkeypatch.setattr(KG.knowledge_graph, "query_subgraph", lambda *a, **k: {"nodes": [
        {"label": "Madrid", "description": "Concepto destilado de interacción (¿Cuál es la capital de Francia?...)", "strength": 0.6},
    ]})
    monkeypatch.setattr(SM.starseed_memory, "search_documents", lambda *a, **k: [])
    todo = [it["line"] for it in O.AstrauraOrchestrator.gather_context_items("¿Cuál es la capital de Francia?")]
    filtrado = [it["line"] for it in O.AstrauraOrchestrator.gather_context_items(
        "¿Cuál es la capital de Francia?", solo_verificadas=True)]
    assert any("Madrid" in l for l in todo)
    assert not any("Madrid" in l for l in filtrado)
    assert any("respuestas breves" in l for l in filtrado)
    chunks = ["Usuario: ¿Cuál es la capital de Francia?\nAstraura: Madrid.", "Documento: París es la capital."]
    final = O.AstrauraOrchestrator._gather_context("¿Cuál es la capital de Francia?", chunks)
    assert "Documento: París es la capital." in final
    assert not any(str(c).startswith("Usuario:") for c in final)
