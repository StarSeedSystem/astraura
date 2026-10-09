"""
Motor de ramas paralelas del chat de Astraura — versión medida (2026-10-09).

QUÉ HACE: ejecuta a la vez las cuatro ramas que de verdad existen antes de que
BitNet escriba la respuesta (hardware, memoria, herramientas y análisis de la
consulta) y devuelve un plan con lo que REALMENTE pasó en cada una.

POR QUÉ SE REESCRIBIÓ: la versión anterior declaraba de 4 a 6 ramas con
procesos inventados («Forja de Shaders GLSL», cpu 3.2…), «hilos SIMD»
asignados que nadie asignaba, subagentes que no existían y una «aceleración»
calculada como nº de ramas × 1,35. Además marcaba TODAS las ramas como
completadas con la latencia total aunque una hubiera fallado, y los textos de
respaldo de los fallos decían que todo había ido bien.

CÓMO MIDE:
  · Cada rama lleva su propio cronómetro y su estado: «completada»,
    «tiempo agotado» o «fallo» (con el tipo de error).
  · La aceleración es la real del paralelismo: suma de los tiempos de rama
    dividida entre el tiempo total transcurrido. Antes de ejecutar no se
    publica ninguna aceleración.
  · La telemetría de hardware (psutil, recorre el espacio de trabajo) es
    síncrona; corre en un hilo aparte para no congelar a las demás ramas.
  · Las claves que lee la interfaz del OS (`describeAstraura158Plan`):
    total_branches, total_agents, hardware_platform, speedup_factor,
    branches[name/agent/color/status] — se mantienen; las inventadas
    (total_subagents, max_concurrency_threads, threads_allocated,
    active_processes, developed_branches) desaparecen.
"""

import asyncio
import time
from typing import Dict, Any, List, Optional

from ..core.environment import environment_sensor
from ..core.profiler import profiler
from .memory_agent import memory_agent
from .tool_agent import tool_agent
from .reasoner import reasoner


# Ramas que se ejecutan de verdad (en este orden). `limite_s` = tiempo máximo
# que se espera a cada una antes de declararla «tiempo agotado».
RAMAS: List[Dict[str, Any]] = [
    {
        "id": "branch_hardware_env",
        "name": "Telemetría del equipo",
        "agent": "Hephaestus (hardware)",
        "agent_id": "agent_hephaestus",
        "color": "#f59e0b",
        "purpose": "Leer CPU, RAM y batería del equipo en este momento (psutil).",
        "limite_s": 3.0,
    },
    {
        "id": "branch_associative_memory",
        "name": "Memoria asociativa",
        "agent": "Mnemosyne (memoria)",
        "agent_id": "agent_mnemosyne",
        "color": "#a855f7",
        "purpose": "Buscar fragmentos y conceptos relacionados en la memoria local.",
        "limite_s": 1.5,
    },
    {
        "id": "branch_web_crawler",
        "name": "Herramientas",
        "agent": "Hermes (herramientas)",
        "agent_id": "agent_hermes",
        "color": "#10b981",
        "purpose": "Ejecutar las herramientas que la consulta pide (si pide alguna).",
        "limite_s": 2.5,
    },
    {
        "id": "branch_ternary_reasoning",
        "name": "Análisis de la consulta",
        "agent": "Logos (clasificador por reglas)",
        "agent_id": "agent_logos",
        "color": "#3b82f6",
        "purpose": "Clasificar la intención de la consulta con reglas de palabras clave.",
        "limite_s": 1.2,
    },
]

ESTADO_OK = "completada"
ESTADO_TIEMPO = "tiempo agotado"
ESTADO_FALLO = "fallo"
ESTADO_PENDIENTE = "en cola"


def plataforma_real(perfil: Optional[Dict[str, Any]] = None) -> str:
    """Descripción del hardware sacada del perfil medido (nunca un texto fijo)."""
    try:
        perfil = perfil if perfil is not None else profiler.get_profile()
        sistema = perfil.get("system", {}) or {}
        nucleos = sistema.get("logical_cores") or sistema.get("physical_cores")
        if sistema.get("is_apple_silicon"):
            base = "Apple Silicon"
        else:
            base = str(sistema.get("processor") or sistema.get("arch") or "CPU")
        arq = sistema.get("arch")
        partes = [base]
        if arq and arq.lower() not in base.lower():
            partes.append(str(arq))
        if nucleos:
            partes.append(f"{nucleos} núcleos")
        return " · ".join(partes)
    except Exception:
        return "hardware sin perfilar"


