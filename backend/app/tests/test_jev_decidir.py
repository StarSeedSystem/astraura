"""Pruebas de `POST /api/jev/decidir` (2026-09-26): validación de entrada,
puntuación con una respuesta falsa de `/completion` (sin red ni llama-server
real) y el camino ocupado del turnero. Se llama a la función de la ruta
DIRECTAMENTE (mismo patrón que `test_aprendizaje_colectivo.py`), parcheando
`_completar` (la única frontera de red) y `bitnet_cpp_manager.ensure_server`
(para no lanzar ningún proceso real).
"""

import asyncio
import math
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest
from fastapi import HTTPException

from app.api import jev as jev_mod
from app.core import turnero


def _correr(coro):
    bucle = asyncio.new_event_loop()
    try:
        return bucle.run_until_complete(coro)
    finally:
        bucle.close()


@pytest.fixture(autouse=True)
def _turnero_limpio() -> None:
    turnero._activos["chat"] = 0
    turnero._activos["jev"] = 0
    turnero._cola.clear()
    turnero._media_s = turnero._MEDIA_INICIAL_S
    turnero._rechazadas = 0
    turnero._servidas = 0
    yield


def _peticion(pregunta="¿Encender la luz del salón?", opciones=None, contexto=None):
    return jev_mod.DecidirRequest(
        pregunta=pregunta,
        opciones=opciones if opciones is not None else ["sí", "no"],
        contexto=contexto,
    )


def _respuesta_completion(letra_ganadora: str, letras: list, logit_ganador=-0.1, logit_resto=-3.0):
    """`completion_probabilities[0][...]` como lo devuelve llama-server con
    `n_probs`: una lista de {"token": letra, "logprob": ...} por token candidato."""
    primeras = []
    for l in letras:
        primeras.append({"token": l, "logprob": logit_ganador if l == letra_ganadora else logit_resto})
    return {"completion_probabilities": [primeras]}


# ─────────────────────────────────────── validación ────────────────────────────────────────

def test_400_pregunta_vacia() -> None:
    with pytest.raises(HTTPException) as exc:
        _correr(jev_mod.decidir(_peticion(pregunta="   ")))
    assert exc.value.status_code == 400


def test_400_pregunta_demasiado_larga() -> None:
    with pytest.raises(HTTPException) as exc:
        _correr(jev_mod.decidir(_peticion(pregunta="x" * (jev_mod.PREGUNTA_MAX + 1))))
    assert exc.value.status_code == 400


def test_400_menos_de_dos_opciones() -> None:
    with pytest.raises(HTTPException) as exc:
        _correr(jev_mod.decidir(_peticion(opciones=["sí"])))
    assert exc.value.status_code == 400


def test_400_mas_de_ocho_opciones() -> None:
    with pytest.raises(HTTPException) as exc:
        _correr(jev_mod.decidir(_peticion(opciones=[f"op{i}" for i in range(9)])))
    assert exc.value.status_code == 400


def test_400_opcion_demasiado_larga() -> None:
    with pytest.raises(HTTPException) as exc:
        _correr(jev_mod.decidir(_peticion(opciones=["sí", "x" * (jev_mod.OPCION_MAX + 1)])))
    assert exc.value.status_code == 400


def test_400_contexto_demasiado_largo() -> None:
    with pytest.raises(HTTPException) as exc:
        _correr(jev_mod.decidir(_peticion(contexto="x" * (jev_mod.CONTEXTO_MAX + 1))))
    assert exc.value.status_code == 400


def test_opciones_vacias_se_descartan_antes_de_contar() -> None:
    """Espacios en blanco no cuentan como opción real: con solo un valor no
    vacío entre tres, sigue siendo «menos de 2» y se rechaza."""
    with pytest.raises(HTTPException):
        _correr(jev_mod.decidir(_peticion(opciones=["sí", "  ", ""])))


# ─────────────────────────────────────── motor no listo ────────────────────────────────────

