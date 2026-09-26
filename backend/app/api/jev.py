"""jev.py — POST /api/jev/decidir: decisiones tipadas locales sobre BitNet (n_probs).

Puerta para que otros dispositivos de StarSeed usen a Jev SIN pagar OpenRouter:
se lee el logit de la PRIMERA posición de `/completion` (n_predict=1, n_probs=20,
temperature=0) sobre el llama-server que ya sirve el chat en 127.0.0.1:8790 — la
misma técnica que `scripts/puente/jev_local.py` del repo del OS (Jev nativo,
ola 357), portada aquí para no depender de ese repo en producción. NO se genera
texto: la "decisión" es la probabilidad de cada opción (A, B, C…) como primer
token, así que cuesta un solo forward pass y nada de red externa ni coste.

Pasa por el turnero (`tipo="jev"`, ver `core/turnero.py`): comparte el ÚNICO
hueco del BitNet con el chat, pero pesa una fracción de un chat en la cola y
la adelanta — es casi instantáneo comparado con una generación completa.
"""
from __future__ import annotations

import asyncio
import json
import math
import time
import urllib.request
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..core import turnero
from ..core.turnero import Ocupado
from ..engine.bitnet_cpp_manager import bitnet_cpp_manager

router = APIRouter(prefix="/api/jev", tags=["Jev (decisiones tipadas)"])

TIMEOUT_S = 20.0
N_PROBS = 20
PREGUNTA_MAX = 2000
OPCION_MAX = 200
CONTEXTO_MAX = 4000
OPCIONES_MIN, OPCIONES_MAX = 2, 8


class DecidirRequest(BaseModel):
    pregunta: str
    opciones: List[str]
    contexto: Optional[str] = None


def _letras(cuantas: int) -> List[str]:
    """Etiquetas A, B, C… Z, AA, AB… para las opciones (mismo alfabeto que jev_local.py)."""
    fuera: List[str] = []
    n = 0
    while len(fuera) < cuantas:
        n += 1
        letra = ""
        resto = n
        while resto:
            resto, indice = divmod(resto - 1, 26)
            letra = chr(ord("A") + indice) + letra
        fuera.append(letra)
    return fuera


def _softmax(logprobs: List[float]) -> List[float]:
    """Softmax estable sobre log-probabilidades."""
    if not logprobs:
        return []
    maximo = max(logprobs)
    pesos = [math.exp(v - maximo) for v in logprobs]
    total = sum(pesos)
    return [p / total for p in pesos] if total else []


def _prompt(pregunta: str, opciones: List[str], contexto: Optional[str]) -> str:
    lineas: List[str] = []
    if contexto:
        lineas.append(contexto.strip())
        lineas.append("")
    lineas.append(pregunta.strip())
    lineas.append("")
    lineas.append("Opciones:")
    for letra, opcion in zip(_letras(len(opciones)), opciones):
        lineas.append(f"{letra}. {opcion}")
    lineas.append("Respuesta: ")
    return "\n".join(lineas)


def _probabilidades(respuesta: Any, letras: List[str]) -> Optional[Dict[str, float]]:
    """Extrae y normaliza las letras válidas de la primera posición devuelta
    por `/completion` con `n_probs` (mismo parseo que jev_local.py)."""
    if not isinstance(respuesta, dict):
        return None
    try:
        primeras = respuesta.get("completion_probabilities")[0]
    except (IndexError, TypeError, KeyError):
        return None
    if not isinstance(primeras, list):
        return None
    valores: Dict[str, float] = {}
    for item in primeras[:20]:
        if not isinstance(item, dict):
            continue
        token = item.get("token")
        logprob = item.get("logprob")
        letra = token.strip() if isinstance(token, str) else ""
        if letra not in letras or not isinstance(logprob, (int, float)):
            continue
        valor = float(logprob)
        if not math.isfinite(valor):
            continue
        valores[letra] = valor
    if not valores:
        return None
    letras_validas = [l for l in letras if l in valores]
    normalizadas = _softmax([valores[l] for l in letras_validas])
    if len(normalizadas) != len(letras_validas):
        return None
    return {l: p for l, p in zip(letras_validas, normalizadas)}


