"""Tests de los Agentes de aprendizaje 1.58 (Ola 270, 2026-09-07):
Curador (deduplicación del mes), Evaluador (respeta el turno de memoria del
BitNet y jamás lo despierta), pausar/reanudar y la foto de estado().

Sin red: `cognition.generate` se sustituye por una corrutina falsa y el
`estado_turno` del manager del BitNet se parchea con monkeypatch.
"""

import json
import sys
import time
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.core.aprendizaje.agentes import PlanificadorAgentes
from app.core.aprendizaje.corpus import CorpusVivo
from app.engine.bitnet_cpp_manager import bitnet_cpp_manager
import app.core.cognition as cognition


def _planificador(tmp_path):
    """Planificador aislado: corpus y artefactos en tmp_path."""
    return PlanificadorAgentes(raiz=tmp_path, corpus=CorpusVivo(raiz=tmp_path / "corpus"))


def _registrar_dos_iguales(plan, personalidad="astra"):
    mensajes = [
        {"role": "system", "content": "Eres Astraura."},
        {"role": "user", "content": "hola"},
        {"role": "assistant", "content": "¡hola!"},
    ]
    plan.corpus.registrar(personalidad, "chat", mensajes)
    plan.corpus.registrar(personalidad, "chat", mensajes)  # duplicado exacto


def test_curador_deduplica_y_escribe_curacion(tmp_path):
    plan = _planificador(tmp_path)
    _registrar_dos_iguales(plan)
    import asyncio
    resultado = asyncio.get_event_loop().run_until_complete(plan._curador())
    assert resultado["duplicados"] == 1
    assert resultado["personalidades"]["astra"] == 1
    assert resultado["sin_valorar"] == 1
    assert "listos_para_entrenar" in resultado
    informe = json.loads((tmp_path / "curacion.json").read_text(encoding="utf-8"))
    assert informe["duplicados"] == 1
    # El JSONL del mes conserva una sola copia del turno.
    carpeta = tmp_path / "corpus" / "astra"
    lineas = [l for a in carpeta.glob("*.jsonl")
              for l in a.read_text(encoding="utf-8").splitlines() if l.strip()]
    assert len(lineas) == 1


