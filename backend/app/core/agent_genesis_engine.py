"""
agent_genesis_engine.py — Sección "Génesis" del backend Astraura (StarSeed OS).

Implementa el contrato ÚNICO de:
    /Users/alex/Documents/starseed-os-main/src/lib/astraura/genesis-types.ts
    /Users/alex/Documents/starseed-os-main/src/lib/astraura/genesis-dna.ts
leído también `genesis-client.ts` (cómo lo consume la UI de verdad, no solo
los tipos) y `genesis-dna.fixtures.json` (6 vectores de referencia — los 6
pasan; ver el arnés `verificar_fixtures_adn` más abajo).

Nota histórica: la primera versión de este fichero se escribió cuando esos
tres ficheros NO existían en este repo (se verificó exhaustivamente — find,
grep, git log --all — los tres daban 0 resultados). Esa versión documentó el
bloqueo en vez de inventar un contrato falso, construyó lo que la prosa del
encargo sí especificaba sin ambigüedad, y quedó reemplazada por ESTA en
cuanto el contrato realmente apareció en disco. Si algo de aquí no cuadra
con `genesis-types.ts`, ese fichero manda — es "la frontera... si algo no
está aquí, no existe para ninguno de los dos lados" (cita textual suya).

SOBRE DE RESPUESTA — dos formas, no una (confirmado en genesis-client.ts):
  · Los GET de listado devuelven un ARRAY DESNUDO (`SerListado[]`, etc.),
    NUNCA envuelto en `{ok,...}` — `callList()`/`asGenesisList()` así lo
    exigen (una forma inesperada se degrada a `[]` en el cliente).
  · Las mutaciones devuelven `{ok, <campo>, error?}` — con `ok`, NO
    `success` (divergencia deliberada del resto de este backend, que usa
    `success`; aquí manda genesis-types.ts, no la convención del vecino).
  · UN CASO PARTICULAR: `POST /modelos/verificar` devuelve el propio
    `VerificacionModelo` a secas (ni array ni {ok,...}) — así lo llama
    `verifyGenesisModelo()` en el cliente, sin `unwrapEnvelope`.
  · 404 está RESERVADO por el cliente para "esta ruta no existe todavía"
    (mensaje especial: "el backend no tiene Génesis de Seres todavía").
    Por eso un "ese id no existe" NUNCA es 404 aquí: es HTTP 200 con
    `{"ok": false, "error": "..."}` (o 400 para `GET /seres/{id}`, la única
    ruta cuya respuesta de éxito es un objeto desnudo sin sitio para "ok").

INTEGRACIÓN ADITIVA CON LA BÓVEDA (agent_vault_engine / agents_vault.json):
Un `Ser` PROYECTA un agente de la bóveda, no lo sustituye. Los campos que ya
significan lo mismo en ambos mundos se REUTILIZAN sin duplicar — no se copian
en paralelo, porque una copia paralela diverge con el tiempo:
  · imaginacion.{activa,frecuencia,nivelPermiso}  ←→  imagination_enabled /
    imagination_frequency / imagination_permission_level (YA existían).
  · recursos.{concurrencia,cpuPorcentaje,ramMb}   ←→  concurrency /
    cpu_quota_percent / ram_limit_mb (YA existían).
  · personalidades / cerebros                     ←→  used_personalities /
    linked_cerebros (mismos datos, claves camelCase en la proyección).
  · vínculos                                       ←→  interconnections
    (YA existía; ver sección VÍNCULOS).
Lo genuinamente NUEVO (adn, soberanía, enrutado, linaje, experiencia,
esencia, habilidades, herramientas, reglas, comunidades, espacioHogarId) se
guarda en claves `genesis_*` propias sobre el MISMO diccionario de agente —
aditivo de verdad: un backend viejo que solo lea `name`/`role`/etc. sigue
funcionando exactamente igual.

Comunidades, espacios y propuestas no tenían hogar previo en la bóveda →
viven en su propio fichero `data/genesis_store.json` (mismo patrón que ya
usa este backend para separar `agent_apis.json` de `agents_vault.json`):
`AgentVaultEngine._save_agents()` reescribe `agents_vault.json` con SOLO la
clave "agents" en cada guardado, así que meterlas ahí dentro las borraría en
silencio en cualquier guardado por la vía vieja `/api/agents/save`.

GAPS DEL CONTRATO QUE NO ME INVENTÉ (para que decidas, no los borré a
ciegas, los dejé como función interna sin ruta pública):
  1. `verificar_soberania()` — la comprobación real de dominio/exploración/
     límites duros para una ruta. El contrato define la FORMA (`Soberania`)
     pero no un endpoint para preguntarlo; tampoco hay ningún endpoint
     genérico de "escribir en una ruta" donde enchufar la comprobación
     desde dentro. Función lista, sin ruta pública.
  2. `crear_propuesta()` — el contrato tiene `GET /propuestas` y
     `POST /propuestas/{id}/aceptar|descartar`, pero NINGÚN endpoint (ni
     disparador automático definido) para CREAR una propuesta. Sin esto,
     aceptar/descartar no tienen qué aceptar o descartar. Función lista,
     sin ruta pública.
  3. `unirse_a_comunidad()` — `Comunidad.miembros` existe pero no hay
     `PATCH /comunidades/{id}` ni endpoint de membresía en el contrato.
     Función lista, sin ruta pública.
"""
from __future__ import annotations

import os
import re
import json
import time
import math
import struct
import secrets
from pathlib import Path
from typing import Any, Dict, List, Optional, Literal

import httpx
from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .agent_vault_engine import agent_vault_engine
from .config import settings
from . import cognition

# ═══════════════════════════════════════════════════════════════════════
# OLA 2 — imports defensivos de los motores REALES que los 8 endpoints
# nuevos consultan (bots predeterminados, cerebros propios, internet y
# herramientas, oficina). Cada uno envuelto en try/except: "degradación
# elegante" (ver REGLAS del encargo) significa literalmente que un fallo de
# import de un vecino (p.ej. cerebros_manager, que ya sabemos que puede
# tropezar con R2) NUNCA debe tumbar la carga de este router -- y como este
# router se importa desde app/main.py al arrancar, tumbarlo aquí tumbaría
# el arranque ENTERO del backend, no solo esta sección. Todos estos módulos
# YA los importa app/main.py sin envoltorio, así que en el proceso real
# nunca deberían fallar aquí (ya están en sys.modules) -- esto es cinturón
# y tirantes, no el camino esperado.
try:
    from .intuitive_imagination_engine import (
        intuitive_imagination_engine,
        DREAM_PROCESS_TYPES,
        _AGENT_TO_PERSONALITY_ID,
        _AGENT_TO_REGISTRY_ID,
    )
except Exception as _e:
    print(f"[GenesisEngine] intuitive_imagination_engine no disponible ({_e}); bots predeterminados y oficina quedan en blanco, no inventados.")
    intuitive_imagination_engine = None
    DREAM_PROCESS_TYPES = []
    _AGENT_TO_PERSONALITY_ID = {}
    _AGENT_TO_REGISTRY_ID = {}
try:
    from ..cerebros.cerebros_manager import cerebros_manager
except Exception as _e:
    print(f"[GenesisEngine] cerebros_manager no disponible ({_e}); cerebros propios sincronizables se marcan 'fallo', nunca 'ok'.")
    cerebros_manager = None
try:
    from .universal_device_access import universal_device_access
except Exception:
    universal_device_access = None
try:
    from ..memory.device_sync import device_sync
except Exception:
    device_sync = None
try:
    from ..tools.terminal_tool import terminal_tool
except Exception:
    terminal_tool = None
try:
    from ..tools.system_explorer import system_explorer
except Exception:
    system_explorer = None
try:
    from ..tools.system_senses import system_senses
except Exception:
    system_senses = None
try:
    from .privacy_manager import is_air_gapped
except Exception:
    def is_air_gapped() -> bool:  # type: ignore
        return False

# (OLA 2) Raíz del repo del OS -- MISMO patrón ya usado en cerebros_manager.py
# y auto_discovery.py (HOME/Documents/starseed-os-main); no se inventa una
# ruta nueva. Solo lectura: este módulo nunca escribe nada dentro del OS.
_OS_REPO_ROOT = Path.home() / "Documents" / "starseed-os-main"

router = APIRouter(prefix="/api/genesis", tags=["genesis"])


# ═══════════════════════════════════════════════════════════════════════
# 0. ADN — puerto EXACTO de genesis-dna.ts (verificado: 6/6 fixtures)
# ═══════════════════════════════════════════════════════════════════════

PHI = 1.618033988749895
GOLDEN_ANGLE_DEG = 137.50776405003785

FRECUENCIA_POR_SOLIDO: Dict[str, int] = {
    "esfera": 432, "octaedro": 528, "cubo": 639,
    "tetraedro": 741, "icosaedro": 852, "dodecaedro": 963,
}
ARQUETIPO_A_SOLIDO: Dict[str, str] = {
    "aurora": "dodecaedro", "hermione": "icosaedro", "atenea": "octaedro", "athena": "octaedro",
    "hephaestus": "cubo", "hefesto": "cubo", "hermes": "tetraedro", "architectus": "cubo",
    "mnemosyne": "esfera", "oracle": "dodecaedro", "oraculo": "dodecaedro",
}
SOLIDOS: List[str] = ["tetraedro", "cubo", "octaedro", "dodecaedro", "icosaedro", "esfera"]

FNV_OFFSET_BASIS_32 = 0x811C9DC5


def _unidades_utf16(texto: str) -> List[int]:
    """Unidades de código UTF-16 de `texto`, como las vería `charCodeAt` de
    JS (Python itera code points; para astrales (>0xFFFF) hay que partir en
    par suplente a mano — el fixture 'Ñandú áureo ✦' ejercita BMP, no
    astrales, pero esto es correcto también para esos casos)."""
    crudo = texto.encode("utf-16-le", "surrogatepass")
    return list(struct.unpack(f"<{len(crudo) // 2}H", crudo))


def fnv1a_32(texto: str) -> int:
    """FNV-1a 32-bit sin signo, sobre `charCodeAt(i) & 0xff` (UTF-16, NO
    UTF-8), con la multiplicación por el primo desplegada en sumas y
    desplazamientos — igual que `genesis-dna.ts`. Enmascarar con
    `& 0xFFFFFFFF` en cada paso (en vez del `>>> 0` diferido de JS) da el
    mismo patrón de bits final por aritmética modular: `(a+b) mod 2^32 ==
    ((a mod 2^32)+(b mod 2^32)) mod 2^32`."""
    h = FNV_OFFSET_BASIS_32
    for unidad in _unidades_utf16(texto):
        h ^= (unidad & 0xFF)
        h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) & 0xFFFFFFFF
    return h & 0xFFFFFFFF


def _tramo(semilla: int, indice: int) -> float:
    """Puerto EXACTO de `tramo()`: mezcla xorshift sobre la semilla. Todo en
    enteros de 32 bits sin signo — Python no desborda, así que se enmascara
    a mano en cada paso donde JS lo haría con `>>> 0` o por truncamiento
    implícito de `<<`."""
    x = (semilla ^ ((0x9E3779B9 * (indice + 1)) & 0xFFFFFFFF)) & 0xFFFFFFFF
    x ^= (x << 13) & 0xFFFFFFFF
    x &= 0xFFFFFFFF
    x ^= (x >> 17)
    x &= 0xFFFFFFFF
    x ^= (x << 5) & 0xFFFFFFFF
    x &= 0xFFFFFFFF
    return x / 4294967296.0


_HEX_RE = re.compile(r"^#?([0-9a-fA-F]{6})$")


