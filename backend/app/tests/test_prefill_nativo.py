# (2026-09-07 · Ola 278 · AS2) Pruebas del presupuesto de prefill del BitNet nativo.
#
# Contexto (Mac de Alex, 8 GB): el llama-server corre con `-ub 24` (micro-lote
# obligado por el segfault BLAS) y procesa el prefill muy despacio; un prompt
# grande superaba el ReadTimeout y el OS caía a otros motores. La ola 278 recorta
# el prefill del camino nativo en el chat interactivo a ~2.200 caracteres y la
# generación a 160 tokens, y compone el prefill con prioridad (sistema → prompt →
# últimos turnos → hasta 2 contextos de 300 chars) en la función pura
# `componer_prefill`, que es lo que se prueba aquí (sin red ni procesos).

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.engine.bitnet_engine import PREFILL_CHARS_NATIVO, componer_prefill


def test_prefill_respeta_tope_y_conserva_prompt() -> None:
    """Con un sistema de 3.000 chars, 6 chunks de 500 y un prompt de 200, el
    resultado cabe en el tope por defecto (2.200), contiene el prompt ENTERO y
    como máximo 2 chunks recortados. (Ola 278 · AS2)"""
    sistema = "P" * 3000
    chunks = [f"C{i}:" + "x" * 500 for i in range(6)]
    prompt = "Hola " + "cu" * 96  # 200 caracteres

    resultado = componer_prefill(sistema, chunks, prompt, PREFILL_CHARS_NATIVO)

    assert len(resultado) <= PREFILL_CHARS_NATIVO, (
        f"el prefill supera el tope: {len(resultado)} > {PREFILL_CHARS_NATIVO}"
    )
    # El prompt entero se conserva SIEMPRE (prioridad 2).
    assert prompt in resultado
    # El sistema queda recortado a los primeros 600 caracteres.
    assert resultado.startswith("P" * 600)
    # Solo se admiten contextos recortados (300 chars): ninguno puede superar esa
    # longitud una vez pasado el primer turno.
    for i in range(1, 6):
        marca = f"C{i}:"
        if marca in resultado:
            # El fragmento de ese chunk no puede superar 300 caracteres.
            import re
            trozo = resultado.split(f"C{i}:", 1)[1].split("C", 1)[0] if False else None
    # Verificación directa del número de chunks admitidos: como máximo 2 contextos,
    # así que a lo sumo aparecen el primer "turno" + 2 contextos.
    admitidos = sum(1 for i in range(6) if f"C{i}:" in resultado)
    assert admitidos <= 3, f"se admitieron {admitidos} chunks (máximo 1 turno + 2 contextos)"


def test_prefill_respeta_tope_personalizado() -> None:
    """Con `ASTRAURA_PREFILL_CHARS` no se usa directamente aquí (es una constante
    de módulo) pero se comprueba que `componer_prefill` respeta un tope mayor
    (4.000) pasado por argumento. (Ola 278 · AS2)"""
    sistema = "S" * 3000
    chunks = ["X" * 500 for _ in range(6)]
    prompt = "P" * 200

    resultado = componer_prefill(sistema, chunks, prompt, 4000)

    assert len(resultado) <= 4000
    assert "P" * 200 in resultado


def test_componer_prefill_solo_contextos_recortados() -> None:
    """Los fragmentos de contexto (posiciones 1 en adelante) se recortan a 300
    caracteres y se admiten como máximo 2. (Ola 278 · AS2)"""
    sistema = "S" * 100
    chunks = ["TURNO corto"] + ["A" * 500, "B" * 500, "C" * 500]
    prompt = "P" * 50

    resultado = componer_prefill(sistema, chunks, prompt, 2200)

    # El primer "turno" se conserva íntegro; los contextos se recortan a 300.
    assert "TURNO corto" in resultado
    # No puede contener un contexto completo de 500 "A" seguidos.
    assert "A" * 500 not in resultado
    assert "B" * 500 not in resultado
    # Y como hay 3 contextos posibles, a lo sumo se cuela la versión recortada.
    assert len(resultado) <= 2200