def test_evaluador_omite_con_bitnet_cedido(tmp_path, monkeypatch):
    plan = _planificador(tmp_path)
    turno = {"dormido": False, "cedido_hasta_s": 600, "vivo": True}
    monkeypatch.setattr(bitnet_cpp_manager, "estado_turno", lambda: dict(turno))
    llamadas = []

    async def falsa_generate(*args, **kwargs):
        llamadas.append(args)
        return {"text": "x", "real": False, "mode": "falso", "ms": 0}

    monkeypatch.setattr(cognition, "generate", falsa_generate)
    import asyncio
    r = asyncio.get_event_loop().run_until_complete(plan._evaluador())
    assert r["omitido"] == "turno de memoria"
    assert not llamadas  # jamás se generó nada: el BitNet no se despertó
    lineas = (tmp_path / "evaluaciones.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert json.loads(lineas[-1])["omitido"] == "turno de memoria"


def test_evaluador_sonda_con_bitnet_vivo(tmp_path, monkeypatch):
    plan = _planificador(tmp_path)
    turno = {"dormido": False, "cedido_hasta_s": 0, "vivo": True}
    monkeypatch.setattr(bitnet_cpp_manager, "estado_turno", lambda: dict(turno))

    async def falsa_generate(prompt, **kwargs):
        texto = '{"ok": true}' if "JSON" in prompt else "Respuesta breve."
        return {"text": texto, "real": True, "mode": "bitnet", "ms": 12}

    monkeypatch.setattr(cognition, "generate", falsa_generate)
    import asyncio
    r = asyncio.get_event_loop().run_until_complete(plan._evaluador())
    assert r["json_ok"] is True
    assert 0 <= r["puntuacion"] <= 100
    assert r["latencia_ms"] >= 0
    assert "omitido" not in r


def test_curador_sin_duplicados_no_reescribe(tmp_path):
    """Sin duplicados el mes queda intacto: ni .bak ni escritura (AP5)."""
    plan = _planificador(tmp_path)
    plan.corpus.registrar("astra", "chat", [
        {"role": "user", "content": "una pregunta única"},
        {"role": "assistant", "content": "una respuesta única"},
    ])
    mes = time.strftime("%Y-%m")
    archivo = tmp_path / "corpus" / "astra" / f"{mes}.jsonl"
    antes = archivo.read_bytes()
    import asyncio
    r = asyncio.get_event_loop().run_until_complete(plan._curador())
    assert r["duplicados"] == 0
    assert "reintentar" not in r
    assert archivo.read_bytes() == antes
    assert not list(archivo.parent.glob("*.bak"))
    assert not list(archivo.parent.glob("*.tmp"))


def test_curador_con_duplicados_reescribe_con_bak(tmp_path):
    """Con duplicados: se reescribe, queda .bak con el original y sin .tmp."""
    plan = _planificador(tmp_path)
    _registrar_dos_iguales(plan)
    mes = time.strftime("%Y-%m")
    archivo = tmp_path / "corpus" / "astra" / f"{mes}.jsonl"
    original = archivo.read_bytes()
    import asyncio
    r = asyncio.get_event_loop().run_until_complete(plan._curador())
    assert r["duplicados"] == 1
    bak = tmp_path / "corpus" / "astra" / f"{mes}.jsonl.bak"
    assert bak.read_bytes() == original
    assert not list(archivo.parent.glob("*.tmp"))
    assert len(archivo.read_text(encoding="utf-8").strip().splitlines()) == 1


def test_reescribir_mes_rechaza_si_cambio(tmp_path):
    """Huella distinta (un `registrar` de por medio) → False y nada se toca."""
    corpus = CorpusVivo(raiz=tmp_path / "corpus")
    corpus.registrar("astra", "chat", [{"role": "user", "content": "primero"},
                                       {"role": "assistant", "content": "uno"}])
    mes = time.strftime("%Y-%m")
    lineas, huella = corpus.leer_mes("astra", mes)
    # Llega un turno nuevo entre la lectura y la escritura (race original).
    corpus.registrar("astra", "chat", [{"role": "user", "content": "segundo"},
                                       {"role": "assistant", "content": "dos"}])
    assert corpus.reescribir_mes("astra", mes, lineas, huella) is False
    actuales, _ = corpus.leer_mes("astra", mes)
    assert len(actuales) == 2  # el turno nuevo sigue ahí: cero pérdidas
    assert not list((tmp_path / "corpus" / "astra").glob("*.bak"))


def test_rotacion_de_log_al_superar_2mb(tmp_path):
    """logs.md > 2 MB se rota a logs-AAAA-MM.md y se empieza uno nuevo."""
    logs = tmp_path / "logs.md"
    logs.write_bytes(b"x" * (PlanificadorAgentes._MAX_BYTES_LOG + 1))
    PlanificadorAgentes._anexar_con_rotacion(logs, "entrada nueva\n")
    rotado = tmp_path / f"logs-{time.strftime('%Y-%m')}.md"
    assert rotado.exists()
    assert logs.read_text(encoding="utf-8") == "entrada nueva\n"


def test_pausar_y_reanudar_cambian_activo(tmp_path):
    plan = _planificador(tmp_path)
    assert plan.pausar("curador") is True
    assert plan._agente("curador").activo is False
    assert plan.reanudar("curador") is True
    assert plan._agente("curador").activo is True
    assert plan.pausar("no-existe") is False


def test_estado_tiene_las_claves(tmp_path, monkeypatch):
    plan = _planificador(tmp_path)
    monkeypatch.setattr(bitnet_cpp_manager, "estado_turno",
                        lambda: {"dormido": True, "cedido_hasta_s": 0})
    estado = plan.estado()
    assert set(estado.keys()) >= {"agentes", "bitnet", "corpus"}
    assert [a["id"] for a in estado["agentes"]] == [
        "curador", "evaluador", "cronista", "entrenador", "desplegador"]
    assert estado["bitnet"]["dormido"] is True
    # Entrenador y Desplegador esperan la fábrica QVAC.
    import asyncio
    r = asyncio.get_event_loop().run_until_complete(plan.ejecutar_ahora("entrenador"))
    assert r["motivo"] == "fábrica QVAC no instalada"
    assert plan.ejecutar_ahora