def test_motor_no_listo_sin_binario_o_modelo(monkeypatch) -> None:
    monkeypatch.setattr(jev_mod.bitnet_cpp_manager, "ensure_server", lambda *a, **k: None)
    r = _correr(jev_mod.decidir(_peticion()))
    assert r.status_code == 503
    assert r.headers["Retry-After"] == "30"
    import json as _json
    assert _json.loads(r.body)["error"] == "motor-no-listo"


def test_motor_no_listo_si_completar_lanza(monkeypatch) -> None:
    monkeypatch.setattr(jev_mod.bitnet_cpp_manager, "ensure_server",
                         lambda *a, **k: "http://127.0.0.1:8790")

    def _rompe(base, prompt, timeout):
        raise TimeoutError("sin respuesta")

    monkeypatch.setattr(jev_mod, "_completar", _rompe)
    r = _correr(jev_mod.decidir(_peticion()))
    assert r.status_code == 503
    import json as _json
    assert _json.loads(r.body)["error"] == "motor-no-listo"


def test_motor_no_listo_sin_logits_utilizables(monkeypatch) -> None:
    monkeypatch.setattr(jev_mod.bitnet_cpp_manager, "ensure_server",
                         lambda *a, **k: "http://127.0.0.1:8790")
    monkeypatch.setattr(jev_mod, "_completar", lambda base, prompt, timeout: {"completion_probabilities": []})
    r = _correr(jev_mod.decidir(_peticion()))
    assert r.status_code == 503


# ──────────────────────────────────────── puntuación ────────────────────────────────────────

def _letra_de(prompt: str, opcion: str) -> str:
    """La letra que lleva `opcion` en ESTE prompt («B. sí» → «B»)."""
    for linea in prompt.splitlines():
        if linea.endswith(f". {opcion}"):
            return linea.split(".", 1)[0]
    raise AssertionError(f"{opcion} no está en el prompt")


def test_un_sesgo_de_posicion_no_decide(monkeypatch) -> None:
    """(2026-10-09) Un modelo que SIEMPRE elige la última letra empata: no decide nada."""
    monkeypatch.setattr(jev_mod.bitnet_cpp_manager, "ensure_server",
                         lambda *a, **k: "http://127.0.0.1:8790")
    monkeypatch.setattr(jev_mod, "_completar",
                         lambda base, prompt, timeout: _respuesta_completion("B", ["A", "B"]))
    r = _correr(jev_mod.decidir(_peticion(opciones=["sí", "no"])))
    assert math.isclose(r["probabilidades"]["sí"], r["probabilidades"]["no"], abs_tol=1e-9)


def test_decide_la_opcion_con_mayor_logit(monkeypatch) -> None:
    monkeypatch.setattr(jev_mod.bitnet_cpp_manager, "ensure_server",
                         lambda *a, **k: "http://127.0.0.1:8790")
    llamadas = []

    def _falso(base, prompt, timeout):
        llamadas.append((base, prompt, timeout))
        # (2026-10-09) El modelo prefiere «sí» esté en la posición que esté (se pregunta en
        # los dos órdenes y se promedia).
        return _respuesta_completion(_letra_de(prompt, "sí"), ["A", "B"])

    monkeypatch.setattr(jev_mod, "_completar", _falso)

    r = _correr(jev_mod.decidir(_peticion(opciones=["sí", "no"])))
    assert r["opcion"] == "sí"
    assert r["motor"] == "bitnet-nprobs"
    assert set(r["probabilidades"]) == {"sí", "no"}
    assert r["probabilidades"]["sí"] > r["probabilidades"]["no"]
    assert math.isclose(sum(r["probabilidades"].values()), 1.0, abs_tol=1e-6)
    assert isinstance(r["ms"], int) and r["ms"] >= 0
    assert llamadas and llamadas[0][0] == "http://127.0.0.1:8790"
    assert "A. sí" in llamadas[0][1] and "B. no" in llamadas[0][1]  # el prompt lleva las opciones etiquetadas


