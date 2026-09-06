# (Ola 256 · 2026-09-06) Pruebas del BitNetCppManager en modo compartido.
#
# Por qué: en el Mac de Alex (8 GB) se observó en /tmp/astraura_launchd.log que
# `ensure_server(..., "background")` y `ensure_server(..., "interactive")`
# lanzaban DOS llama-server sobre el MISMO puerto 8790 (pids 23834 y 23837),
# porque `self._servers` tenía una entrada por perfil y el flag `_launching`
# del primer lanzamiento era invisible para el segundo. La corrección es
# `_clave_servidor()`: en modo compartido ambos perfiles deben mapear a la
# MISMA clave ("interactive") y al MISMO puerto; en modo separado, a claves y
# puertos distintos (background = puerto base + 1).
#
# Estas pruebas NO lanzan procesos ni tocan la red: ejercitan los métodos como
# funciones no ligadas sobre un objeto ligero, para no construir el manager
# real (que sondea puertos, arranca el hilo supervisor y lee settings).

import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Any

# Asegura que `backend/` está en sys.path para importar `app.*` (mismo patrón
# que test_economic_router_local.py).
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.engine.bitnet_cpp_manager import BitNetCppManager


def _manager_falso(compartido: bool, puerto: int = 8790) -> Any:
    """Objeto mínimo con exactamente lo que `_clave_servidor` y `_port_for`
    necesitan: la decisión de compartir y el puerto base. Nada más."""
    return SimpleNamespace(
        _servidor_compartido=lambda: compartido,
        server_port=puerto,
    )


def test_clave_compartida_es_unica_para_ambos_perfiles() -> None:
    """En modo compartido, background e interactive comparten MISMA clave:
    mismo proc, mismo flag `_launching`, misma base (sin doble lanzamiento)."""
    obj = _manager_falso(compartido=True)
    clave_bg = BitNetCppManager._clave_servidor(obj, "background")
    clave_it = BitNetCppManager._clave_servidor(obj, "interactive")
    assert clave_bg == "interactive"
    assert clave_it == "interactive"
    assert clave_bg == clave_it


def test_puerto_compartido_es_el_mismo_para_ambos_perfiles() -> None:
    """En modo compartido los dos perfiles hablan con el MISMO puerto."""
    obj = _manager_falso(compartido=True, puerto=8790)
    assert BitNetCppManager._port_for(obj, "background") == 8790
    assert BitNetCppManager._port_for(obj, "interactive") == 8790
    assert BitNetCppManager._port_for(obj, "background") == BitNetCppManager._port_for(obj, "interactive")


def test_modo_separado_claves_distintas() -> None:
    """Sin servidor compartido, cada perfil tiene su propia entrada."""
    obj = _manager_falso(compartido=False)
    clave_bg = BitNetCppManager._clave_servidor(obj, "background")
    clave_it = BitNetCppManager._clave_servidor(obj, "interactive")
    assert clave_bg == "background"
    assert clave_it == "interactive"
    assert clave_bg != clave_it


def test_modo_separado_puertos_distintos() -> None:
    """Sin servidor compartido, background va un puerto por encima del base."""
    obj = _manager_falso(compartido=False, puerto=8790)
    puerto_it = BitNetCppManager._port_for(obj, "interactive")
    puerto_bg = BitNetCppManager._port_for(obj, "background")
    assert puerto_it == 8790
    assert puerto_bg == puerto_it + 1


# ── (Ola 256 · 2026-09-06) -ub/-b contra el SIGSEGV de BLAS ──────────────────
# En la Mac de Alex el llama-server nativo moría con SIGSEGV en
# `dequantize_row_i2_s` ← `ggml_backend_blas_mul_mat` (25 crashes ese día) con
# cualquier prompt de ≥ 32 tokens, porque el backend BLAS solo se activa con
# lotes ≥ 32 y no soporta dequantizar i2_s. El manager debe lanzar el server
# con `-ub`/`-b` = 24 (< 32) por defecto, configurable con ASTRAURA_BITNET_UBATCH.


def test_ubatch_por_defecto_es_24(monkeypatch: Any) -> None:
    """Sin variable de entorno, el micro-lote físico queda en 24 (< 32, bajo el
    umbral del backend BLAS que segfaulteaba)."""
    monkeypatch.delenv("ASTRAURA_BITNET_UBATCH", raising=False)
    mgr = BitNetCppManager()
    assert mgr.server_ubatch == 24


def test_ubatch_respeta_variable_de_entorno(monkeypatch: Any) -> None:
    """ASTRAURA_BITNET_UBATCH tiene prioridad (por si algún día se compila
    BitNet sin BLAS y se puede volver al lote grande)."""
    monkeypatch.setenv("ASTRAURA_BITNET_UBATCH", "48")
    mgr = BitNetCppManager()
    assert mgr.server_ubatch == 48


def test_argumentos_servidor_llevan_ub_y_b(monkeypatch: Any) -> None:
    """La lista de argumentos que alimenta el Popen de `ensure_server` debe
    incluir `-ub 24` y `-b 24` (o el valor del entorno), para que ningún lote
    físico alcance el umbral BLAS de 32 tokens. No lanza procesos."""
    monkeypatch.delenv("ASTRAURA_BITNET_UBATCH", raising=False)
    mgr = BitNetCppManager()
    cmd = BitNetCppManager._argumentos_servidor(
        mgr, binary=Path("llama-server"), model_path="modelo.gguf", port=8790, threads=2
    )
    assert "-ub" in cmd and "-b" in cmd
    valor = str(mgr.server_ubatch)
    assert cmd[cmd.index("-ub") + 1] == valor
    assert cmd[cmd.index("-b") + 1] == valor