def matiz_desde_hex(hexadecimal: str) -> Optional[float]:
    """#rrggbb → tono en grados (0–360). Puerto exacto de `matizDesdeHex`.

    OJO: usa `math.fmod`, NO el operador `%` de Python, para el caso
    `max === r`: `(g-b)/d` puede ser negativo, y el `%` de JS conserva el
    signo del DIVIDENDO (como fmod de C) mientras que el `%` de Python
    conserva el signo del DIVISOR — con un divisor positivo (6), Python
    devolvería un resultado siempre no-negativo donde JS podría dar uno
    negativo. Usar `%` aquí habría desviado el matiz en ese caso."""
    m = _HEX_RE.match(hexadecimal.strip())
    if not m:
        return None
    n = int(m.group(1), 16)
    r, g, b = ((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d == 0:
        return 0.0
    if mx == r:
        h = math.fmod((g - b) / d, 6)
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    h *= 60
    return h + 360 if h < 0 else h


def _saturar(valor: float, escala: float) -> float:
    """Satura 0→1 sin llegar nunca a 1. Puerto exacto de `saturar`."""
    v = max(0.0, valor)
    return v / (v + escala)


def _r3(n: float) -> float:
    """Puerto de `Math.round(n*1000)/1000`. Python `round()` usa
    redondeo banker's (half-to-even); JS `Math.round` redondea SIEMPRE
    hacia arriba en el .5 (half-up). Todo este módulo trabaja con valores
    >= 0, así que `floor(n*1000 + 0.5)` replica a JS exactamente."""
    return math.floor(n * 1000 + 0.5) / 1000


def _math_round(x: float) -> int:
    """Puerto de `Math.round` para enteros (half-up); válido para x >= 0."""
    return math.floor(x + 0.5)


def _num_js(n: float) -> str:
    """Cómo JS convierte `n` a texto dentro de un template literal: sin
    '.0' para enteros, sin ceros sobrantes en decimales (p.ej. 175.2, no
    175.200 — el propio fixture lo exige así en 'hsl(175.2 85% 58%)')."""
    if n == int(n):
        return str(int(n))
    return f"{n:.3f}".rstrip("0").rstrip(".")


def derivar_adn(ser: Dict[str, Any]) -> Dict[str, Any]:
    """
    Puerto EXACTO de `derivarAdn()` (genesis-dna.ts). `ser` es un dict con
    la forma de `SemillaSer`: id, nombre, colorPersonalidad?, arquetipo?,
    generacion?, experiencia?. Pura y determinista.

    VERIFICADO contra los 6 vectores de genesis-dna.fixtures.json —
    ver `verificar_fixtures_adn()` más abajo, que se ejecutó y pasó 6/6
    antes de dar esta función por buena.
    """
    semilla = fnv1a_32(f"{ser['id']}|{ser['nombre']}")

    arquetipo = (ser.get("arquetipo") or "").strip().lower()
    if arquetipo in ARQUETIPO_A_SOLIDO:
        solido = ARQUETIPO_A_SOLIDO[arquetipo]
    else:
        solido = SOLIDOS[math.floor(_tramo(semilla, 0) * len(SOLIDOS)) % len(SOLIDOS)]

    frecuencia = FRECUENCIA_POR_SOLIDO[solido]

    color_personalidad = ser.get("colorPersonalidad")
    matiz_declarado = matiz_desde_hex(color_personalidad) if color_personalidad else None
    matiz = matiz_declarado if matiz_declarado is not None else _tramo(semilla, 1) * 360

    # Ángulo áureo: reparte los 3 tonos igual que la filotaxis reparte hojas
    # — nunca se agrupan, nunca se repiten (matiz/h2/h3 SIEMPRE >= 0, así
    # que el `%` de Python coincide aquí con el de JS; no hace falta fmod).
    h2 = (matiz + GOLDEN_ANGLE_DEG) % 360
    h3 = (matiz + 2 * GOLDEN_ANGLE_DEG) % 360

    experiencia = max(0.0, float(ser.get("experiencia") or 0))
    generacion = max(0, math.floor(ser.get("generacion") or 0))
    # La evolución mezcla lo vivido (experiencia, satura suave) con lo
    # heredado (generación, hasta 6): un nieto empieza con ventaja.
    evolucion = min(1.0, _saturar(experiencia, 240) * 0.8 + min(generacion, 6) / 6 * 0.2)

    orbitas = 2 + math.floor(_tramo(semilla, 2) * 2) + _math_round(evolucion)
    radio_base = 1.15 + _tramo(semilla, 3) * 0.25
    radios_orbitales = [_r3(radio_base * math.pow(PHI, i * 0.5)) for i in range(orbitas)]

    return {
        "semilla": semilla,
        "solido": solido,
        "frecuencia": frecuencia,
        "pulso": _r3(frecuencia / 432),
        "paleta": {
            "primario": f"hsl({_num_js(_r3(matiz))} 92% 62%)",
            "secundario": f"hsl({_num_js(_r3(h2))} 85% 58%)",
            "acento": f"hsl({_num_js(_r3(h3))} 96% 70%)",
        },
        "matiz": _r3(matiz),
        "orbitas": orbitas,
        "radiosOrbitales": radios_orbitales,
        "densidad": _r3(0.35 + _tramo(semilla, 4) * 0.5),
        "simetria": _r3(0.55 + _tramo(semilla, 5) * 0.45),
        "rugosidad": _r3(_tramo(semilla, 6) * 0.6 * (1 - evolucion * 0.4)),
        "aura": _r3(0.3 + _tramo(semilla, 7) * 0.4 + evolucion * 0.3),
        "evolucion": _r3(evolucion),
        "facetas": 1 + _math_round(evolucion * 3),
    }


def verificar_fixtures_adn(ruta_fixtures: str) -> Dict[str, Any]:
    """
    Carga `genesis-dna.fixtures.json` (clave "casos", cada uno con "entrada"
    y "esperado") y compara `derivar_adn(entrada)` campo a campo contra
    "esperado" — números con tolerancia de redondeo a 3 decimales, "paleta"
    comparada por subcampo, listas (radiosOrbitales) elemento a elemento.
    """
    p = Path(ruta_fixtures)
    if not p.exists():
        return {"success": False, "bloqueado": True,
                "motivo": f"genesis-dna.fixtures.json no existe en {ruta_fixtures}",
                "total": 0, "pasaron": 0, "detalles": []}
    try:
        datos = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        return {"success": False, "bloqueado": True, "motivo": f"JSON inválido: {e}",
                "total": 0, "pasaron": 0, "detalles": []}

    casos = datos.get("casos") if isinstance(datos, dict) else datos
    casos = casos or []

    def _cmp(v_obtenido: Any, v_esperado: Any, prefijo: str, diffs: List[str]) -> None:
        if isinstance(v_esperado, dict):
            for kk, vv in v_esperado.items():
                _cmp((v_obtenido or {}).get(kk), vv, f"{prefijo}.{kk}", diffs)
        elif isinstance(v_esperado, list):
            ok = isinstance(v_obtenido, list) and len(v_obtenido) == len(v_esperado) and all(
                round(float(a), 3) == round(float(b), 3) for a, b in zip(v_obtenido, v_esperado)
            )
            if not ok:
                diffs.append(f"{prefijo}: esperado={v_esperado} obtenido={v_obtenido}")
        elif isinstance(v_esperado, bool):
            if v_obtenido != v_esperado:
                diffs.append(f"{prefijo}: esperado={v_esperado!r} obtenido={v_obtenido!r}")
        elif isinstance(v_esperado, (int, float)):
            try:
                if round(float(v_obtenido), 3) != round(float(v_esperado), 3):
                    diffs.append(f"{prefijo}: esperado={v_esperado} obtenido={v_obtenido}")
            except (TypeError, ValueError):
                diffs.append(f"{prefijo}: esperado={v_esperado} obtenido={v_obtenido} (no numérico)")
        else:
            if v_obtenido != v_esperado:
                diffs.append(f"{prefijo}: esperado={v_esperado!r} obtenido={v_obtenido!r}")

    detalles = []
    pasaron = 0
    for i, caso in enumerate(casos):
        entrada = caso.get("entrada")
        esperado = caso.get("esperado") or {}
        obtenido = derivar_adn(entrada) if isinstance(entrada, dict) else None
        diffs: List[str] = []
        if obtenido is None:
            diffs.append("entrada con forma inesperada")
        else:
            for k, v_esp in esperado.items():
                _cmp(obtenido.get(k), v_esp, k, diffs)
        ok = not diffs
        pasaron += ok
        detalles.append({"indice": i, "id": (entrada or {}).get("id"), "ok": ok, "diffs": diffs})

    return {
        "success": pasaron == len(casos) and len(casos) > 0,
        "bloqueado": False,
        "total": len(casos),
        "pasaron": pasaron,
        "detalles": detalles,
    }


# ═══════════════════════════════════════════════════════════════════════
# 1. SOBERANÍA — forma EXACTA de `Soberania` (dominio/exploración/límites
#    duros son ahora listas EXPLÍCITAS por ser, no zonas implícitas de un
#    sandbox global; ese era mi diseño de antes de leer el contrato real).
# ═══════════════════════════════════════════════════════════════════════

SOBERANIA_POR_DEFECTO: Dict[str, Any] = {
    "dominio": [], "exploracion": [], "medios": [], "cerebros": [],
    "puedeProponerFuera": True, "prefijoRamaVariante": "variante/", "limitesDuros": [],
}
ENRUTADO_POR_DEFECTO: Dict[str, Any] = {
    "escalera": ["openrouter/free", "bitnet-158-local"],
    "soloGratuitos": True, "ultimoUsado": None, "ultimaFueDegradada": False,
}

WORKSPACE_ANCLA = Path(os.path.realpath(str(settings.workspace_path)))


def _resolver_real(ruta: str, ancla: Optional[Path] = None) -> Path:
    """Ruta CANÓNICA real (symlinks resueltos, `.`/`..` normalizados). Las
    rutas relativas se anclan al workspace del backend, NUNCA al cwd del
    proceso (indefinido según cómo se lanzó uvicorn: sería una vía de
    escape silenciosa)."""
    base = ancla or WORKSPACE_ANCLA
    p = Path(ruta)
    if not p.is_absolute():
        p = base / p
    return Path(os.path.realpath(str(p)))


def _es_subruta(hijo: Path, padre: Path) -> bool:
    """Frontera segura por COMPONENTES de ruta, no por prefijo de texto
    (evita que "/a/foo-secreto" cuente como dentro de "/a/foo")."""
    try:
        hijo.relative_to(padre)
        return True
    except ValueError:
        return False


def verificar_soberania(soberania: Dict[str, Any], ruta: str) -> Dict[str, Any]:
    """
    Dada una `Soberania` (la de un ser) y una ruta, decide el nivel:
    'dominio' (escribe libre) > 'exploracion' (solo lee) > 'proponer' (nace
    como rama variante) > 'denegado' (limitesDuros, o puedeProponerFuera en
    false). Todo se compara en rutas REALES — symlinks resueltos y '..'
    normalizado ANTES de comparar — nunca en texto crudo.

    Sin ruta pública propia (no está en el contrato: ver aviso al principio
    del fichero) — función interna lista para que la use quien implemente
    la escritura real fuera de este módulo.
    """
    try:
        real = _resolver_real(ruta)
    except Exception as e:
        return {"nivel": "denegado", "rutaResuelta": None, "rutaSolicitada": ruta, "motivo": f"ruta inválida: {e}"}

    limites = [_resolver_real(x) for x in (soberania.get("limitesDuros") or [])]
    if any(real == l or _es_subruta(real, l) for l in limites):
        return {"nivel": "denegado", "rutaResuelta": str(real), "rutaSolicitada": ruta, "motivo": "dentro de un límite duro"}

    dominios = [_resolver_real(x) for x in (soberania.get("dominio") or [])]
    if any(real == d or _es_subruta(real, d) for d in dominios):
        return {"nivel": "dominio", "rutaResuelta": str(real), "rutaSolicitada": ruta, "motivo": "dentro del dominio propio"}

    exploracion = [_resolver_real(x) for x in (soberania.get("exploracion") or [])]
    if any(real == e or _es_subruta(real, e) for e in exploracion):
        return {"nivel": "exploracion", "rutaResuelta": str(real), "rutaSolicitada": ruta, "motivo": "dentro de la exploración permitida"}

    if soberania.get("puedeProponerFuera", True):
        return {"nivel": "proponer", "rutaResuelta": str(real), "rutaSolicitada": ruta,
                "motivo": "fuera de dominio/exploración: nace como propuesta en rama variante"}

    return {"nivel": "denegado", "rutaResuelta": str(real), "rutaSolicitada": ruta,
            "motivo": "fuera de dominio/exploración y puedeProponerFuera=false"}


# ═══════════════════════════════════════════════════════════════════════
# 2. PUENTE A LA BÓVEDA — extiende cada agente de agent_vault_engine con
#    campos "genesis_*" SIN pisar nada existente (evolución aditiva). Las
#    proyecciones traducen ese agente extendido a las formas EXACTAS que
#    espera genesis-client.ts (Ser / SerListado / NodoLinaje).
# ═══════════════════════════════════════════════════════════════════════

_ESTADOS_VALIDOS = ("activo", "durmiendo", "suspendido")


def _arquetipo_de(agente: Dict[str, Any]) -> str:
    explicito = agente.get("genesis_arquetipo")
    if explicito:
        return explicito
    aid = agente.get("id", "") or ""
    return aid[len("agent_"):] if aid.startswith("agent_") else aid


def _asegurar_genesis(agente: Dict[str, Any]) -> bool:
    """Rellena SOLO lo que falte con los valores por defecto del contrato
    (nunca pisa lo que ya exista). Devuelve True si mutó algo, para que el
    llamador decida si vale la pena persistir."""
    mutado = False
    if not isinstance(agente.get("genesis_soberania"), dict):
        agente["genesis_soberania"] = {
            "dominio": [], "exploracion": [], "medios": [], "cerebros": [],
            "puedeProponerFuera": True, "prefijoRamaVariante": "variante/", "limitesDuros": [],
        }
        mutado = True
    if not isinstance(agente.get("genesis_enrutado"), dict):
        agente["genesis_enrutado"] = {
            "escalera": list(ENRUTADO_POR_DEFECTO["escalera"]),
            "soloGratuitos": True, "ultimoUsado": None, "ultimaFueDegradada": False,
        }
        mutado = True
    if not isinstance(agente.get("genesis_linaje"), dict):
        agente["genesis_linaje"] = {
            "progenitorId": None, "descendientes": [], "generacion": 0,
            "origen": "usuario", "familiaId": None,
        }
        mutado = True
    if "genesis_estado" not in agente:
        agente["genesis_estado"] = "activo"
        mutado = True
    for campo, es_lista in (
        ("genesis_esencia", False), ("genesis_arquetipo", False),
        ("genesis_habilidades", True), ("genesis_herramientas", True), ("genesis_reglas", True),
        ("genesis_comunidades", True), ("genesis_espacio_hogar_id", False),
        ("genesis_experiencia", False), ("genesis_adn", False), ("genesis_adn_ajustes", False),
        # (OLA 2) Ausente = nunca se le concedió/asignó -- igual que el resto de
        # campos genesis_*, NUNCA se pisa lo que ya exista, solo se rellena lo
        # que falte para que un ser creado antes de esta ola no reviente al leerlo.
        ("genesis_internet", False), ("genesis_avatar_fuente", False),
        ("genesis_cerebros_propios", True), ("genesis_proceso_tipo_id", False),
    ):
        if campo not in agente:
            agente[campo] = [] if es_lista else (0 if campo == "genesis_experiencia" else None)
            mutado = True
    return mutado


def _semilla_ser_desde_agente(agente: Dict[str, Any]) -> Dict[str, Any]:
    linaje = agente.get("genesis_linaje") or {}
    return {
        "id": agente.get("id"),
        "nombre": agente.get("name"),
        "colorPersonalidad": agente.get("color"),
        "arquetipo": _arquetipo_de(agente),
        "generacion": linaje.get("generacion", 0),
        "experiencia": agente.get("genesis_experiencia", 0),
    }


def _adn_de(agente: Dict[str, Any]) -> Dict[str, Any]:
    """ADN cacheado en 'genesis_adn'; se deriva una vez y se persiste (no
    se recalcula en cada lectura: el ADN es un rasgo estable del ser, no
    una función pura del estado actual — solo cambia si algo pide
    recalcularlo explícitamente vía /adn/recalcular)."""
    if not isinstance(agente.get("genesis_adn"), dict):
        agente["genesis_adn"] = derivar_adn(_semilla_ser_desde_agente(agente))
    return agente["genesis_adn"]


def recalcular_adn(ser_id: str) -> Dict[str, Any]:
    agente = agent_vault_engine.get_agent(ser_id)
    if not agente:
        return {"ok": False, "error": f"Ser '{ser_id}' no encontrado."}
    _asegurar_genesis(agente)
    agente["genesis_adn"] = derivar_adn(_semilla_ser_desde_agente(agente))
    agent_vault_engine._save_agents()
    return {"ok": True, "adn": agente["genesis_adn"]}


def _proyectar_personalidades(agente: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        {"id": p.get("id"), "nombre": p.get("name") or p.get("nombre") or p.get("id"),
         "color": p.get("color"), "rol": p.get("role") or p.get("rol")}
        for p in (agente.get("used_personalities") or [])
        if isinstance(p, dict)
    ]


def _proyectar_cerebros(agente: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        {"id": c.get("id"), "nombre": c.get("name") or c.get("nombre") or c.get("id"), "color": c.get("color")}
        for c in (agente.get("linked_cerebros") or [])
        if isinstance(c, dict)
    ]


def _proyectar_ser(agente: Dict[str, Any]) -> Dict[str, Any]:
    _asegurar_genesis(agente)
    adn = _adn_de(agente)
    linaje = agente.get("genesis_linaje") or {}
    creado = agente.get("created_at") or agente.get("createdAt") or time.time()
    return {
        "id": agente["id"],
        "nombre": agente.get("name", agente["id"]),
        "rol": agente.get("role", "Ser Soberano"),
        "esencia": agente.get("genesis_esencia"),
        "color": agente.get("color"),
        "estado": agente.get("genesis_estado", "activo"),
        "adn": adn,
        "adnAjustes": agente.get("genesis_adn_ajustes"),
        "personalidades": _proyectar_personalidades(agente),
        "cerebros": _proyectar_cerebros(agente),
        "habilidades": list(agente.get("genesis_habilidades") or []),
        "herramientas": list(agente.get("genesis_herramientas") or []),
        "reglas": list(agente.get("genesis_reglas") or []),
        "soberania": agente.get("genesis_soberania"),
        "enrutado": agente.get("genesis_enrutado"),
        "linaje": linaje,
        "comunidades": list(agente.get("genesis_comunidades") or []),
        "espacioHogarId": agente.get("genesis_espacio_hogar_id"),
        "imaginacion": {
            "activa": bool(agente.get("imagination_enabled", False)),
            "frecuencia": agente.get("imagination_frequency", "manual"),
            "nivelPermiso": agente.get("imagination_permission_level", "always_ask"),
        },
        "recursos": {
            "concurrencia": agente.get("concurrency", 1),
            "cpuPorcentaje": agente.get("cpu_quota_percent", 10),
            "ramMb": agente.get("ram_limit_mb", 64),
        },
        # (OLA 2) Los 4 campos nuevos de Ser -- ausentes tal cual si nunca se
        # concedieron/asignaron (contrato: "Ausente = nunca se le concedió" /
        # "Ausente = procedural, el de siempre"), NUNCA sustituidos por un
        # valor inventado.
        "internet": agente.get("genesis_internet"),
        "avatarFuente": agente.get("genesis_avatar_fuente"),
        "cerebrosPropios": agente.get("genesis_cerebros_propios") or [],
        "procesoTipoId": agente.get("genesis_proceso_tipo_id"),
        "experiencia": agente.get("genesis_experiencia", 0),
        "creadoEn": creado,
        "actualizadoEn": agente.get("updated_at", creado),
    }


def _proyectar_ser_listado(agente: Dict[str, Any]) -> Dict[str, Any]:
    _asegurar_genesis(agente)
    linaje = agente.get("genesis_linaje") or {}
    return {
        "id": agente["id"],
        "nombre": agente.get("name", agente["id"]),
        "rol": agente.get("role", "Ser Soberano"),
        "estado": agente.get("genesis_estado", "activo"),
        "color": agente.get("color"),
        "adn": _adn_de(agente),
        "generacion": linaje.get("generacion", 0),
        "comunidades": list(agente.get("genesis_comunidades") or []),
        "experiencia": agente.get("genesis_experiencia", 0),
    }


def _proyectar_nodo_linaje(agente: Dict[str, Any]) -> Dict[str, Any]:
    _asegurar_genesis(agente)
    linaje = agente.get("genesis_linaje") or {}
    return {
        "id": agente["id"],
        "nombre": agente.get("name", agente["id"]),
        "progenitorId": linaje.get("progenitorId"),
        "generacion": linaje.get("generacion", 0),
        "familiaId": linaje.get("familiaId"),
    }


def _todos_los_agentes_con_genesis() -> List[Dict[str, Any]]:
    """Lista todos los agentes de la bóveda, retro-rellenando (una sola
    vez, persistido) los campos genesis_* que falten en agentes creados
    antes de que este módulo existiera."""
    agentes = agent_vault_engine.list_agents()
    mutado = False
    for a in agentes:
        if _asegurar_genesis(a):
            mutado = True
    if mutado:
        agent_vault_engine._save_agents()
    return agentes


# ═══════════════════════════════════════════════════════════════════════
# 3. NO-ESCALADA — un hijo nunca hereda, por vía de engendramiento, más
#    soberanía ni más permisos "clásicos" (los de agent_vault_engine, que
#    security.py sigue usando para las rutas DANGEROUS) de los que ya
#    tenía su progenitor. Esto se conserva de la fase anterior, adaptado a
#    la forma real de `Soberania`.
# ═══════════════════════════════════════════════════════════════════════

def _permisos_de(agent_id: str) -> Dict[str, bool]:
    registro = (getattr(agent_vault_engine, "api_records", None) or {}).get(agent_id) or {}
    permisos = registro.get("permissions")
    return dict(permisos) if isinstance(permisos, dict) else {}


def _clamp_soberania_hijo(deseada: Dict[str, Any], del_padre: Dict[str, Any]) -> Dict[str, Any]:
    """El hijo solo puede pedir un SUBCONJUNTO de lo que ya tenía el padre,
    dimensión por dimensión. dominio/exploracion se comparan por ruta real
    (subruta-segura); medios/cerebros son etiquetas lógicas (subconjunto
    por pertenencia); limitesDuros del padre se heredan SIEMPRE (un hijo
    no puede levantar un límite duro que el padre tenía); puedeProponerFuera
    solo puede ser True si el padre también lo era."""

    def _subconjunto_rutas(pedidas: Optional[List[str]], base: List[str]) -> List[str]:
        raices = []
        for r in base or []:
            try:
                raices.append(_resolver_real(r))
            except Exception:
                continue
        if pedidas is None:
            return list(base or [])
        out = []
        for p in pedidas:
            try:
                real_p = _resolver_real(p)
            except Exception:
                continue
            if any(real_p == r or _es_subruta(real_p, r) for r in raices):
                out.append(p)
        return out

    def _subconjunto_logico(pedidas: Optional[List[str]], base: List[str]) -> List[str]:
        base_set = set(base or [])
        if pedidas is None:
            return list(base or [])
        return [x for x in pedidas if x in base_set]

    dominio_padre = del_padre.get("dominio") or []
    exploracion_padre = del_padre.get("exploracion") or []
    medios_padre = del_padre.get("medios") or []
    cerebros_padre = del_padre.get("cerebros") or []

    puede_proponer = bool(deseada.get("puedeProponerFuera", del_padre.get("puedeProponerFuera", True)))
    puede_proponer = puede_proponer and bool(del_padre.get("puedeProponerFuera", True))

    limites = list(dict.fromkeys([*(del_padre.get("limitesDuros") or []), *(deseada.get("limitesDuros") or [])]))
    prefijo = deseada.get("prefijoRamaVariante") or del_padre.get("prefijoRamaVariante") or "variante/"

    return {
        "dominio": _subconjunto_rutas(deseada.get("dominio"), dominio_padre),
        "exploracion": _subconjunto_rutas(deseada.get("exploracion"), exploracion_padre),
        "medios": _subconjunto_logico(deseada.get("medios"), medios_padre),
        "cerebros": _subconjunto_logico(deseada.get("cerebros"), cerebros_padre),
        "puedeProponerFuera": puede_proponer,
        "prefijoRamaVariante": prefijo,
        "limitesDuros": limites,
    }


# ═══════════════════════════════════════════════════════════════════════
# 4. CRUD DE SERES — crear_ser sirve TANTO a `POST /seres` (progenitorId
#    opcional en el propio cuerpo) COMO a engendrar_ser (progenitor forzado
#    por la URL), para que el recorte de no-escalada se aplique siempre
#    que exista un progenitor, sin importar la vía.
# ═══════════════════════════════════════════════════════════════════════

_CAMPOS_CLASICOS_POR_DEFECTO: Dict[str, Any] = {
    "status": "active", "concurrency": 1, "cpu_quota_percent": 10, "ram_limit_mb": 64,
    "compute_trunk": "trunk_b", "hardware_acceleration": "",
    "imagination_enabled": False, "imagination_frequency": "manual", "imagination_permission_level": "always_ask",
    "used_personalities": [], "linked_cerebros": [],
    "memory_access": {"mem0_enabled": False, "knowledge_graph_enabled": False, "vector_store_enabled": False, "openviking_context": False},
    "developing_processes": [],
    "generated_branches": {"max_parallel_threads": 1, "speedup_factor": "1.0x", "subagents": [], "branch_tree": []},
    "interconnections": [],
}


def crear_ser(solicitud: Dict[str, Any], progenitor_forzado: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    solicitud = solicitud or {}
    nombre = solicitud.get("nombre")
    if not nombre or not str(nombre).strip():
        return {"ok": False, "error": "Falta 'nombre' (SolicitudGenesis lo exige)."}

    progenitor_id = solicitud.get("progenitorId")
    progenitor = progenitor_forzado
    if progenitor is None and progenitor_id:
        progenitor = agent_vault_engine.get_agent(progenitor_id)
        if progenitor is None:
            return {"ok": False, "error": f"progenitorId '{progenitor_id}' no existe."}
        _asegurar_genesis(progenitor)

    if progenitor is not None:
        permisos_padre = _permisos_de(progenitor["id"])
        if not permisos_padre.get("imagination_spawn", False):
            return {"ok": False, "error": f"'{progenitor['id']}' no tiene el permiso 'imagination_spawn': no puede engendrar seres."}

    nuevo: Dict[str, Any] = dict(_CAMPOS_CLASICOS_POR_DEFECTO)
    nuevo["memory_access"] = dict(_CAMPOS_CLASICOS_POR_DEFECTO["memory_access"])
    nuevo["generated_branches"] = dict(_CAMPOS_CLASICOS_POR_DEFECTO["generated_branches"])
    nuevo["id"] = f"custom_agent_{secrets.token_hex(6)}"
    nuevo["name"] = str(nombre).strip()
    nuevo["role"] = solicitud.get("rol") or "Ser Soberano"
    nuevo["color"] = solicitud.get("color")
    nuevo["is_custom"] = True

    resultado_vault = agent_vault_engine.save_agent(nuevo)
    if not isinstance(resultado_vault, dict) or not resultado_vault.get("success"):
        error = resultado_vault.get("error") if isinstance(resultado_vault, dict) else "fallo desconocido"
        return {"ok": False, "error": f"No se pudo crear en la bóveda: {error}"}

    ser_id = nuevo["id"]
    agente = agent_vault_engine.get_agent(ser_id)
    if agente is None:
        return {"ok": False, "error": "Creado en la bóveda pero no se pudo releer."}

    agente["genesis_estado"] = "activo"
    agente["genesis_esencia"] = solicitud.get("esencia")
    agente["genesis_arquetipo"] = solicitud.get("arquetipo")
    agente["genesis_habilidades"] = list(solicitud.get("habilidades") or [])
    agente["genesis_herramientas"] = list(solicitud.get("herramientas") or [])
    agente["genesis_reglas"] = list(solicitud.get("reglas") or [])
    agente["genesis_comunidades"] = []
    agente["genesis_espacio_hogar_id"] = None
    agente["genesis_experiencia"] = 0
    agente["genesis_adn"] = None
    agente["genesis_adn_ajustes"] = None

    # SolicitudGenesis.personalidades/cerebros son arrays de IDS (string[]),
    # no objetos completos {id,nombre,color,rol}. Sin catálogo propio de
    # personalidades/cerebros en este módulo, se guarda un descriptor
    # mínimo honesto (id como nombre) en vez de inventar color/rol.
    if solicitud.get("personalidades"):
        agente["used_personalities"] = [
            {"id": pid, "name": pid, "color": None, "role": None} for pid in solicitud["personalidades"]
        ]
    if solicitud.get("cerebros"):
        agente["linked_cerebros"] = [{"id": cid, "name": cid, "color": None} for cid in solicitud["cerebros"]]

    enrutado_deseado = {**ENRUTADO_POR_DEFECTO, **(solicitud.get("enrutado") or {})}
    agente["genesis_enrutado"] = enrutado_deseado

    if progenitor is not None:
        soberania_padre = progenitor.get("genesis_soberania") or SOBERANIA_POR_DEFECTO
        agente["genesis_soberania"] = _clamp_soberania_hijo(solicitud.get("soberania") or {}, soberania_padre)

        permisos_padre = _permisos_de(progenitor["id"])
        try:
            agent_vault_engine.update_agent_permissions(ser_id, dict(permisos_padre))
        except Exception as e:
            print(f"[GenesisEngine] No se pudieron clonar permisos clásicos del progenitor: {e}")

        linaje_padre = progenitor.setdefault("genesis_linaje", {
            "progenitorId": None, "descendientes": [], "generacion": 0, "origen": "usuario", "familiaId": None,
        })
        generacion = int(linaje_padre.get("generacion", 0)) + 1
        familia_id = linaje_padre.get("familiaId") or progenitor["id"]
        agente["genesis_linaje"] = {
            "progenitorId": progenitor["id"], "descendientes": [], "generacion": generacion,
            "origen": "agente", "familiaId": familia_id,
        }
        descendientes = linaje_padre.setdefault("descendientes", [])
        if ser_id not in descendientes:
            descendientes.append(ser_id)
    else:
        agente["genesis_soberania"] = {**SOBERANIA_POR_DEFECTO, **(solicitud.get("soberania") or {})}
        agente["genesis_linaje"] = {"progenitorId": None, "descendientes": [], "generacion": 0, "origen": "usuario", "familiaId": None}

    agente["updated_at"] = time.time()
    agent_vault_engine._save_agents()
    return {"ok": True, "ser": _proyectar_ser(agente)}


def engendrar_ser(progenitor_id: str, solicitud: Dict[str, Any]) -> Dict[str, Any]:
    progenitor = agent_vault_engine.get_agent(progenitor_id)
    if not progenitor:
        return {"ok": False, "error": f"Progenitor '{progenitor_id}' no encontrado."}
    _asegurar_genesis(progenitor)
    solicitud = dict(solicitud or {})
    solicitud.pop("progenitorId", None)  # SolicitudEngendrar = Omit<SolicitudGenesis,'progenitorId'>; la URL manda.
    return crear_ser(solicitud, progenitor_forzado=progenitor)


def modificar_ser(ser_id: str, parche: Dict[str, Any]) -> Dict[str, Any]:
    agente = agent_vault_engine.get_agent(ser_id)
    if not agente:
        return {"ok": False, "error": f"Ser '{ser_id}' no encontrado."}
    _asegurar_genesis(agente)
    p = parche or {}

    if "nombre" in p and p["nombre"]:
        agente["name"] = p["nombre"]
    if "rol" in p:
        agente["role"] = p["rol"]
    if "esencia" in p:
        agente["genesis_esencia"] = p["esencia"]
    if "color" in p:
        agente["color"] = p["color"]
    if "estado" in p and p["estado"] in _ESTADOS_VALIDOS:
        agente["genesis_estado"] = p["estado"]
    if "adnAjustes" in p:
        agente["genesis_adn_ajustes"] = p["adnAjustes"]
    if "personalidades" in p:
        agente["used_personalities"] = [
            {"id": x.get("id"), "name": x.get("nombre"), "color": x.get("color"), "role": x.get("rol")}
            for x in (p["personalidades"] or []) if isinstance(x, dict)
        ]
    if "cerebros" in p:
        agente["linked_cerebros"] = [
            {"id": x.get("id"), "name": x.get("nombre"), "color": x.get("color")}
            for x in (p["cerebros"] or []) if isinstance(x, dict)
        ]
    if "habilidades" in p:
        agente["genesis_habilidades"] = list(p["habilidades"] or [])
    if "herramientas" in p:
        agente["genesis_herramientas"] = list(p["herramientas"] or [])
    if "reglas" in p:
        agente["genesis_reglas"] = list(p["reglas"] or [])
    if "soberania" in p and isinstance(p["soberania"], dict):
        agente["genesis_soberania"] = {**(agente.get("genesis_soberania") or {}), **p["soberania"]}
    if "enrutado" in p and isinstance(p["enrutado"], dict):
        agente["genesis_enrutado"] = {**(agente.get("genesis_enrutado") or {}), **p["enrutado"]}
    if "comunidades" in p:
        agente["genesis_comunidades"] = list(p["comunidades"] or [])
    if "espacioHogarId" in p:
        agente["genesis_espacio_hogar_id"] = p["espacioHogarId"]
    if "imaginacion" in p and isinstance(p["imaginacion"], dict):
        im = p["imaginacion"]
        if "activa" in im:
            agente["imagination_enabled"] = bool(im["activa"])
        if "frecuencia" in im:
            agente["imagination_frequency"] = im["frecuencia"]
        if "nivelPermiso" in im:
            agente["imagination_permission_level"] = im["nivelPermiso"]
    if "recursos" in p and isinstance(p["recursos"], dict):
        rec = p["recursos"]
        if "concurrencia" in rec:
            agente["concurrency"] = int(rec["concurrencia"])
        if "cpuPorcentaje" in rec:
            agente["cpu_quota_percent"] = int(rec["cpuPorcentaje"])
        if "ramMb" in rec:
            agente["ram_limit_mb"] = int(rec["ramMb"])

    agente["updated_at"] = time.time()
    agent_vault_engine._save_agents()
    return {"ok": True, "ser": _proyectar_ser(agente)}


def borrar_ser(ser_id: str) -> Dict[str, Any]:
    agente = agent_vault_engine.get_agent(ser_id)
    if not agente:
        return {"ok": False, "error": f"Ser '{ser_id}' no encontrado."}

    tocado = False
    for otro in agent_vault_engine.list_agents():
        linaje = otro.get("genesis_linaje")
        if not isinstance(linaje, dict):
            continue
        # Huérfanos: si el borrado era progenitor de 'otro', 'otro' pasa a raíz.
        if linaje.get("progenitorId") == ser_id:
            linaje["progenitorId"] = None
            tocado = True
        # Integridad referencial inversa: si el borrado seguía listado como
        # descendiente de su propio progenitor, se retira de esa lista.
        descendientes = linaje.get("descendientes")
        if isinstance(descendientes, list) and ser_id in descendientes:
            descendientes.remove(ser_id)
            tocado = True
    if tocado:
        agent_vault_engine._save_agents()

    resultado = agent_vault_engine.delete_agent(ser_id)
    ok = bool(isinstance(resultado, dict) and resultado.get("success"))
    return {"ok": ok, "error": None if ok else (resultado.get("error") if isinstance(resultado, dict) else "no se pudo borrar")}


# ═══════════════════════════════════════════════════════════════════════
# 5. VÍNCULOS — un solo registro por vínculo (propiedad única), guardado
#    dentro de `interconnections` del ser ORIGEN. Ya NO se escribe por
#    duplicado en ambos extremos como en el diseño anterior: `Vinculo` del
#    contrato tiene un único `id` y un único dueño (origenId); el campo
#    `bidireccional` es descriptivo, no un mecanismo de escritura doble.
#
#    Nota honesta: los agentes por defecto (aurora, hephaestus, …) YA
#    traían `interconnections` con forma vieja ({target_agent_id,
#    relationship, bidirectional} — sin id ni tipo del enum nuevo). Esta
#    función los filtra deliberadamente fuera de GET /vinculos en vez de
#    forzarlos al enum nuevo (mapear "relationship" a un TipoVinculo
#    inventado sería adivinar). Por eso la lista puede salir vacía en un
#    backend recién iniciado hasta que se cree el primer vínculo Génesis.
# ═══════════════════════════════════════════════════════════════════════

_TIPOS_VINCULO = ("mentor", "aprendiz", "pareja", "rival", "aliado", "delegacion", "supervision", "hermandad")


def _es_vinculo_genesis(v: Any) -> bool:
    return isinstance(v, dict) and "id" in v and v.get("tipo") in _TIPOS_VINCULO


def _proyectar_vinculo(v: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": v.get("id"), "origenId": v.get("origenId"), "destinoId": v.get("destinoId"),
        "tipo": v.get("tipo"), "fuerza": v.get("fuerza", 0.5),
        "bidireccional": bool(v.get("bidireccional", False)), "motivo": v.get("motivo"),
        "creadoEn": v.get("creadoEn"),
    }


def listar_vinculos() -> List[Dict[str, Any]]:
    # Deduplicado por id: un mismo vínculo puede haber quedado escrito en dos
    # agentes por guardados antiguos. Preferimos enseñarlo una vez a enseñarlo
    # dos y que parezca que hay más relación de la que hay.
    out: List[Dict[str, Any]] = []
    vistos = set()
    for agente in agent_vault_engine.list_agents():
        for v in (agente.get("interconnections") or []):
            if _es_vinculo_genesis(v) and v.get("id") not in vistos:
                vistos.add(v.get("id"))
                out.append(_proyectar_vinculo(v))
    return out


def crear_vinculo(solicitud: Dict[str, Any]) -> Dict[str, Any]:
    solicitud = solicitud or {}
    origen_id = solicitud.get("origenId")
    destino_id = solicitud.get("destinoId")
    tipo = solicitud.get("tipo")

    origen = agent_vault_engine.get_agent(origen_id) if origen_id else None
    destino = agent_vault_engine.get_agent(destino_id) if destino_id else None
    if not origen:
        return {"ok": False, "error": f"origenId '{origen_id}' no encontrado."}
    if not destino:
        return {"ok": False, "error": f"destinoId '{destino_id}' no encontrado."}
    if tipo not in _TIPOS_VINCULO:
        return {"ok": False, "error": f"tipo debe ser uno de {list(_TIPOS_VINCULO)}."}

    registro = {
        "id": f"vinculo_{secrets.token_hex(6)}",
        "origenId": origen_id, "destinoId": destino_id, "tipo": tipo,
        "fuerza": float(solicitud.get("fuerza", 0.5)),
        "bidireccional": bool(solicitud.get("bidireccional", False)),
        "motivo": solicitud.get("motivo"),
        "creadoEn": time.time(),
        # alias legado por compatibilidad con lectores viejos de interconnections:
        "target_agent_id": destino_id, "relationship": tipo, "bidirectional": bool(solicitud.get("bidireccional", False)),
    }
    origen.setdefault("interconnections", []).append(registro)
    agent_vault_engine._save_agents()
    return {"ok": True, "vinculo": _proyectar_vinculo(registro)}


def borrar_vinculo(vinculo_id: str) -> Dict[str, Any]:
    # Barre TODOS los agentes, no solo el primero que lo tenga: si una copia
    # quedó duplicada en dos registros, salir al primer acierto dejaba la otra
    # viva y el vínculo reaparecía al listar.
    encontrado = False
    for agente in agent_vault_engine.list_agents():
        inter = agente.get("interconnections") or []
        nuevo = [v for v in inter if not (_es_vinculo_genesis(v) and v.get("id") == vinculo_id)]
        if len(nuevo) != len(inter):
            agente["interconnections"] = nuevo
            encontrado = True
    if encontrado:
        agent_vault_engine._save_agents()
        return {"ok": True}
    return {"ok": False, "error": f"Vínculo '{vinculo_id}' no encontrado."}


# ═══════════════════════════════════════════════════════════════════════
# 6. ESCALERA COGNITIVA GRATUITA — catálogo (`ModeloDisponible[]`) +
#    verificación REAL (`VerificacionModelo`, sin envoltorio 'ok': el
#    contrato lo pide desnudo). "Real" significa: sin plantilla disfrazada
#    de éxito. El motor local pasa por cognition.py (su única puerta); los
#    modelos remotos llaman a OpenRouter de verdad, con la MISMA regla
#    ':free' que src/app/api/ai/openrouter/route.ts del OS.
# ═══════════════════════════════════════════════════════════════════════

OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
_CATALOGO_TTL_S = 600.0
_catalogo_cache: Dict[str, Any] = {"at": 0.0, "modelos": []}
_verificaciones_cache: Dict[str, Dict[str, Any]] = {}


def _openrouter_key() -> Optional[str]:
    clave = (os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPENROUTER_SHARED_KEY") or "").strip()
    return clave or None


def _es_modelo_gratuito(modelo_id: str) -> bool:
    return modelo_id == "openrouter/free" or modelo_id.endswith(":free")


async def _catalogo_openrouter_gratis() -> List[Dict[str, Any]]:
    ahora = time.time()
    if _catalogo_cache["modelos"] and (ahora - _catalogo_cache["at"]) < _CATALOGO_TTL_S:
        return _catalogo_cache["modelos"]
    try:
        async with httpx.AsyncClient(timeout=10.0) as cliente:
            resp = await cliente.get(OPENROUTER_MODELS_URL)
            resp.raise_for_status()
            datos = (resp.json() or {}).get("data") or []
        gratis = [m for m in datos if _es_modelo_gratuito(str(m.get("id", "")))]
        _catalogo_cache["at"] = ahora
        _catalogo_cache["modelos"] = gratis
        return gratis
    except Exception as e:
        print(f"[GenesisEngine] catalogo OpenRouter :free no disponible ahora: {e}")
        return _catalogo_cache["modelos"]


async def listar_modelos() -> List[Dict[str, Any]]:
    modo_local = cognition.engine_mode()
    cache_local = _verificaciones_cache.get("bitnet-158-local", {})
    cache_or_free = _verificaciones_cache.get("openrouter/free", {})
    catalogo: List[Dict[str, Any]] = [
        {
            "id": "bitnet-158-local", "etiqueta": "BitNet 1.58-bit / Ollama (motor local)",
            "proveedor": "bitnet-158", "costePorMillon": 0,
            "verificado": bool(cache_local.get("verificado", modo_local != "templates")),
            "verificadoEn": cache_local.get("verificadoEn"),
            "contexto": None, "nota": f"modo real actual del motor local: {modo_local}",
        },
        {
            "id": "openrouter/free", "etiqueta": "OpenRouter -- cualquier modelo :free disponible",
            "proveedor": "openrouter-gratis", "costePorMillon": 0,
            "verificado": bool(cache_or_free.get("verificado", False)),
            "verificadoEn": cache_or_free.get("verificadoEn"),
            "contexto": None, "nota": "prueba el primer modelo :free del catalogo en vivo que responda",
        },
    ]
    for m in await _catalogo_openrouter_gratis():
        mid = m.get("id")
        if not mid:
            continue
        cache = _verificaciones_cache.get(mid, {})
        contexto = m.get("context_length")
        catalogo.append({
            "id": mid, "etiqueta": m.get("name") or mid, "proveedor": "openrouter-gratis",
            "costePorMillon": 0, "verificado": bool(cache.get("verificado", False)),
            "verificadoEn": cache.get("verificadoEn"),
            "contexto": contexto if isinstance(contexto, int) else None,
            "nota": None,
        })
    return catalogo


async def _probar_openrouter(modelo_id: str) -> Dict[str, Any]:
    clave = _openrouter_key()
    if not clave:
        return {"verificado": False, "latenciaMs": None, "texto": None,
                "error": "OPENROUTER_API_KEY no esta configurada en este backend."}
    if not _es_modelo_gratuito(modelo_id):
        return {"verificado": False, "latenciaMs": None, "texto": None,
                "error": "Solo se permiten modelos ':free' (misma regla que el proxy del OS)."}
    t0 = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=25.0) as cliente:
            resp = await cliente.post(
                OPENROUTER_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {clave}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://starseed-os.vercel.app",
                    "X-Title": "StarSeed OS - Genesis (verificacion de escalera economica)",
                },
                json={
                    "model": modelo_id,
                    "messages": [{"role": "user", "content": "Responde con una sola palabra: OK"}],
                    "max_tokens": 16, "temperature": 0.3,
                },
            )
        ms = int((time.perf_counter() - t0) * 1000)
        if resp.status_code != 200:
            return {"verificado": False, "latenciaMs": ms, "texto": None, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
        cuerpo = resp.json()
        elecciones = cuerpo.get("choices") or [{}]
        texto = ((elecciones[0] or {}).get("message") or {}).get("content") or ""
        texto = texto.strip()
        if not texto:
            return {"verificado": False, "latenciaMs": ms, "texto": None, "error": "HTTP 200 pero sin texto util en la respuesta."}
        return {"verificado": True, "latenciaMs": ms, "texto": texto[:300], "error": None}
    except Exception as e:
        ms = int((time.perf_counter() - t0) * 1000)
        return {"verificado": False, "latenciaMs": ms, "texto": None, "error": str(e)[:200]}


async def verificar_modelo(modelo_id: str) -> Dict[str, Any]:
    if not modelo_id:
        return {"modeloId": modelo_id, "responde": False, "latenciaMs": None, "muestra": None, "error": "falta modeloId"}

    if modelo_id in ("bitnet-158-local", "bitnet-native", "ollama", "local"):
        modo = cognition.engine_mode()
        if modo == "templates":
            resultado = {"modeloId": modelo_id, "responde": False, "latenciaMs": None, "muestra": None,
                         "error": "el motor local esta en modo plantillas (sin Ollama ni BitNet nativo activos ahora mismo)"}
        else:
            t0 = time.perf_counter()
            r = await cognition.generate("Responde con una sola palabra: hola", system="", max_tokens=16, timeout=20.0)
            ms = int((time.perf_counter() - t0) * 1000)
            resultado = {
                "modeloId": modelo_id, "responde": bool(r.get("real")),
                "latenciaMs": r.get("ms", ms), "muestra": (r.get("text") or "")[:200] or None,
                "error": r.get("error"),
            }
        _verificaciones_cache[modelo_id] = {"verificado": resultado["responde"], "verificadoEn": time.time()}
        return resultado

    candidatos = [modelo_id]
    if modelo_id == "openrouter/free":
        candidatos = [m.get("id") for m in (await _catalogo_openrouter_gratis())[:3] if m.get("id")]
        if not candidatos:
            return {"modeloId": modelo_id, "responde": False, "latenciaMs": None, "muestra": None,
                     "error": "catalogo OpenRouter :free vacio o inalcanzable ahora mismo."}

    ultimo: Dict[str, Any] = {"modeloId": modelo_id, "responde": False, "latenciaMs": None, "muestra": None, "error": "sin candidatos"}
    for candidato in candidatos:
        r = await _probar_openrouter(candidato)
        ultimo = {"modeloId": modelo_id, "responde": bool(r.get("verificado")),
                  "latenciaMs": r.get("latenciaMs"), "muestra": r.get("texto"), "error": r.get("error")}
        _verificaciones_cache[candidato] = {"verificado": bool(r.get("verificado")), "verificadoEn": time.time()}
        if r.get("verificado"):
            break
    return ultimo


# ═══════════════════════════════════════════════════════════════════════
# 7. COMUNIDADES / ESPACIOS / PROPUESTAS — almacén aparte en
#    data/genesis_store.json. Se mantiene fuera de agents_vault.json a
#    propósito: AgentVaultEngine._save_agents() reescribe ese fichero
#    conservando SOLO la clave "agents"; meter aquí estas tres colecciones
#    se perdería en cualquier guardado clásico (p. ej. /api/agents/save).
# ═══════════════════════════════════════════════════════════════════════

class _GenesisStore:
    def __init__(self, data_dir: Path):
        self.path = data_dir / "genesis_store.json"
        self.comunidades: Dict[str, Dict[str, Any]] = {}
        self.espacios: Dict[str, Dict[str, Any]] = {}
        self.propuestas: Dict[str, Dict[str, Any]] = {}
        self._cargar()

    def _cargar(self):
        if not self.path.exists():
            return
        try:
            datos = json.loads(self.path.read_text(encoding="utf-8"))
            self.comunidades = datos.get("comunidades", {}) or {}
            self.espacios = datos.get("espacios", {}) or {}
            self.propuestas = datos.get("propuestas", {}) or {}
        except Exception as e:
            print(f"[GenesisEngine] Error leyendo genesis_store.json: {e}")

    def guardar(self):
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                "version": "2.0.0", "updated_at": time.time(),
                "comunidades": self.comunidades, "espacios": self.espacios, "propuestas": self.propuestas,
            }
            self.path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            print(f"[GenesisEngine] Error guardando genesis_store.json: {e}")


try:
    _store = _GenesisStore(Path(settings.data_path))
except Exception as _e:
    print(f"[GenesisEngine] No se pudo inicializar genesis_store.json ({_e}); usando almacen en memoria.")
    _store = _GenesisStore.__new__(_GenesisStore)
    _store.comunidades, _store.espacios, _store.propuestas = {}, {}, {}
    _store.path = Path("data/genesis_store.json")


def listar_comunidades() -> List[Dict[str, Any]]:
    return list(_store.comunidades.values())


def crear_comunidad(solicitud: Dict[str, Any]) -> Dict[str, Any]:
    solicitud = solicitud or {}
    nombre = solicitud.get("nombre")
    proposito = solicitud.get("proposito")
    if not nombre or not proposito:
        return {"ok": False, "error": "'nombre' y 'proposito' son obligatorios (SolicitudComunidad)."}
    cid = f"comunidad_{secrets.token_hex(6)}"
    comunidad = {
        "id": cid, "nombre": nombre, "proposito": proposito,
        "miembros": list(solicitud.get("miembros") or []),
        "espacioId": solicitud.get("espacioId"), "color": solicitud.get("color"),
        "creadaEn": time.time(),
    }
    _store.comunidades[cid] = comunidad
    _store.guardar()
    return {"ok": True, "comunidad": comunidad}


def unirse_a_comunidad(comunidad_id: str, ser_id: str) -> Dict[str, Any]:
    """Interna, sin ruta pública (ver aviso de huecos al principio del fichero)."""
    comunidad = _store.comunidades.get(comunidad_id)
    if not comunidad:
        return {"ok": False, "error": f"Comunidad '{comunidad_id}' no encontrada."}
    if not agent_vault_engine.get_agent(ser_id):
        return {"ok": False, "error": f"Ser '{ser_id}' no encontrado."}
    if ser_id not in comunidad["miembros"]:
        comunidad["miembros"].append(ser_id)
        _store.guardar()
    return {"ok": True, "comunidad": comunidad}


def listar_espacios() -> List[Dict[str, Any]]:
    return list(_store.espacios.values())


def crear_espacio(solicitud: Dict[str, Any]) -> Dict[str, Any]:
    solicitud = solicitud or {}
    nombre = solicitud.get("nombre")
    arquetipo = solicitud.get("arquetipo")
    if not nombre or not arquetipo:
        return {"ok": False, "error": "'nombre' y 'arquetipo' son obligatorios (SolicitudEspacio; sin 'descripcion' en el contrato)."}
    eid = f"espacio_{secrets.token_hex(6)}"
    semilla = solicitud.get("semilla")
    if not isinstance(semilla, int):
        semilla = fnv1a_32(f"{eid}|{nombre}")
    espacio = {
        "id": eid, "nombre": nombre, "constructorId": solicitud.get("constructorId"),
        "arquetipo": arquetipo, "semilla": semilla, "habitantes": [], "objetos": [],
        "creadoEn": time.time(),
    }
    _store.espacios[eid] = espacio
    _store.guardar()
    return {"ok": True, "espacio": espacio}


def listar_propuestas() -> List[Dict[str, Any]]:
    return list(_store.propuestas.values())


def crear_propuesta(ser_id: str, titulo: str, descripcion: str, cambios: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Interna, sin ruta pública (ver aviso de huecos al principio del fichero):
    el contrato solo expone GET, aceptar y descartar -- crear una propuesta
    hoy solo puede hacerlo código de este backend en nombre de un ser, no
    un cliente HTTP externo."""
    agente = agent_vault_engine.get_agent(ser_id)
    if not agente:
        return {"ok": False, "error": f"Ser '{ser_id}' no encontrado."}
    _asegurar_genesis(agente)
    prefijo = (agente.get("genesis_soberania") or {}).get("prefijoRamaVariante") or "variante/"
    contador = sum(1 for p in _store.propuestas.values() if p.get("serId") == ser_id) + 1
    pid = f"propuesta_{secrets.token_hex(6)}"
    propuesta = {
        "id": pid, "serId": ser_id, "titulo": titulo, "descripcion": descripcion or "",
        "rama": f"{prefijo}{ser_id}-{contador}", "cambios": cambios or [],
        "estado": "pendiente", "creadaEn": time.time(),
    }
    _store.propuestas[pid] = propuesta
    _store.guardar()
    return {"ok": True, "propuesta": propuesta}


def resolver_propuesta(propuesta_id: str, aceptar: bool) -> Dict[str, Any]:
    propuesta = _store.propuestas.get(propuesta_id)
    if not propuesta:
        return {"ok": False, "error": f"Propuesta '{propuesta_id}' no encontrada."}
    propuesta["estado"] = "aceptada" if aceptar else "descartada"
    _store.guardar()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════
# 9. OLA 2 — Oficina, capacidades y avatares. Los 8 endpoints nuevos del
#    bloque "OLA 2" al final de genesis-types.ts. Reutiliza sin reinventar:
#    intuitive_imagination_engine.PROCESS_AGENT_MAP/_AGENT_TO_PERSONALITY_ID/
#    _AGENT_TO_REGISTRY_ID para bots predeterminados y oficina; cerebros_
#    manager.sync_with_r2() para la sincronización real de cerebros propios;
#    verificar_soberania() (sección 1) para que "internet.dispositivo" no
#    sea un interruptor decorativo.
# ═══════════════════════════════════════════════════════════════════════

# ---------------------------------------------------------- 9.1 Internet

CAPACIDAD_INTERNET_POR_DEFECTO: Dict[str, Any] = {
    "activa": False, "bibliotecaOS": False, "bibliotecaUsuario": False,
    "dispositivo": False, "web": False,
    "dominiosPermitidos": [], "dominiosBloqueados": [],
    "ultimoAcceso": None, "ultimoError": None,
}


def conceder_internet(ser_id: str, solicitud: Dict[str, Any]) -> Dict[str, Any]:
    """POST /seres/{id}/internet. Fusiona lo pedido sobre lo que ya hubiera
    (permite conceder una fuente sin retirar las demás) y sanea tipos --
    nunca se guarda tal cual lo que llegue del body.

    Corazón del encargo: 'dispositivo' NO es un interruptor decorativo. Si
    se pide dispositivo=true se comprueba DE VERDAD, con verificar_soberania
    (la misma función, no una copia), que el ser tenga algún dominio o
    exploración que resuelva a una ruta real -- un ser sin ámbito no puede
    parecer que lee carpetas solo porque el interruptor está en true. Si no
    hay ámbito real, el interruptor se concede tal como se pidió (es el
    consentimiento del usuario; puede que la soberanía llegue después) pero
    `ultimoError` deja constancia honesta de que hoy no tiene ningún efecto.
    """
    agente = agent_vault_engine.get_agent(ser_id)
    if not agente:
        return {"ok": False, "error": f"Ser '{ser_id}' no encontrado."}
    _asegurar_genesis(agente)
    solicitud = solicitud or {}
    previa = agente.get("genesis_internet") or {}
    cap = {**CAPACIDAD_INTERNET_POR_DEFECTO, **previa, **solicitud}

    for campo_bool in ("activa", "bibliotecaOS", "bibliotecaUsuario", "dispositivo", "web"):
        cap[campo_bool] = bool(cap.get(campo_bool))
    for campo_lista in ("dominiosPermitidos", "dominiosBloqueados"):
        cap[campo_lista] = [str(x) for x in (cap.get(campo_lista) or []) if isinstance(x, str)]

    cap["ultimoError"] = None
    if cap["dispositivo"]:
        soberania = agente.get("genesis_soberania") or SOBERANIA_POR_DEFECTO
        ambito = list(soberania.get("dominio") or []) + list(soberania.get("exploracion") or [])
        ambito_real = [r for r in ambito if verificar_soberania(soberania, r)["nivel"] in ("dominio", "exploracion")]
        if not ambito_real:
            cap["ultimoError"] = (
                "dispositivo=true concedido, pero la soberania de este ser no declara "
                "ningun dominio ni exploracion que resuelva a una ruta real: no leera "
                "ninguna carpeta hasta que se le asigne ambito (PATCH /seres/{id} con 'soberania')."
            )

    agente["genesis_internet"] = cap
    agente["updated_at"] = time.time()
    agent_vault_engine._save_agents()
    return {"ok": True, "ser": _proyectar_ser(agente)}


# ------------------------------------------------------- 9.2 Herramientas

_HERRAMIENTAS_OS_CACHE_TTL_S = 60.0
_herramientas_os_cache: Dict[str, Any] = {"at": 0.0, "items": []}
_RE_SKILL_ID = re.compile(r'skillId:\s*"([^"]+)"')


def _herramienta_indisponible(hid: str, nombre: str, fuente: str, permiso: Optional[str], motivo: str) -> Dict[str, Any]:
    return {"id": hid, "nombre": nombre, "fuente": fuente, "descripcion": None,
            "requierePermiso": permiso, "disponible": False, "motivo": motivo}


def _herramientas_biblioteca_os() -> List[Dict[str, Any]]:
    """Paquetes kind="function" (skills reales, payload.skillId) de la
    Biblioteca en línea del OS (src/lib/library/packages.ts). Lectura de
    solo texto con una extracción ligera por regex -- este backend es
    Python, no hay un parser de TypeScript aquí, y escribir uno de verdad
    para un catálogo que no es mío (src/lib/library/packages.ts, del OS)
    sería sobre-ingeniería para este encargo. Cacheado 60s: son ~155KB
    de fichero en cada llamada si no se cachea (ver 'MIDE' del encargo)."""
    ahora = time.time()
    if _herramientas_os_cache["items"] and (ahora - _herramientas_os_cache["at"]) < _HERRAMIENTAS_OS_CACHE_TTL_S:
        return _herramientas_os_cache["items"]

    ruta = _OS_REPO_ROOT / "src" / "lib" / "library" / "packages.ts"
    try:
        texto = ruta.read_text(encoding="utf-8")
    except Exception as e:
        items = [_herramienta_indisponible(
            "biblioteca-os:catalogo", "Catalogo de la Biblioteca del OS", "biblioteca-os",
            "bibliotecaOS", f"No se pudo leer {ruta}: {e}",
        )]
        _herramientas_os_cache.update({"at": ahora, "items": items})
        return items

    vistos: List[str] = []
    for m in _RE_SKILL_ID.finditer(texto):
        sid = m.group(1)
        if sid not in vistos:
            vistos.append(sid)

    if not vistos:
        items = [_herramienta_indisponible(
            "biblioteca-os:catalogo", "Catalogo de la Biblioteca del OS", "biblioteca-os",
            "bibliotecaOS", f"{ruta} se pudo leer pero no se encontro ningun paquete kind=\"function\" (skillId) dentro.",
        )]
    else:
        items = [{
            "id": f"biblioteca-os:{sid}", "nombre": sid.replace("-", " ").replace("_", " ").strip().title(),
            "fuente": "biblioteca-os", "descripcion": None, "requierePermiso": "bibliotecaOS",
            "disponible": True, "motivo": None,
        } for sid in vistos]

    _herramientas_os_cache.update({"at": ahora, "items": items})
    return items


def _herramientas_biblioteca_usuario() -> List[Dict[str, Any]]:
    """Honestidad radical (el mismo principio que packages.ts declara en su
    propia cabecera): la biblioteca PROPIA del usuario vive en localStorage
    del navegador ('starseed.library.mine.v1'), no en ningun fichero que
    este backend Python pueda leer. Fingir aqui un catalogo seria inventar
    datos -- se dice la verdad y punto."""
    return [_herramienta_indisponible(
        "biblioteca-usuario:catalogo", "Biblioteca propia del usuario", "biblioteca-usuario",
        "bibliotecaUsuario",
        "La biblioteca del usuario vive en localStorage del navegador (starseed.library.mine.v1); "
        "este backend no tiene acceso al almacenamiento del navegador.",
    )]


def _herramientas_dispositivo() -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    try:
        acceso_fs = bool(universal_device_access and universal_device_access.granted_permissions.get("filesystem_full_access"))
    except Exception:
        acceso_fs = False
    out.append({
        "id": "dispositivo:sistema-archivos", "nombre": "Acceso al sistema de archivos del dispositivo",
        "fuente": "dispositivo",
        "descripcion": "Lectura/escritura de carpetas y discos del dispositivo -- por ser, dentro de su ambito de soberania (verificar_soberania).",
        "requierePermiso": "dispositivo", "disponible": acceso_fs,
        "motivo": None if acceso_fs else "universal_device_access no tiene concedido 'filesystem_full_access' en este backend.",
    })
    try:
        n_carpetas = len(device_sync.folders) if device_sync is not None else 0
        sync_disponible = device_sync is not None
    except Exception:
        n_carpetas, sync_disponible = 0, False
    out.append({
        "id": "dispositivo:sincronizacion-carpetas", "nombre": "Sincronizacion de carpetas vigiladas",
        "fuente": "dispositivo",
        "descripcion": f"Reindexa en la memoria 1.58b las carpetas del dispositivo vigiladas ({n_carpetas} configuradas ahora mismo).",
        "requierePermiso": "dispositivo", "disponible": sync_disponible,
        "motivo": None if sync_disponible else "device_sync no esta disponible en este backend.",
    })
    return out


def _herramientas_web() -> List[Dict[str, Any]]:
    try:
        bloqueado = is_air_gapped()
    except Exception:
        bloqueado = False
    return [{
        "id": "web:busqueda", "nombre": "Busqueda web abierta", "fuente": "web",
        "descripcion": "Busqueda multi-motor (DuckDuckGo/Brave/GitHub/ArXiv/Wikipedia) real, sin clave, via browser_tool.search_web.",
        "requierePermiso": "web", "disponible": not bloqueado,
        "motivo": "Modo air-gapped activo: toda salida de red esta bloqueada." if bloqueado else None,
    }]


def _herramientas_nativas() -> List[Dict[str, Any]]:
    """Herramientas propias del backend: disponibles si el modulo que las
    implementa cargo sin errores en este proceso (la comprobacion mas
    honesta posible sin invocar cada una de verdad en cada listado)."""
    catalogo = (
        ("nativa:terminal", "Terminal del sistema", terminal_tool, "Ejecuta comandos de shell soberanos."),
        ("nativa:explorador-sistema", "Explorador del sistema", system_explorer, "Explora procesos, puertos y estructura del sistema operativo."),
        ("nativa:sentidos-sistema", "Sentidos del sistema", system_senses, "Telemetria y sensores del entorno fisico del dispositivo."),
    )
    out = []
    for hid, nombre, instancia, desc in catalogo:
        disponible = instancia is not None
        out.append({
            "id": hid, "nombre": nombre, "fuente": "nativa", "descripcion": desc,
            "requierePermiso": None, "disponible": disponible,
            "motivo": None if disponible else f"El modulo de '{nombre}' no se pudo cargar en este backend.",
        })
    return out


def listar_herramientas() -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for fuente_fn in (_herramientas_biblioteca_os, _herramientas_biblioteca_usuario,
                      _herramientas_dispositivo, _herramientas_web, _herramientas_nativas):
        try:
            out.extend(fuente_fn())
        except Exception as e:
            print(f"[GenesisEngine] fuente de herramientas '{fuente_fn.__name__}' fallo: {e}")
    return out


# --------------------------------------------------- 9.3 Cerebros propios

def _mapear_resultado_sync_r2(resultado: Any) -> "tuple[str, Optional[str]]":
    """Traduce el resultado REAL de cerebros_manager.sync_with_r2() a
    (estadoSync, errorSync) -- nunca 'ok' por defecto. `resultado` puede
    traer 'reason' (rama de fallo esperada) o 'error' (excepcion capturada
    dentro de sync_with_r2); se usa tal cual, sin reinterpretarlo, para que
    el error que aparezca en pantalla sea el error real."""
    if not isinstance(resultado, dict):
        return "fallo", "cerebros_manager.sync_with_r2() no devolvio un resultado utilizable."
    if resultado.get("success"):
        return "ok", None
    motivo = resultado.get("reason") or resultado.get("error") or "fallo sin detalle."
    return "fallo", str(motivo)


def agregar_cerebro_propio(ser_id: str, solicitud: Dict[str, Any]) -> Dict[str, Any]:
    """POST /seres/{id}/cerebros. Crea un CerebroSer y lo añade a
    `cerebrosPropios`. Si se pide sincronizable=true, se intenta la
    sincronizacion REAL ahora mismo (unico mecanismo real que existe hoy:
    cerebros_manager.sync_with_r2, contra Cloudflare R2) y su resultado
    HONESTO -- no un 'ok' optimista -- es lo que se guarda en estadoSync/
    errorSync. Si no se pide, queda 'nunca': no se ha intentado, se dice."""
    agente = agent_vault_engine.get_agent(ser_id)
    if not agente:
        return {"ok": False, "error": f"Ser '{ser_id}' no encontrado."}
    _asegurar_genesis(agente)
    solicitud = solicitud or {}
    nombre = solicitud.get("nombre")
    if not nombre or not str(nombre).strip():
        return {"ok": False, "error": "Falta 'nombre' (obligatorio para crear un CerebroSer)."}

    cid = f"cerebro_propio_{secrets.token_hex(6)}"
    ruta_almacen = solicitud.get("rutaAlmacen") or str(Path(settings.data_path) / "cerebros_propios" / ser_id / cid)
    try:
        Path(ruta_almacen).mkdir(parents=True, exist_ok=True)
    except Exception as e:
        print(f"[GenesisEngine] No se pudo crear el almacen '{ruta_almacen}' del cerebro propio de '{ser_id}': {e}")

    sincronizable = bool(solicitud.get("sincronizable", False))
    cerebro: Dict[str, Any] = {
        "id": cid, "nombre": str(nombre).strip(), "color": solicitud.get("color"),
        "rutaAlmacen": ruta_almacen, "enrutadoA": solicitud.get("enrutadoA"),
        "sincronizable": sincronizable, "ultimaSync": None, "estadoSync": "nunca", "errorSync": None,
    }

    if sincronizable:
        if cerebros_manager is None:
            cerebro["estadoSync"] = "fallo"
            cerebro["errorSync"] = "cerebros_manager no esta disponible en este backend."
        else:
            try:
                resultado = cerebros_manager.sync_with_r2()
            except Exception as e:
                resultado = {"success": False, "error": f"{type(e).__name__}: {e}"}
            estado, error = _mapear_resultado_sync_r2(resultado)
            cerebro["estadoSync"] = estado
            cerebro["errorSync"] = error
        cerebro["ultimaSync"] = time.time()

    propios = agente.setdefault("genesis_cerebros_propios", [])
    propios.append(cerebro)
    agente["updated_at"] = time.time()
    agent_vault_engine._save_agents()
    return {"ok": True, "ser": _proyectar_ser(agente)}


# ------------------------------------------------ 9.4 Bots predeterminados

def _instalados_por_tipo_proceso() -> Dict[str, str]:
    """pid -> id del primer ser instalado para ese tipo de proceso (si lo hay)."""
    out: Dict[str, str] = {}
    for a in agent_vault_engine.list_agents():
        pid = a.get("genesis_proceso_tipo_id")
        if pid and pid not in out:
            out[pid] = a.get("id")
    return out


def _bot_predeterminado_desde_proceso(proc: Dict[str, Any], instalados: Dict[str, str]) -> Dict[str, Any]:
    """Un BotPredeterminado por tipo de proceso, con el agente/personalidad
    REALES que intuitive_imagination_engine ya le asigna -- se reutilizan
    sus propios métodos (_agent_for_process/_agents_for_process/
    _personality_for_process) y sus alias de reconciliación
    (_AGENT_TO_PERSONALITY_ID/_AGENT_TO_REGISTRY_ID), no se reinventan."""
    pid = proc["id"]
    primario: Dict[str, Any] = {"id": None, "name": None}
    agentes_info: List[Dict[str, Any]] = []
    personalidad: Dict[str, Any] = {"id": None}
    if intuitive_imagination_engine is not None:
        try:
            primario = intuitive_imagination_engine._agent_for_process(pid)
        except Exception as e:
            print(f"[GenesisEngine] _agent_for_process('{pid}') fallo: {e}")
        try:
            agentes_info = intuitive_imagination_engine._agents_for_process(pid)
        except Exception as e:
            print(f"[GenesisEngine] _agents_for_process('{pid}') fallo: {e}")
        try:
            personalidad = intuitive_imagination_engine._personality_for_process(pid)
        except Exception as e:
            print(f"[GenesisEngine] _personality_for_process('{pid}') fallo: {e}")

    agente_real = next((a for a in agentes_info if a.get("id") == primario.get("id")), None)
    if agente_real is None and agentes_info:
        agente_real = agentes_info[0]
    nombre = (agente_real or {}).get("name") or primario.get("name") or proc.get("name")
    agente_id = _AGENT_TO_REGISTRY_ID.get(primario.get("id"), primario.get("id")) if primario.get("id") else None

    return {
        "id": pid,
        "nombre": nombre,
        "rol": proc.get("category") or "Ser de Imaginacion Intuitiva",
        "procesoTipoId": pid,
        "personalidadId": personalidad.get("id"),
        "agenteId": agente_id,
        "instalado": pid in instalados,
        "descripcion": proc.get("description"),
    }


def listar_bots_predeterminados() -> List[Dict[str, Any]]:
    instalados = _instalados_por_tipo_proceso()
    return [_bot_predeterminado_desde_proceso(p, instalados) for p in DREAM_PROCESS_TYPES]


def instalar_bots_predeterminados() -> Dict[str, Any]:
    """POST /bots_predeterminados/instalar. Crea como seres los tipos de
    proceso que aun no tengan uno instalado -- idempotente: un pid con
    'genesis_proceso_tipo_id' ya asignado a algun ser NUNCA se vuelve a
    crear, así que instalar dos veces no duplica nada."""
    instalados = _instalados_por_tipo_proceso()
    creados: List[str] = []
    for proc in DREAM_PROCESS_TYPES:
        pid = proc["id"]
        if pid in instalados:
            continue
        bot = _bot_predeterminado_desde_proceso(proc, instalados)
        solicitud = {
            "nombre": bot["nombre"] or proc.get("name") or pid,
            "rol": bot["rol"],
            "esencia": proc.get("description"),
            "color": proc.get("color"),
        }
        resultado = crear_ser(solicitud)
        if not resultado.get("ok"):
            print(f"[GenesisEngine] No se pudo instalar el bot predeterminado '{pid}': {resultado.get('error')}")
            continue
        ser_id = resultado["ser"]["id"]
        agente = agent_vault_engine.get_agent(ser_id)
        if agente is not None:
            agente["genesis_proceso_tipo_id"] = pid
            agent_vault_engine._save_agents()
        creados.append(ser_id)
        instalados[pid] = ser_id
    return {"ok": True, "creados": creados}


# ------------------------------------------------------------ 9.5 Avatares

_FUENTE_AVATAR_MODOS = ("procedural", "enlinea", "subido")


def buscar_avatares(ser_id: str, solicitud: Dict[str, Any]) -> Dict[str, Any]:
    """POST /seres/{id}/avatar/buscar. GAP HONESTO (mismo estilo que el
    resto del fichero, ver docstring del modulo): no hay ningun motor de
    busqueda de IMAGENES cableado en este backend (browser_tool.search_web
    busca paginas web, no imagenes con licencia verificable). Devolver
    candidatos inventados seria precisamente lo que este proyecto prohibe
    -- candidatos vacio, honesto, en vez de fabricar URLs o licencias."""
    if not agent_vault_engine.get_agent(ser_id):
        return {"ok": False, "error": f"Ser '{ser_id}' no encontrado."}
    return {"ok": True, "candidatos": []}


def fijar_avatar(ser_id: str, solicitud: Dict[str, Any]) -> Dict[str, Any]:
    agente = agent_vault_engine.get_agent(ser_id)
    if not agente:
        return {"ok": False, "error": f"Ser '{ser_id}' no encontrado."}
    _asegurar_genesis(agente)
    solicitud = solicitud or {}
    modo = solicitud.get("modo")
    if modo not in _FUENTE_AVATAR_MODOS:
        return {"ok": False, "error": f"'modo' debe ser uno de {list(_FUENTE_AVATAR_MODOS)}."}
    fuente = {
        "modo": modo, "url": solicitud.get("url"), "consulta": solicitud.get("consulta"),
        "proveedor": solicitud.get("proveedor"), "licencia": solicitud.get("licencia"),
        "atribucion": solicitud.get("atribucion"), "elegidoEn": time.time(),
    }
    agente["genesis_avatar_fuente"] = fuente
    agente["updated_at"] = time.time()
    agent_vault_engine._save_agents()
    return {"ok": True, "ser": _proyectar_ser(agente)}


# ------------------------------------------------------------- 9.6 Oficina

_OFICINA_OCUPACION_DESDE: Dict[str, float] = {}


def _sala_id_de(pid: str) -> str:
    return f"sala_{pid}"


def obtener_estado_oficina() -> Dict[str, Any]:
    """GET /oficina. `datosReales` es estrictamente
    intuitive_imagination_engine.is_dreaming_now -- true solo mientras un
    ciclo REAL esta ejecutandose ahora mismo. El resto del tiempo (la
    inmensa mayoria: un ciclo tarda segundos y se repite cada
    cycle_frequency_minutes, 5 min por defecto) la oficina sale quieta,
    ocupantes=[], tal como pide el encargo: nada de animar actividad
    inventada. 'desde' de un ocupante se ancla la PRIMERA vez que esta
    misma llamada observa ese pid corriendo (el motor no persiste un
    instante de inicio de ciclo en ningun sitio publico que este módulo
    pueda leer sin inventarlo) y se limpia en cuanto deja de estar
    corriendo, para que la proxima llegada cuente como una llegada nueva."""
    ahora = time.time()
    if intuitive_imagination_engine is None:
        return {"salas": [], "ocupantes": [], "actualizadoEn": ahora, "datosReales": False}

    try:
        esta_sonando = bool(intuitive_imagination_engine.is_dreaming_now)
    except Exception:
        esta_sonando = False
    proc_meta = getattr(intuitive_imagination_engine, "process_metadata", {}) or {}

    salas: List[Dict[str, Any]] = []
    corriendo_pid: Optional[str] = None
    for proc in DREAM_PROCESS_TYPES:
        pid = proc["id"]
        meta = proc_meta.get(pid) or {}
        corriendo = esta_sonando and meta.get("status") == "running"
        if corriendo:
            corriendo_pid = pid
        salas.append({
            "id": _sala_id_de(pid), "nombre": proc.get("name"), "procesoTipoId": pid,
            "actividad": 1.0 if corriendo else 0.0, "color": proc.get("color"),
        })

    ocupantes: List[Dict[str, Any]] = []
    if corriendo_pid:
        _OFICINA_OCUPACION_DESDE.setdefault(corriendo_pid, ahora)
        ser_id = _instalados_por_tipo_proceso().get(corriendo_pid)
        if ser_id:
            proc_info = next((p for p in DREAM_PROCESS_TYPES if p["id"] == corriendo_pid), {})
            ocupantes.append({
                "serId": ser_id, "salaId": _sala_id_de(corriendo_pid), "actividad": "pensando",
                "procesoId": corriendo_pid, "detalle": proc_info.get("description"),
                "desde": _OFICINA_OCUPACION_DESDE.get(corriendo_pid, ahora),
            })
    else:
        _OFICINA_OCUPACION_DESDE.clear()

    return {"salas": salas, "ocupantes": ocupantes, "actualizadoEn": ahora, "datosReales": esta_sonando}


# ═══════════════════════════════════════════════════════════════════════
# 8. RUTAS — EXACTAMENTE las 20 de la cabecera de genesis-types.ts más las
#    8 de la cabecera "OLA 2" (28 en total), ni una más ni una menos. 404
#    nunca se usa para "no encontrado" lógico (ver SOBRE DE RESPUESTA en
#    el docstring del módulo); la única excepción deliberada es
#    GET /seres/{id}, que devuelve 400 porque su forma de éxito es un
#    objeto desnudo sin sitio para "ok".
# ═══════════════════════════════════════════════════════════════════════

class _VerificarModeloBody(BaseModel):
    modeloId: str


@router.get("/seres")
async def ep_listar_seres():
    return [_proyectar_ser_listado(a) for a in _todos_los_agentes_con_genesis()]


@router.get("/seres/{ser_id}")
async def ep_obtener_ser(ser_id: str):
    agente = agent_vault_engine.get_agent(ser_id)
    if not agente:
        return JSONResponse(status_code=400, content={"error": f"Ser '{ser_id}' no encontrado."})
    return _proyectar_ser(agente)


@router.post("/seres")
async def ep_crear_ser(solicitud: Dict[str, Any] = Body(default_factory=dict)):
    return crear_ser(solicitud)


@router.patch("/seres/{ser_id}")
async def ep_modificar_ser(ser_id: str, parche: Dict[str, Any] = Body(default_factory=dict)):
    return modificar_ser(ser_id, parche)


@router.delete("/seres/{ser_id}")
async def ep_borrar_ser(ser_id: str):
    return borrar_ser(ser_id)


@router.post("/seres/{ser_id}/engendrar")
async def ep_engendrar_ser(ser_id: str, solicitud: Dict[str, Any] = Body(default_factory=dict)):
    return engendrar_ser(ser_id, solicitud)


@router.post("/seres/{ser_id}/adn/recalcular")
async def ep_recalcular_adn(ser_id: str, _cuerpo: Dict[str, Any] = Body(default_factory=dict)):
    return recalcular_adn(ser_id)


@router.get("/linaje")
async def ep_linaje():
    return [_proyectar_nodo_linaje(a) for a in _todos_los_agentes_con_genesis()]


@router.get("/vinculos")
async def ep_listar_vinculos():
    return listar_vinculos()


@router.post("/vinculos")
async def ep_crear_vinculo(solicitud: Dict[str, Any] = Body(default_factory=dict)):
    return crear_vinculo(solicitud)


@router.delete("/vinculos/{vinculo_id}")
async def ep_borrar_vinculo(vinculo_id: str):
    return borrar_vinculo(vinculo_id)


@router.get("/comunidades")
async def ep_listar_comunidades():
    return listar_comunidades()


@router.post("/comunidades")
async def ep_crear_comunidad(solicitud: Dict[str, Any] = Body(default_factory=dict)):
    return crear_comunidad(solicitud)


@router.get("/espacios")
async def ep_listar_espacios():
    return listar_espacios()


@router.post("/espacios")
async def ep_crear_espacio(solicitud: Dict[str, Any] = Body(default_factory=dict)):
    return crear_espacio(solicitud)


@router.get("/modelos")
async def ep_listar_modelos():
    return await listar_modelos()


@router.post("/modelos/verificar")
async def ep_verificar_modelo(cuerpo: _VerificarModeloBody):
    return await verificar_modelo(cuerpo.modeloId)


@router.get("/propuestas")
async def ep_listar_propuestas():
    return listar_propuestas()


@router.post("/propuestas/{propuesta_id}/aceptar")
async def ep_aceptar_propuesta(propuesta_id: str, _cuerpo: Dict[str, Any] = Body(default_factory=dict)):
    return resolver_propuesta(propuesta_id, aceptar=True)


@router.post("/propuestas/{propuesta_id}/descartar")
async def ep_descartar_propuesta(propuesta_id: str, _cuerpo: Dict[str, Any] = Body(default_factory=dict)):
    return resolver_propuesta(propuesta_id, aceptar=False)


# ─────────────────────────────────────────── OLA 2 (8 rutas, ver sección 9)

@router.get("/oficina")
async def ep_estado_oficina():
    return obtener_estado_oficina()


@router.get("/bots_predeterminados")
async def ep_listar_bots_predeterminados():
    return listar_bots_predeterminados()


@router.post("/bots_predeterminados/instalar")
async def ep_instalar_bots_predeterminados(_cuerpo: Dict[str, Any] = Body(default_factory=dict)):
    return instalar_bots_predeterminados()


@router.post("/seres/{ser_id}/internet")
async def ep_conceder_internet(ser_id: str, solicitud: Dict[str, Any] = Body(default_factory=dict)):
    return conceder_internet(ser_id, solicitud)


@router.post("/seres/{ser_id}/avatar/buscar")
async def ep_buscar_avatar(ser_id: str, solicitud: Dict[str, Any] = Body(default_factory=dict)):
    return buscar_avatares(ser_id, solicitud)


@router.post("/seres/{ser_id}/avatar")
async def ep_fijar_avatar(ser_id: str, solicitud: Dict[str, Any] = Body(default_factory=dict)):
    return fijar_avatar(ser_id, solicitud)


@router.get("/herramientas")
async def ep_listar_herramientas():
    return listar_herramientas()


@router.post("/seres/{ser_id}/cerebros")
async def ep_agregar_cerebro_propio(ser_id: str, solicitud: Dict[str, Any] = Body(default_factory=dict)):
    return agregar_cerebro_propio(ser_id, solicitud)