def test_decide_con_mas_de_dos_opciones_y_contexto(monkeypatch) -> None:
    monkeypatch.setattr(jev_mod.bitnet_cpp_manager, "ensure_server",
                         lambda *a, **k: "http://127.0.0.1:8790")

    def _falso(base, prompt, timeout):
        assert "hace frío" in prompt  # el contexto viaja dentro del prompt
        return _respuesta_completion(_letra_de(prompt, "chocolate caliente"), ["A", "B", "C"])

    monkeypatch.setattr(jev_mod, "_completar", _falso)

    r = _correr(jev_mod.decidir(_peticion(
        pregunta="¿Qué bebida preparo?",
        opciones=["café", "té", "chocolate caliente"],
        contexto="hace frío en el local",
    )))
    assert r["opcion"] == "chocolate caliente"
    assert set(r["probabilidades"]) == {"café", "té", "chocolate caliente"}


def test_usa_turnero_tipo_jev(monkeypatch) -> None:
    """La decisión debe pasar por `turnero.turno(tipo="jev")`: se comprueba
    espiando la llamada."""
    vistos = []
    turno_original = turnero.turno

    def _espia(tipo="chat"):
        vistos.append(tipo)
        return turno_original(tipo=tipo)

    monkeypatch.setattr(turnero, "turno", _espia)
    monkeypatch.setattr(jev_mod.bitnet_cpp_manager, "ensure_server",
                         lambda *a, **k: "http://127.0.0.1:8790")
    monkeypatch.setattr(jev_mod, "_completar",
                         lambda base, prompt, timeout: _respuesta_completion("A", ["A", "B"]))

    _correr(jev_mod.decidir(_peticion()))
    assert vistos == ["jev"]


# ───────────────────────────────────────── ocupado (503) ────────────────────────────────────

def test_503_ocupado_cuando_el_turnero_rechaza(monkeypatch) -> None:
    async def _siempre_ocupado(tipo="chat"):
        raise turnero.Ocupado("cola", 12.3, 12.3, 2)
        yield  # pragma: no cover - nunca se alcanza; hace de esta función un generador

    # `turno()` normalmente es un @asynccontextmanager; aquí sustituimos toda
    # la función por una que lanza `Ocupado` al primer `__aenter__`.
    from contextlib import asynccontextmanager
    monkeypatch.setattr(turnero, "turno", asynccontextmanager(_siempre_ocupado))

    r = _correr(jev_mod.decidir(_peticion()))
    assert r.status_code == 503
    assert r.headers["Retry-After"] == "12"  # round(12.3) == 12, dentro de [5, 300]
    import json as _json
    cuerpo = _json.loads(r.body)
    assert cuerpo["ocupado"] is True
    assert cuerpo["motivo"] == "cola"
    assert cuerpo["en_cola"] == 2


# ─────────────────────────────────────── /api/cola (shape) ─────────────────────────────────

def test_estado_del_turnero_tiene_las_claves_del_contrato() -> None:
    estado = turnero.estado()
    for clave in ("activos", "en_cola", "max_cola", "espera_estimada_s", "ram_libre_mb",
                  "admite", "media_s", "rechazadas", "servidas"):
        assert clave in estado


def test_parsea_el_formato_actual_de_llama_server_con_top_logprobs() -> None:
    """Formato medido en el BitNet de la Mac (2026-09-26): por posición, un dict
    con `top_logprobs`."""
    from app.api import jev as jev_mod
    respuesta = {"completion_probabilities": [{
        "id": 1, "token": " A", "logprob": -0.2,
        "top_logprobs": [
            {"id": 1, "token": " A", "logprob": -0.2},
            {"id": 2, "token": " B", "logprob": -1.9},
            {"id": 3, "token": " hola", "logprob": -2.5},
        ],
    }]}
    probs = jev_mod._probabilidades(respuesta, ["A", "B", "C"])
    assert probs is not None and set(probs) == {"A", "B"}
    assert probs["A"] > probs["B"]
    assert abs(sum(probs.values()) - 1.0) < 1e-9


def test_parsea_el_formato_antiguo_con_probs() -> None:
    from app.api import jev as jev_mod
    respuesta = {"completion_probabilities": [{"content": " B", "probs": [
        {"tok_str": " B", "prob": 0.7}, {"tok_str": " A", "prob": 0.2},
    ]}]}
    probs = jev_mod._probabilidades(respuesta, ["A", "B"])
    assert probs is not None and probs["B"] > probs["A"]
