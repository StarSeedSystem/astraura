# (Ola 284 · AS8 · 2026-09-08) Las plantillas deterministas dejan de secuestrar
# el chat.
#
# Contexto (Mac de Alex, medido 04:08 UTC): al preguntar «Hola Astraura. En dos
# frases: quién eres y qué motor te sirve ahora.», el chat respondió en 4 s con
# un bloque de identidad prefabricado en vez de ceder el motor 1.58. Causa:
# `dispara_plantilla` devolvía True si «quién eres» aparecía como SUBcadena en
# cualquier prompt corto, aunque la pregunta pidiera además otra cosa. La ola
# 284 la vuelve EXIGENTE: solo se dispara cuando la pregunta ES esa pregunta
# (la frase debe cubrir ≥ 60 % de las palabras tras normalizar).
#
# Estas pruebas no tocan red ni procesos: importan solo de `app.agents.reasoner`.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.agents.reasoner import (  # noqa: E402
    cobertura_frase,
    dispara_plantilla,
    normalizar_prompt,
)


def test_pregunta_quien_eres_exacta() -> None:
    """«¿quién eres?» es la pregunta identitaria pura: debe disparar. (Ola 284 ·
    AS8)"""
    assert dispara_plantilla("¿quién eres?", ["quién eres", "quien eres"]) is True


def test_pregunta_quien_eres_sin_tilde() -> None:
    """«quien eres» sin tilde normaliza igual y dispara. (Ola 284 · AS8)"""
    assert dispara_plantilla("quien eres", ["quién eres", "quien eres"]) is True


def test_pregunta_compuesta_no_secuestra() -> None:
    """Pedir además otra cosa («y qué motor te sirve») NO debe disparar la
    plantilla: la pregunta no es solo identidad. Es el caso que medimos en la
    Mac y el motivo de esta ola. (Ola 284 · AS8)"""
    assert dispara_plantilla(
        "Hola Astraura. En dos frases: quién eres y qué motor te sirve ahora.",
        ["quién eres", "quien eres", "cuantas personalidades"],
    ) is False


def test_pregunta_larga_no_secuestra() -> None:
    """Aunque contenga «quién eres», una pregunta que pide además el
    enrutamiento, las personalidades y la malla no es identidad pura. (Ola 284 ·
    AS8)"""
    assert dispara_plantilla(
        "cuéntame quién eres y explícame el enrutamiento de modelos, las personalidades y la malla",
        ["quién eres", "quien eres", "cuantas personalidades"],
    ) is False


def test_pregunta_personalidades_exacta() -> None:
    """«¿cuántas personalidades tienes?» es una pregunta concreta y dispara su
    plantilla (frase cubre el 67 % de las palabras). (Ola 284 · AS8)"""
    assert dispara_plantilla(
        "¿cuántas personalidades tienes?",
        ["quien eres", "cuántas personalidades", "cuantas personalidades"],
    ) is True


def test_prompt_de_900_caracteres_no_dispara() -> None:
    """Un prompt muy largo que contenga «quién eres» supera MAX_CHARS_PLANTILLA
    tras normalizar: nunca dispara una plantilla. (Ola 284 · AS8)"""
    prompt = "quién eres " * 100  # > 900 caracteres
    assert len(prompt) > 900
    assert dispara_plantilla(prompt, ["quién eres", "quien eres"]) is False


def test_normalizar_quita_saludo_signos_y_tildes() -> None:
    """normalizar_prompt no deja saludos ni signos: «¡Hola Astraura! ¿Quién
    eres?» queda en «quien eres». (Ola 284 · AS8)"""
    assert normalizar_prompt("¡Hola Astraura! ¿Quién eres?") == "quien eres"


def test_cobertura_frase_razonable() -> None:
    """La cobertura es palabras de la frase / palabras del prompt: 2 de 3 en un
    ejemplo corto. (Ola 284 · AS8)"""
    assert cobertura_frase("quien eres tu", "quién eres") == 2 / 3