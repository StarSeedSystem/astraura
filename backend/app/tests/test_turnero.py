"""Pruebas de `app.core.turnero` (admisión y cola del BitNet compartido, 2026-09-26).

Sin procesos ni red: se parchea `psutil.virtual_memory` cuando hace falta forzar
un escenario de RAM y se manipulan directamente los globales del módulo (mismo
estilo «caja blanca» que `test_bitnet_turno.py`/`test_cognicion_presupuesto.py`).
Cada test resetea el estado del turnero en un fixture `autouse`, porque el
módulo es un singleton de proceso compartido por todos los tests del archivo.
"""

import asyncio
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import psutil
import pytest

from app.core import turnero


def _correr(coro):
    """Bucle propio: `asyncio.run` deja el hilo sin bucle y rompe tests que
    reutilizan `get_event_loop()` después en la misma sesión de pytest."""
    bucle = asyncio.new_event_loop()
    try:
        return bucle.run_until_complete(coro)
    finally:
        bucle.close()


@pytest.fixture(autouse=True)
def _turnero_limpio(monkeypatch: Any) -> None:
    """Resetea el singleton de proceso y fija una configuración determinista
    (sin depender de la RAM/hardware real de quien ejecute los tests)."""
    turnero._activos["chat"] = 0
    turnero._activos["jev"] = 0
    turnero._cola.clear()
    turnero._tenencias.clear()
    turnero._liberadas_por_tiempo = 0
    turnero._media_s = turnero._MEDIA_INICIAL_S
    turnero._rechazadas = 0
    turnero._servidas = 0
    monkeypatch.setenv("ASTRAURA_CHAT_MAX_ACTIVOS", "1")
    monkeypatch.setenv("ASTRAURA_CHAT_MAX_COLA", "2")
    monkeypatch.setenv("ASTRAURA_CHAT_MAX_ESPERA_S", "90")
    monkeypatch.setenv("ASTRAURA_RAM_MIN_MB", "250")
    # RAM real de sobra por defecto: cada test que quiera el rechazo por
    # memoria parchea `psutil.virtual_memory` explícitamente.
    monkeypatch.setattr(psutil, "virtual_memory",
                         lambda: type("VM", (), {"available": 4096 * 1024 * 1024})())
    yield


# ─────────────────────────────────── admisión inmediata ───────────────────────────────────

def test_admision_inmediata_con_hueco_libre() -> None:
    async def ir() -> None:
        async with turnero.turno(tipo="chat"):
            estado = turnero.estado()
            assert estado["activos"] == 1
            assert estado["en_cola"] == 0
        assert turnero.estado()["activos"] == 0
        assert turnero.estado()["servidas"] == 1

    _correr(ir())


# ────────────────────────────────────────── cola ──────────────────────────────────────────

def test_segundo_turno_se_encola_mientras_el_primero_ocupa_el_hueco() -> None:
    """Con `max_activos=1`, un segundo turno mientras el primero sigue dentro
    se ENCOLA (no rechaza): debe entrar en cuanto el primero libera el hueco."""
    orden: list = []

    async def largo() -> None:
        async with turnero.turno(tipo="chat"):
            orden.append("largo-dentro")
            await asyncio.sleep(0.15)
        orden.append("largo-fuera")

    async def corto() -> None:
        await asyncio.sleep(0.02)  # asegura que "largo" ya tiene el hueco
        assert turnero.estado()["activos"] == 1
        async with turnero.turno(tipo="chat"):
            orden.append("corto-dentro")

    async def ambos() -> None:
        await asyncio.gather(largo(), corto())

    _correr(ambos())
    assert orden == ["largo-dentro", "largo-fuera", "corto-dentro"]
    assert turnero.estado()["activos"] == 0
    assert turnero.estado()["en_cola"] == 0
    assert turnero.estado()["servidas"] == 2


# ──────────────────────────────────── rechazo por cola llena ──────────────────────────────

def test_rechazo_por_cola_llena() -> None:
    """Con `max_cola=2`: 1 activo + 2 en cola llenan todo; el cuarto turno
    debe rechazarse con `motivo="cola"` SIN tocar la cola."""
    # Media baja para que la rejection sea por CUPO (cola llena), no por
    # estimación (con la media inicial de 45 s, tres huecos de peso ya
    # superarían `max_espera_s=90` y el segundo encolado se rechazaría antes
    # de llegar al escenario que este test quiere ejercitar).
    turnero._media_s = 1.0

    async def ocupa_y_manten(bandera_lista: "asyncio.Event") -> None:
        async with turnero.turno(tipo="chat"):
            bandera_lista.set()
            await asyncio.sleep(0.3)

    async def espera_en_cola() -> None:
        async with turnero.turno(tipo="chat"):
            await asyncio.sleep(0.05)

    async def prueba() -> None:
        listo = asyncio.Event()
        t_activo = asyncio.ensure_future(ocupa_y_manten(listo))
        await listo.wait()
        t_cola1 = asyncio.ensure_future(espera_en_cola())
        t_cola2 = asyncio.ensure_future(espera_en_cola())
        await asyncio.sleep(0.02)  # deja que ambos entren en la cola
        assert turnero.estado()["en_cola"] == 2

        with pytest.raises(turnero.Ocupado) as exc:
            async with turnero.turno(tipo="chat"):
                pass
        assert exc.value.motivo == "cola"
        assert exc.value.en_cola == 2

        await asyncio.gather(t_activo, t_cola1, t_cola2)

    _correr(prueba())
    assert turnero.estado()["rechazadas"] == 1


