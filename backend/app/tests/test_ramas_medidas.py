# (2026-10-09) Pruebas del motor de ramas paralelas MEDIDO.
#
# Por qué: el plan anterior inventaba procesos («Forja de Shaders GLSL», cpu
# 3.2), hilos SIMD, subagentes y una «aceleración» = nº de ramas × 1,35, y
# marcaba todas las ramas «completed» aunque fallaran. Estas pruebas fijan que
# el plan solo trae las ramas que se ejecutan y que cada estado/latencia es el
# medido. No tocan red ni BitNet: los agentes se sustituyen.

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.agents import parallel_branching_engine as pbe  # noqa: E402

INVENTADAS = {"total_subagents", "max_concurrency_threads"}
INVENTADAS_RAMA = {"threads_allocated", "active_processes", "developed_branches", "subagents"}


def test_factor_aceleracion_es_suma_entre_total() -> None:
    assert pbe.factor_aceleracion([100.0, 100.0, 100.0], 100.0) == "3.0x"
    assert pbe.factor_aceleracion([50.0, 50.0], 100.0) == "1.0x"
    assert pbe.factor_aceleracion([], 100.0) is None
    assert pbe.factor_aceleracion([10.0], 0.0) is None


def test_plataforma_sale_del_perfil_medido() -> None:
    perfil = {"system": {"is_apple_silicon": True, "arch": "arm64", "logical_cores": 8}}
    assert pbe.plataforma_real(perfil) == "Apple Silicon · arm64 · 8 núcleos"
    perfil = {"system": {"is_apple_silicon": False, "processor": "x86_64", "arch": "x86_64", "logical_cores": 4}}
    assert pbe.plataforma_real(perfil) == "x86_64 · 4 núcleos"


def test_plan_previo_sin_campos_inventados() -> None:
    plan = pbe.parallel_branching_engine.analyze_query_branches("hola")
    assert plan["total_branches"] == len(pbe.RAMAS) == 4
    assert plan["measured"] is False
    assert "speedup_factor" not in plan
    assert not (INVENTADAS & set(plan))
    for rama in plan["branches"]:
        assert not (INVENTADAS_RAMA & set(rama))
        assert rama["status"] == pbe.ESTADO_PENDIENTE


def test_ciclo_mide_cada_rama_y_no_disimula_fallos(monkeypatch) -> None:
    async def memoria_lenta(_prompt):
        await asyncio.sleep(5)
        return {}

    async def herramientas_rotas(_prompt, preferences=None):
        raise KeyError("x")

    async def analisis_ok(_q, _c, _t):
        return {"thoughts": ["regla"]}

    monkeypatch.setattr(pbe.environment_sensor, "get_live_metrics",
                        lambda: {"system_load": {"cpu_percent": 12, "ram_available_gb": 3.1},
                                 "battery": {"presente": False, "percent": 100.0}})
    monkeypatch.setattr(pbe.memory_agent, "retrieve_context", memoria_lenta)
    monkeypatch.setattr(pbe.tool_agent, "execute_tool_for_prompt", herramientas_rotas)
    monkeypatch.setattr(pbe.reasoner, "analyze_query", analisis_ok)
    monkeypatch.setitem(pbe.RAMAS[1], "limite_s", 0.05)

    ciclo = asyncio.run(pbe.parallel_branching_engine.execute_parallel_swarm_cycle("hola"))
    plan = ciclo["branching_plan"]
    estados = {r["id"]: r["status"] for r in plan["branches"]}
    assert estados == {
        "branch_hardware_env": pbe.ESTADO_OK,
        "branch_associative_memory": pbe.ESTADO_TIEMPO,
        "branch_web_crawler": pbe.ESTADO_FALLO,
        "branch_ternary_reasoning": pbe.ESTADO_OK,
    }
    assert plan["completed_branches"] == 2 and plan["measured"] is True
    fallo = next(r for r in plan["branches"] if r["id"] == "branch_web_crawler")
    assert fallo["error"] == "KeyError"
    # Latencias propias, no la total repetida en todas.
    assert len({r["latency_ms"] for r in plan["branches"]}) > 1
    assert plan["speedup_factor"].endswith("x")
    textos = " ".join(t for tr in ciclo["agent_traces"] for t in tr["thoughts"])
    assert "sin batería" in textos and "KeyError" in textos and "sin respuesta en 0.05 s" in textos
    # Los textos de respaldo ya no fingen éxito.
    assert "sincronizados" not in textos and "modo ágil" not in textos