def factor_aceleracion(latencias_ms: List[float], total_ms: float) -> Optional[str]:
    """Aceleración REAL del paralelismo: Σ tiempos de rama / tiempo transcurrido.

    1.0x significa que ejecutarlas a la vez no ganó nada frente a hacerlas
    una tras otra. Devuelve None si no hay datos suficientes para medirlo.
    """
    if not latencias_ms or total_ms <= 0:
        return None
    suma = sum(max(0.0, float(x)) for x in latencias_ms)
    if suma <= 0:
        return None
    return f"{round(suma / total_ms, 2)}x"


async def _medir(limite_s: float, factoria) -> Dict[str, Any]:
    """Ejecuta `factoria()` (corutina) con cronómetro y límite propios."""
    t0 = time.perf_counter()
    try:
        valor = await asyncio.wait_for(factoria(), timeout=limite_s)
        estado, error = ESTADO_OK, None
    except asyncio.TimeoutError:
        valor, estado, error = None, ESTADO_TIEMPO, f"sin respuesta en {limite_s:g} s"
    except Exception as exc:  # el fallo se cuenta, no se disimula
        valor, estado, error = None, ESTADO_FALLO, type(exc).__name__
    ms = round((time.perf_counter() - t0) * 1000, 1)
    return {"valor": valor, "estado": estado, "error": error, "ms": ms}


def _pensamiento_fallo(nombre: str, medida: Dict[str, Any]) -> str:
    if medida["estado"] == ESTADO_TIEMPO:
        return f"⏱️ {nombre}: {medida['error']} — se continúa sin esta rama."
    return f"❌ {nombre}: falló ({medida['error']}) tras {medida['ms']} ms — se continúa sin esta rama."