def test_rechazo_por_espera_estimada_demasiado_larga() -> None:
    """Aunque quepa en `max_cola`, si la media móvil hace que la espera
    estimada supere `max_espera_s`, se rechaza igual (motivo «cola»)."""
    turnero._media_s = 1000.0  # una media disparatada fuerza la estimación por encima del techo

    async def prueba() -> None:
        async with turnero.turno(tipo="chat"):
            with pytest.raises(turnero.Ocupado) as exc:
                async with turnero.turno(tipo="chat"):
                    pass
            assert exc.value.motivo == "cola"
            assert exc.value.espera_estimada_s > turnero.max_espera_s()

    _correr(prueba())


# ──────────────────────────────────── rechazo por memoria ──────────────────────────────────

def test_rechazo_por_memoria(monkeypatch: Any) -> None:
    """RAM disponible por debajo del suelo → `Ocupado(motivo="memoria")` de
    inmediato, incluso con el hueco completamente libre."""
    monkeypatch.setattr(psutil, "virtual_memory",
                         lambda: type("VM", (), {"available": 50 * 1024 * 1024})())  # 50 MB < 250 MB

    async def ir() -> None:
        with pytest.raises(turnero.Ocupado) as exc:
            async with turnero.turno(tipo="chat"):
                pass
        assert exc.value.motivo == "memoria"

    _correr(ir())
    assert turnero.estado()["activos"] == 0  # nunca llegó a ocupar el hueco
    assert turnero.estado()["rechazadas"] == 1


# ───────────────────────────────── cancelación limpia (desconexión) ────────────────────────

def test_cancelacion_en_cola_no_deja_hueco_fantasma() -> None:
    """Un turno esperando en cola cuya tarea se cancela (cliente desconectado)
    se retira: no queda en `_cola` ni cuenta como activo, y el SIGUIENTE turno
    que llega puede admitirse con normalidad."""

    async def ocupa(bandera_lista: "asyncio.Event", soltar: "asyncio.Event") -> None:
        async with turnero.turno(tipo="chat"):
            bandera_lista.set()
            await soltar.wait()

    async def espera_y_se_cancela(bandera_espera: "asyncio.Event") -> None:
        async with turnero.turno(tipo="chat"):
            bandera_espera.set()  # nunca debería llegar aquí: se cancela antes

    async def prueba() -> None:
        listo = asyncio.Event()
        soltar = asyncio.Event()
        t_activo = asyncio.ensure_future(ocupa(listo, soltar))
        await listo.wait()

        entro = asyncio.Event()
        t_cancelado = asyncio.ensure_future(espera_y_se_cancela(entro))
        await asyncio.sleep(0.02)
        assert turnero.estado()["en_cola"] == 1

        t_cancelado.cancel()
        with pytest.raises(asyncio.CancelledError):
            await t_cancelado
        assert not entro.is_set()
        assert turnero.estado()["en_cola"] == 0  # se retiró limpio

        soltar.set()
        await t_activo

    _correr(prueba())

    # El turnero queda operativo: un turno nuevo se admite sin rastro del cancelado.
    async def turno_final() -> None:
        async with turnero.turno(tipo="chat"):
            assert turnero.estado()["activos"] == 1

    _correr(turno_final())
    assert turnero.estado()["activos"] == 0


# ───────────────────────────────────── media y estimación ──────────────────────────────────

def test_media_movil_y_estimacion_de_espera() -> None:
    assert turnero._media_s == turnero._MEDIA_INICIAL_S

    async def turno_de(duracion: float) -> None:
        async with turnero.turno(tipo="chat"):
            await asyncio.sleep(duracion)

    _correr(turno_de(0.05))
    media_tras_uno = turnero._media_s
    # EMA: se acerca a la duración observada sin igualarla de golpe.
    assert media_tras_uno < turnero._MEDIA_INICIAL_S
    assert media_tras_uno > 0.05

    esperado = (1 - turnero._ALPHA_MEDIA) * turnero._MEDIA_INICIAL_S + turnero._ALPHA_MEDIA * max(0.1, 0.05)
    assert media_tras_uno == pytest.approx(esperado, abs=1e-6)

    # Con un turno activo (peso 1) y ninguno en cola, la estimación para un
    # chat nuevo es `(1) * media / max_activos` = la media misma (max_activos=1).
    async def estimar_con_uno_activo() -> None:
        async with turnero.turno(tipo="chat"):
            return turnero._espera_estimada_s(turnero._peso("chat"))

    estimado = _correr(estimar_con_uno_activo())
    assert estimado == pytest.approx(2 * media_tras_uno, abs=1e-6)  # activo (1) + este (1) = 2


