"""knowledge_mycelium.py — Micelio de CONOCIMIENTO 1.58-bit SIMBIÓTICO (TODA la IA Astraura)
========================================================================================

Extiende el micelio de voz a TODO el sistema Astraura 1.58-bit: no solo TTS, sino
también el LLM (deltas de peso ternario), los agentes (memoria de trabajo), las
personalidades (embeddings) y los cerebros (estado de conocimiento).

Cada subsistema publica "knowledge packs" 1.58-bit en el mismo Neural Tissue (NT)
que el micelio de voz (tabla `astraura_voice_mesh`), diferenciados por `kind`.
Los pares se descubren por NT ligero y negocian la integración (download firmado
vía el canal del OS, igual que el micelio de voz — offline-first y soberano).

Subsistemas soportados (kind):
  - voice            : pack de voz cuantizado (voice158_*.pack)
  - llm_delta        : delta de peso ternario del LLM (aprendizaje federado)
  - agent_memory     : memoria de trabajo comprimida de un agente
  - persona_embed    : embedding de personalidad/arquetipo
  - brain_state      : estado de conocimiento de un cerebro

Prioridad (instrucción del dueño): usar TODO el GPU local posible (MPS en M1),
buscar servicios gratuitos para el entrenamiento pesado, y priorizar siempre lo
que esta computadora puede hacer. El micelio es offline-first y soberano.
"""

from __future__ import annotations
import logging
import time
from typing import Any, Dict, List, Optional

logger = logging.getLogger("astraura.knowledge_mycelium")

# Reutiliza la señalización ligera del micelio de voz (NT + descubrimiento).
from .voice_mycelium import (
    node_id,
    _supabase,
    SUPABASE_TABLE,
    emit_neurotransmitter,
    discover_remote_packs,
    list_local_packs,
    register_voice_pack,
)

# Tipos de subsistema soportados por el micelio general.
KINDS = ("voice", "llm_delta", "agent_memory", "persona_embed", "brain_state")

_state = {"running": False}