class ParallelBranchingEngine:
    """Ejecuta en paralelo las ramas previas a la respuesta y mide cada una."""

    def __init__(self):
        self.name = "Parallel Branching Engine (medido)"

    def analyze_query_branches(self, prompt: str, preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Plan previo: SOLO las ramas que se van a ejecutar, todas «en cola».

        No incluye aceleración ni latencias: todavía no se ha medido nada.
        """
        ramas = []
        for r in RAMAS:
            ramas.append({
                "id": r["id"], "name": r["name"], "agent": r["agent"], "agent_id": r["agent_id"],
                "color": r["color"], "purpose": r["purpose"], "limit_ms": int(r["limite_s"] * 1000),
                "status": ESTADO_PENDIENTE,
            })
        return {
            "total_branches": len(ramas),
            "total_agents": len({r["agent"] for r in ramas}),
            "hardware_platform": plataforma_real(),
            "measured": False,
            "branches": ramas,
        }

    async def execute_parallel_swarm_cycle(
        self,
        user_prompt: str,
        preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Lanza las cuatro ramas a la vez y devuelve el plan con lo medido."""
        t0 = time.perf_counter()
        plan = self.analyze_query_branches(user_prompt, preferences)

        async def rama_hardware():
            # psutil + recorrido del espacio de trabajo: síncrono → a un hilo.
            return await asyncio.to_thread(environment_sensor.get_live_metrics)

        async def rama_memoria():
            return await memory_agent.retrieve_context(user_prompt)

        async def rama_herramientas():
            return await tool_agent.execute_tool_for_prompt(user_prompt, preferences=preferences)

        async def rama_analisis():
            return await reasoner.analyze_query(user_prompt, [], {})

        factorias = [rama_hardware, rama_memoria, rama_herramientas, rama_analisis]
        medidas = await asyncio.gather(*[
            _medir(r["limite_s"], f) for r, f in zip(RAMAS, factorias)
        ])
        total_ms = round((time.perf_counter() - t0) * 1000, 1)
        hw_m, mem_m, tool_m, razon_m = medidas

        # ── Hardware ───────────────────────────────────────────────────────
        env_metrics: Dict[str, Any] = hw_m["valor"] if isinstance(hw_m["valor"], dict) else {}
        if hw_m["estado"] == ESTADO_OK:
            carga = env_metrics.get("system_load", {}) or {}
            bateria = env_metrics.get("battery", {}) or {}
            linea_bat = (
                f"batería {bateria.get('percent')}%" if bateria.get("presente", True) and bateria.get("percent") is not None
                else "sin batería (enchufado)"
            )
            hw_thoughts = [
                f"⚡ {plan['hardware_platform']} · CPU {carga.get('cpu_percent', '?')}% · "
                f"RAM libre {carga.get('ram_available_gb', '?')} GB · {linea_bat} (leído en {hw_m['ms']} ms)."
            ]
        else:
            hw_thoughts = [_pensamiento_fallo("Telemetría", hw_m)]

        # ── Memoria ────────────────────────────────────────────────────────
        mem_res: Dict[str, Any] = mem_m["valor"] if isinstance(mem_m["valor"], dict) else {}
        context_chunks = list(mem_res.get("context_chunks") or [])
        related_nodes = list(mem_res.get("related_nodes") or [])
        if mem_m["estado"] == ESTADO_OK:
            mem_thoughts = [
                f"🧠 Memoria: {len(context_chunks)} fragmentos y {len(related_nodes)} conceptos relacionados "
                f"({mem_m['ms']} ms)."
            ] + [str(t) for t in (mem_res.get("thoughts") or [])][:4]
        else:
            mem_thoughts = [_pensamiento_fallo("Memoria", mem_m)]

        # ── Herramientas ───────────────────────────────────────────────────
        tool_res: Dict[str, Any] = tool_m["valor"] if isinstance(tool_m["valor"], dict) else {}
        tool_executions = list(tool_res.get("tool_executions") or [])
        tool_data = tool_res.get("collected_data") or {}
        if tool_m["estado"] == ESTADO_OK:
            ok = sum(1 for t in tool_executions if isinstance(t, dict) and t.get("success") is not False)
            if tool_executions:
                cabecera = f"🛠️ Herramientas: {len(tool_executions)} ejecutadas, {ok} con éxito ({tool_m['ms']} ms)."
            else:
                cabecera = f"🛠️ Herramientas: la consulta no pidió ninguna ({tool_m['ms']} ms)."
            tool_thoughts = [cabecera] + [str(t) for t in (tool_res.get("thoughts") or [])][:4]
        else:
            tool_thoughts = [_pensamiento_fallo("Herramientas", tool_m)]

        # ── Análisis por reglas ───────────────────────────────────────────
        razon_res: Dict[str, Any] = razon_m["valor"] if isinstance(razon_m["valor"], dict) else {}
        if razon_m["estado"] == ESTADO_OK:
            pasos = [str(t) for t in (razon_res.get("thoughts") or [])][:4]
            razon_thoughts = [f"🔎 Intención detectada por reglas de palabras clave ({razon_m['ms']} ms):"] + (
                pasos or ["sin regla específica: consulta general."]
            )
        else:
            razon_thoughts = [_pensamiento_fallo("Análisis", razon_m)]

        # ── Plan con lo medido ─────────────────────────────────────────────
        latencias = [m["ms"] for m in medidas]
        aceleracion = factor_aceleracion(latencias, total_ms)
        for rama, medida in zip(plan["branches"], medidas):
            rama["status"] = medida["estado"]
            rama["latency_ms"] = medida["ms"]
            if medida["error"]:
                rama["error"] = medida["error"]
        completadas = sum(1 for m in medidas if m["estado"] == ESTADO_OK)
        plan["measured"] = True
        plan["elapsed_ms"] = total_ms
        plan["completed_branches"] = completadas
        if aceleracion:
            plan["speedup_factor"] = aceleracion

        elapsed_sec = round(total_ms / 1000, 3)
        resumen = [
            f"🌌 {len(medidas)} ramas ejecutadas a la vez en {elapsed_sec} s: "
            f"{completadas} completadas, {len(medidas) - completadas} sin resultado.",
        ]
        if aceleracion:
            resumen.append(
                f"🚀 Aceleración medida del paralelismo: {aceleracion} "
                f"(suma de ramas {round(sum(latencias))} ms / total {round(total_ms)} ms)."
            )
        resumen.append(
            f"🧠 Contexto reunido: {len(context_chunks)} fragmentos, {len(related_nodes)} conceptos, "
            f"{len(tool_executions)} herramientas."
        )

        agent_traces = [
            {"agent": "Astraura Prime (orquestador)", "color": "#00f0ff", "thoughts": resumen},
            {"agent": RAMAS[0]["agent"], "color": RAMAS[0]["color"], "thoughts": hw_thoughts},
            {"agent": RAMAS[1]["agent"], "color": RAMAS[1]["color"], "thoughts": mem_thoughts},
            {"agent": tool_res.get("agent") or RAMAS[2]["agent"], "color": RAMAS[2]["color"], "thoughts": tool_thoughts},
            {"agent": RAMAS[3]["agent"], "color": RAMAS[3]["color"], "thoughts": razon_thoughts},
        ]

        return {
            "branching_plan": plan,
            "elapsed_seconds": elapsed_sec,
            "agent_traces": agent_traces,
            "context_chunks": context_chunks,
            "related_nodes": related_nodes,
            "tool_executions": tool_executions,
            "tool_data": tool_data,
            "env_metrics": env_metrics,
        }


parallel_branching_engine = ParallelBranchingEngine()