def test_jev_no_alimenta_la_media() -> None:
    """Un turno Jev (rápido) NO debe arrastrar la media hacia abajo: solo los
    turnos «chat» la actualizan."""
    media_antes = turnero._media_s

    async def jev_rapido() -> None:
        async with turnero.turno(tipo="jev"):
            await asyncio.sleep(0.001)

    _correr(jev_rapido())
    assert turnero._media_s == media_antes


# ────────────────────────────────────── prioridad de Jev ───────────────────────────────────

def test_jev_adelanta_a_los_chats_en_cola(monkeypatch: Any) -> None:
    """Con el hueco ocupado, dos chats ya esperando y un Jev que llega
    DESPUÉS: el Jev debe entrar antes que ambos chats (pero nunca antes que
    otro Jev ya en cola)."""
    turnero._media_s = 1.0  # media baja: con la inicial (45 s) el 2º chat en cola se rechazaría por estimación
    # Cupo de sobra para 3 puestos: el límite de `max_cola` no es lo que este
    # test ejercita (eso lo cubre `test_rechazo_por_cola_llena`); aquí importa
    # el ORDEN dentro de la cola, con sitio para los tres.
    monkeypatch.setenv("ASTRAURA_CHAT_MAX_COLA", "3")
    orden: list = []

    async def ocupa(bandera_lista: "asyncio.Event", soltar: "asyncio.Event") -> None:
        async with turnero.turno(tipo="chat"):
            bandera_lista.set()
            await soltar.wait()

    async def espera(tipo: str, nombre: str) -> None:
        async with turnero.turno(tipo=tipo):
            orden.append(nombre)

    async def prueba() -> None:
        listo = asyncio.Event()
        soltar = asyncio.Event()
        t_activo = asyncio.ensure_future(ocupa(listo, soltar))
        await listo.wait()

        t_chat1 = asyncio.ensure_future(espera("chat", "chat1"))
        await asyncio.sleep(0.01)
        t_chat2 = asyncio.ensure_future(espera("chat", "chat2"))
        await asyncio.sleep(0.01)
        t_jev = asyncio.ensure_future(espera("jev", "jev"))
        await asyncio.sleep(0.01)
        assert [w.tipo for w in turnero._cola] == ["jev", "chat", "chat"]

        soltar.set()
        await asyncio.gather(t_activo, t_chat1, t_chat2, t_jev)

    _correr(prueba())
    assert orden == ["jev", "chat1", "chat2"]


def test_jev_pesa_una_fraccion_de_un_chat_en_la_estimacion() -> None:
    turnero._media_s = 10.0

    async def con_jev_activo() -> float:
        async with turnero.turno(tipo="jev"):
            return turnero._espera_estimada_s(turnero._peso("chat"))

    # Un Jev activo (peso 0,1) + un chat nuevo (peso 1) = 1,1 de carga total.
    estimado = _correr(con_jev_activo())
    assert estimado == pytest.approx(1.1 * 10.0, abs=1e-6)


def test_un_hueco_retenido_de_mas_se_recupera_para_la_cola(monkeypatch: Any) -> None:
    """Salvaguarda: un turno que nunca suelta el hueco (p. ej. un StreamingResponse
    cuyo generador nunca llegó a iterar) no puede dejar el chat rechazado para
    siempre: pasado ASTRAURA_TURNO_MAX_S, la siguiente admisión lo recupera."""
    monkeypatch.setenv("ASTRAURA_TURNO_MAX_S", "30")

    async def escenario() -> None:
        cm = turnero.turno(tipo="chat")
        await cm.__aenter__()  # hueco tomado y nunca devuelto
        assert turnero.estado()["activos"] == 1
        # Se envejece la tenencia más allá del máximo.
        for clave, (tipo, t0) in list(turnero._tenencias.items()):
            turnero._tenencias[clave] = (tipo, t0 - 31)
        async with turnero.turno(tipo="chat"):
            assert turnero.estado()["activos"] == 1
        assert turnero.estado()["liberadas_por_tiempo"] == 1
        # El __aexit__ tardío del primero no resta el hueco de nadie.
        await cm.__aexit__(None, None, None)
        assert turnero.estado()["activos"] == 0

    _correr(escenario())