def _emit_knowledge_nt(kind: str, kid: str, version: int, mb: float, meta: Dict[str, Any]) -> None:
    """Publica un neurotransmisor de conocimiento (ligero) al NT del micelio.

    Reutiliza `astraura_voice_mesh` pero con `kind` = subsistema, para que el
    descubrimiento P2P cubra TODA la IA, no solo voz.
    """
    sb = _supabase()
    if not sb:
        return  # modo LAN-only
    try:
        payload = {
            "kind": kind,  # pisa el 'nt' por defecto para distinguir subsistemas
            "node_id": node_id(),
            "speaker": kid,
            "version": version,
            "mb": mb,
            "meta": meta,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        sb.push_state(SUPABASE_TABLE, payload)
        logger.info(f"💠 [KNOW-MYC] NT '{kind}:{kid}'@v{version} emitido")
    except Exception as e:  # pragma: no cover
        logger.debug(f"💠 [KNOW-MYC] NT no emitido (degradación): {e}")


def knowledge_mycelium_status() -> Dict[str, Any]:
    """Estado del micelio de conocimiento 1.58-bit (todos los subsistemas)."""
    by_kind: Dict[str, int] = {}
    for p in list_local_packs():
        k = p.get("kind", "voice")
        by_kind[k] = by_kind.get(k, 0) + 1
    remote = discover_remote_packs()
    remote_by_kind: Dict[str, int] = {}
    for r in remote:
        k = r.get("kind", "voice")
        if k in KINDS:
            remote_by_kind[k] = remote_by_kind.get(k, 0) + 1
    return {
        "node_id": node_id(),
        "running": _state["running"],
        "supabase_mesh": _supabase() is not None,
        "kinds": list(KINDS),
        "local_by_kind": by_kind,
        "remote_by_kind": remote_by_kind,
        "remote_total": len(remote),
    }


def register_knowledge_pack(
    kind: str,
    kid: str,
    version: int = 1,
    *,
    mb: float = 0.0,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Registra y publica un knowledge pack 1.58-bit de CUALQUIER subsistema.

    kind ∈ {voice, llm_delta, agent_memory, persona_embed, brain_state}
    Para voz se delega a register_voice_pack (mantiene el flujo ya verificado).
    Para los demás subsistemas, publica un NT ligero con `kind` propio.
    """
    if kind not in KINDS:
        raise ValueError(f"kind '{kind}' no soportado; usa uno de {KINDS}")
    m = {**(meta or {}), "subsystem": kind}
    if kind == "voice":
        # El voice pack ya lleva su propio flujo de registro + NT.
        _emit_knowledge_nt("voice", kid, version, mb, m)
        return {"kind": "voice", "speaker": kid, "version": version, "mb": mb, "meta": m}
    _emit_knowledge_nt(kind, kid, version, mb, m)
    logger.info(f"💠 [KNOW-MYC] pack '{kind}:{kid}'@v{version} publicado al micelio ({mb:.4f}MB)")
    return {"kind": kind, "speaker": kid, "version": version, "mb": mb, "meta": m}


# ---- Integración por subsistema (puntos de entrada para el resto del OS) ----

def register_llm_delta(epoch: int, mb: float, layers: int = 0) -> Dict[str, Any]:
    """Publica un delta de peso ternario del LLM al micelio (aprendizaje federado).

    El LLM de Astraura (BitNet b1.58) entrena de forma federada: cada neurona
    produce deltas ternarios que se anuncian en el micelio colectivo. Esto es el
    "entrenamiento del conocimiento" para TODO el sistema de IA, no solo voz.
    """
    return register_knowledge_pack(
        "llm_delta", f"llm-{node_id()[:8]}", epoch,
        mb=mb, meta={"subsystem": "llm", "federated": True, "layers": layers},
    )


def register_agent_memory(agent: str, mb: float = 0.0) -> Dict[str, Any]:
    """Publica la memoria de trabajo comprimida de un agente al micelio."""
    return register_knowledge_pack(
        "agent_memory", f"agent-{agent}", 1, mb=mb,
        meta={"subsystem": "agent", "agent": agent},
    )


def register_persona_embed(persona: str, mb: float = 0.0) -> Dict[str, Any]:
    """Publica el embedding de una personalidad/arquetipo al micelio."""
    return register_knowledge_pack(
        "persona_embed", f"persona-{persona}", 1, mb=mb,
        meta={"subsystem": "persona", "persona": persona},
    )


def start_knowledge_mycelium() -> Dict[str, Any]:
    """Arranca el micelio de conocimiento 1.58-bit (segundo plano, idempotente)."""
    _state["running"] = True
    # Anuncia este nodo como participante del micelio general de conocimiento.
    _emit_knowledge_nt("brain_state", node_id(), 1, 0.0,
                       {"subsystem": "brain_state", "role": "knowledge-mycelium"})
    logger.info(f"💠 [KNOW-MYC] micelio de conocimiento 1.58-bit iniciado (nodo {node_id()[:12]})")
    return knowledge_mycelium_status()


def stop_knowledge_mycelium() -> None:
    _state["running"] = False


def pull_knowledge_packs(kind: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Descarga knowledge packs del micelio (opcionalmente filtrado por subsistema).

    Reutiliza el canal de descubrimiento del micelio de voz (que ya funciona),
    pero sin restringir a kind='nt' — así cubre TODA la IA.
    """
    try:
        rows = discover_remote_packs()
        if not isinstance(rows, list):
            rows = []
    except Exception:
        rows = []
    out = []
    for r in rows:
        k = r.get("kind", "voice")
        if k not in KINDS:
            continue
        if kind and k != kind:
            continue
        out.append(r)
        if len(out) >= limit:
            break
    return out


__all__ = [
    "knowledge_mycelium_status",
    "register_knowledge_pack",
    "register_llm_delta",
    "register_agent_memory",
    "register_persona_embed",
    "start_knowledge_mycelium",
    "stop_knowledge_mycelium",
    "pull_knowledge_packs",
    "KINDS",
]
