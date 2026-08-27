"""subsystem_federated_trainer.py — Entrenamiento federado de AGENTES y PERSONALIDADES
====================================================================================

Extiende el entrenamiento federado del LLM (llm_federated_trainer.py) a los otros
subsistemas del micelio de conocimiento 1.58-bit, completando el ciclo simbiotico
para TODA la IA (correccion del dueno):

  - kind='agent_memory': entrena sobre los agentes locales (data/agents_vault.json)
    y publica su memoria de conocimiento comprimida al micelio.
  - kind='persona_embed': entrena sobre las personalidades/arquetipos y publica
    su embedding de conocimiento al micelio.

Cada subsistema reusa la misma arquitectura 1.58-bit (KnowledgeMLP ternario +
weight indexing) y entrena en GPU local (MPS). Tras entrenar, publica su delta
via register_agent_memory() / register_persona_embed().

Uso:
  .venv/bin/python app/core/subsystem_federated_trainer.py [--epochs N] [--device mps]
"""

from __future__ import annotations
import argparse
import json
import logging
import sys
from pathlib import Path

logger = logging.getLogger("astraura.subsystem_federated_trainer")

try:
    import torch
    import torch.nn as nn
    _TORCH = True
except Exception:  # pragma: no cover
    _TORCH = False


def _device(auto: str) -> str:
    if auto == "auto":
        if _TORCH and torch.cuda.is_available():
            return "cuda"
        if _TORCH and getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
        return "cpu"
    return auto


# Reusa arquitectura y cuantizacion del trainer del LLM.
from .llm_federated_trainer import KnowledgeMLP, quantize_state_dict_158, build_vocab, featurize, label_of


def _corpus_agents() -> list:
    """Agentes locales: cada agente es un fragmento de conocimiento de rol."""
    p = Path("data/agents_vault.json")
    if not p.exists():
        return []
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
        agents = d.get("agents", {})
        if isinstance(agents, dict):
            return [a for a in agents.values()]
        if isinstance(agents, list):
            return agents
    except Exception as e:
        logger.warning(f"💠 [SUB-FED] agents_vault: {e}")
    return []


def _corpus_personas() -> list:
    """Personalidades/arquetipos conocidos de Astraura (del log del backend)."""
    known = [
        ("Genesis", "Génesis Ontocracia Soberanía Directa méxico"),
        ("Hephaestus", "Hephaestus Forja Hardware Ingeniería Sistemas"),
        ("Hermes", "Hermes Comunicación Puentes Mensajería Logos"),
        ("Atenea", "Atenea Sabiduría Estrategia Conocimiento"),
        ("Oneiros", "Oneiros Sueños Imaginación Intuitiva Creación"),
        ("Mnemosyne", "Mnemosyne Memoria Recuerdo Historia"),
        ("Logos", "Logos Razón Lógica Orden Palabra"),
        ("Daedalus", "Daedalus Invento Laberinto Construcción"),
        ("Ananda", "Ananda Bienestar Gozo Paz Plenitud"),
    ]
    return [{"name": f"[{p[0]}]", "content": p[1], "branch": p[0].lower()} for p in known]


def _label_agent(doc: dict, l2i: dict) -> int:
    area = (doc.get("area_id") or "general").split("_")[-1]
    return l2i.get(area, l2i.get("general", 0))


def _label_persona(doc: dict, l2i: dict) -> int:
    return l2i.get(doc.get("branch", "general"), l2i.get("general", 0))


def train_subsystem(kind: str, epochs: int = 3, device: str = "mps", max_items: int = 2000) -> dict:
    """Entrena un subsistema (agent_memory | persona_embed) y publica su delta."""
    assert _TORCH, "torch no disponible"
    dev = _device(device)
    logger.info(f"💠 [SUB-FED] subsistema={kind} dispositivo={dev}")

    if kind == "agent_memory":
        docs = _corpus_agents()
        labelfn = _label_agent
    elif kind == "persona_embed":
        docs = _corpus_personas()
        labelfn = _label_persona
    else:
        return {"ok": False, "reason": f"kind desconocido: {kind}"}

    if not docs:
        logger.warning(f"💠 [SUB-FED] sin corpus para {kind}")
        return {"ok": False, "reason": "no-corpus"}

    vocab, w2i, labels, l2i = build_vocab(docs, top=1500)
    model = KnowledgeMLP(len(vocab), 48, max(2, len(labels))).to(dev)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()

    pairs = []
    for d in docs:
        idx = featurize(d, w2i)
        if idx:
            pairs.append((idx, labelfn(d, l2i)))
    if not pairs:
        return {"ok": False, "reason": "no-pairs"}

    total_loss = 0.0
    n = 0
    for ep in range(1, epochs + 1):
        running = 0.0
        steps = 0
        for idx, lab in pairs:
            x = torch.tensor(idx, dtype=torch.long).to(dev)
            y = torch.tensor([lab], dtype=torch.long).to(dev)
            opt.zero_grad()
            if x.numel() == 0:
                x = torch.zeros(1, dtype=torch.long, device=dev)
            offsets = torch.zeros(1, dtype=torch.long, device=dev)
            out = model.emb(x, offsets)
            out = model.fc(out)
            loss = loss_fn(out, y)
            loss.backward()
            opt.step()
            running += loss.item()
            steps += 1
        total_loss += running
        n += steps
        logger.info(f"💠 [SUB-FED] {kind} epoch {ep}/{epochs} loss={running / max(1, steps):.4f} steps={steps}")

    sd = quantize_state_dict_158(model.state_dict())
    mb = round(sum(len(v["q"]) for v in sd["meta"].values()) * 1 / 8 / 1024 / 1024, 6)
    logger.info(f"💠 [SUB-FED] {kind} cuantizado: {sd['total_params']} params, ~{mb} MB")

    # Publica al micelio de conocimiento (best-effort).
    try:
        from .knowledge_mycelium import register_agent_memory, register_persona_embed
        if kind == "agent_memory":
            pack = register_agent_memory("aurora-swarm", mb=mb)
        else:
            pack = register_persona_embed("astraura-pantheon", mb=mb)
        logger.info(f"💠 [SUB-FED] {kind} publicado al micelio: {pack.get('id')}")
    except Exception as e:
        logger.warning(f"💠 [SUB-FED] no se pudo publicar {kind}: {e}")

    return {
        "ok": True, "kind": kind, "device": dev, "epochs": epochs,
        "vocab": len(vocab), "labels": len(labels),
        "loss_final": round(total_loss / max(1, n), 4),
        "params": sd["total_params"], "mb": mb,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kind", default="agent_memory", choices=["agent_memory", "persona_embed"])
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--device", default="auto")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO)
    print(json.dumps(train_subsystem(args.kind, args.epochs, args.device), ensure_ascii=False))


if __name__ == "__main__":
    main()