def _completar(base: str, prompt: str, timeout: float) -> Dict[str, Any]:
    """POST síncrono a `/completion` (se llama vía `asyncio.to_thread`: es
    bloqueante y no debe congelar el bucle de eventos compartido con el chat)."""
    req = urllib.request.Request(
        f"{base}/completion",
        data=json.dumps({
            "prompt": prompt,
            "n_predict": 1,
            "n_probs": N_PROBS,
            "temperature": 0,
            "cache_prompt": True,
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def _motor_no_listo(detalle: Optional[str] = None) -> JSONResponse:
    contenido: Dict[str, Any] = {"error": "motor-no-listo"}
    if detalle:
        contenido["detalle"] = detalle[:200]
    return JSONResponse(status_code=503, content=contenido, headers={"Retry-After": "30"})


@router.post("/decidir")
async def decidir(req: DecidirRequest, response: Response = None):
    """`{"pregunta","opciones"[2-8],"contexto"?}` → `{"opcion","probabilidades",
    "motor":"bitnet-nprobs","ms"}`. 400 si la entrada no cumple los límites;
    503 `ocupado` si el turnero no admite; 503 `motor-no-listo` si el
    llama-server no está compilado/cargado o no responde. Nunca llama a una
    API de pago."""
    pregunta = (req.pregunta or "").strip()
    if not pregunta or len(pregunta) > PREGUNTA_MAX:
        raise HTTPException(status_code=400, detail=f"pregunta: 1–{PREGUNTA_MAX} caracteres")
    opciones = [str(o).strip() for o in (req.opciones or []) if str(o).strip()]
    if not (OPCIONES_MIN <= len(opciones) <= OPCIONES_MAX):
        raise HTTPException(status_code=400,
                             detail=f"opciones: entre {OPCIONES_MIN} y {OPCIONES_MAX}, no vacías")
    if any(len(o) > OPCION_MAX for o in opciones):
        raise HTTPException(status_code=400, detail=f"opciones: cada una ≤{OPCION_MAX} caracteres")
    contexto = (req.contexto or "").strip() or None
    if contexto and len(contexto) > CONTEXTO_MAX:
        raise HTTPException(status_code=400, detail=f"contexto: máximo {CONTEXTO_MAX} caracteres")

    try:
        async with turnero.turno(tipo="jev"):
            base = None
            try:
                base = bitnet_cpp_manager.ensure_server(0.0, "interactive")
            except Exception:
                base = None
            if not base:
                return _motor_no_listo("llama-server sin binario/modelo o no arrancó")

            letras = _letras(len(opciones))
            prompt = _prompt(pregunta, opciones, contexto)
            t0 = time.monotonic()
            try:
                cruda = await asyncio.to_thread(_completar, base, prompt, TIMEOUT_S)
            except Exception as exc:
                return _motor_no_listo(f"{type(exc).__name__}: {exc}")
            ms = int(round((time.monotonic() - t0) * 1000))

            probabilidades = _probabilidades(cruda, letras)
            if not probabilidades:
                return _motor_no_listo("sin logits utilizables en la respuesta")
            maxima = max(probabilidades, key=probabilidades.get)
            indice = letras.index(maxima)
            probabilidades_por_opcion = {
                opcion: probabilidades.get(letra, 0.0)
                for letra, opcion in zip(letras, opciones)
            }
    except Ocupado as oc:
        return turnero.respuesta_ocupada(oc)

    if response is not None:
        response.headers["X-Astraura-Cola"] = str(turnero.estado().get("en_cola", 0))
    return {
        "opcion": opciones[indice],
        "probabilidades": probabilidades_por_opcion,
        "motor": "bitnet-nprobs",
        "ms": ms,
    }
