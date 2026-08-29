"""llm_federated_trainer.py — Entrenamiento federado LOCAL del LLM 1.58-bit
============================================================================

Entrena un modelo de CONOCIMIENTO ligero sobre el corpus local de Astraura
(starseed_memory_root: 47k fragmentos) en GPU local (MPS en M1, prioridad
local segun la instruccion del dueno: sin cuotas externas). El modelo aprende
a mapear fragmentos de conocimiento a su rama/categoria (tarea self-supervised
de conocimiento), y sus pesos se cuantizan a 1.58-bit (ternario + weight
indexing) y se publican al micelio de conocimiento como 'llm_delta'.

Esto es el "entrenamiento del conocimiento para TODA la IA" que el dueno pidio:
el LLM no es solo inferencia, entrena y comparte su conocimiento de forma
simbiotica con la colonia (voz + agentes + personalidades + cerebros).

Pipeline:
  1. Carga fragmentos de data/starseed_memory_root/memory_docs.json
  2. Construye vocabulario + etiquetas de rama
  3. Entrena MLP pequeno en MPS (epochs configurables)
  4. Cuantiza pesos a ternario {-1,0,1} + weight indexing (igual que voice158)
  5. Emite register_llm_delta() al micelio (Neural Tissue astraura_voice_mesh)
  6. Integra deltas remotos de la colonia via mesh_network.apply_federated_updates

Uso:
  .venv/bin/python app/core/llm_federated_trainer.py [--epochs N] [--device mps]
"""

from __future__ import annotations
import argparse
import json
import logging
import math
import os
import sys
import time
from pathlib import Path

logger = logging.getLogger("astraura.llm_federated_trainer")

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


# ---------------------------------------------------------------------------
# Corpus local de conocimiento (starseed_memory_root)
# ---------------------------------------------------------------------------
def load_corpus(max_items: int = 3000) -> list:
    """Carga fragmentos de conocimiento del memory root local."""
    candidates = [
        Path("data/starseed_memory_root/memory_docs.json"),
        Path(__file__).resolve().parent.parent.parent / "data" / "starseed_memory_root" / "memory_docs.json",
    ]
    for p in candidates:
        if p.exists():
            try:
                docs = json.loads(p.read_text(encoding="utf-8"))
                if isinstance(docs, list):
                    return docs[:max_items]
            except Exception as e:
                logger.warning(f"💠 [LLM-FED] no se pudo leer {p}: {e}")
    return []


def build_vocab(docs: list, top: int = 2000) -> tuple:
    """Vocabulario de palabras + etiquetas de rama (categoria del fragmento)."""
    from collections import Counter
    counter = Counter()
    labels = set()
    for d in docs:
        text = (d.get("content") or d.get("name") or "")
        words = [w.lower() for w in text.split() if len(w) > 2]
        counter.update(words)
        # Rama: deriva de la ruta/name (p.ej. "[Medio Enrutado]" o prefijo de rama)
        name = d.get("name", "")
        branch = name.split("]")[0].replace("[", "").strip() if "]" in name else (d.get("branch") or "general")
        labels.add(branch)
    vocab = [w for w, _ in counter.most_common(top)]
    w2i = {w: i for i, w in enumerate(vocab)}
    labels = sorted(labels)
    l2i = {l: i for i, l in enumerate(labels)}
    return vocab, w2i, labels, l2i


def featurize(doc: dict, w2i: dict) -> list:
    """Bag-of-words del fragmento como indices de vocabulario."""
    text = (doc.get("content") or doc.get("name") or "")
    words = [w.lower() for w in text.split() if len(w) > 2]
    return [w2i[w] for w in words if w in w2i]


def label_of(doc: dict, l2i: dict) -> int:
    name = doc.get("name", "")
    branch = name.split("]")[0].replace("[", "").strip() if "]" in name else (doc.get("branch") or "general")
    return l2i.get(branch, l2i.get("general", 0))


# ---------------------------------------------------------------------------
# Modelo de conocimiento 1.58-bit (MLP ternario)
# ---------------------------------------------------------------------------
if _TORCH:
    class KnowledgeMLP(nn.Module):
        """MLP pequeno de conocimiento. Los pesos se cuantizan a ternario tras entrenar."""

        def __init__(self, n_vocab: int, n_hidden: int, n_labels: int):
            super().__init__()
            self.emb = nn.EmbeddingBag(n_vocab, n_hidden, mode="mean")
            self.fc = nn.Linear(n_hidden, n_labels)
            self.n_vocab = n_vocab
            self.n_hidden = n_hidden
            self.n_labels = n_labels

        def forward(self, idx: torch.Tensor) -> torch.Tensor:
            if idx.numel() == 0:
                idx = torch.zeros(1, dtype=torch.long)
            # idx es 1D (un bag = un fragmento). EmbeddingBag requiere offsets.
            # Un solo bag que cubre todo el fragmento -> offsets=[0].
            offsets = torch.zeros(1, dtype=torch.long, device=idx.device)
            x = self.emb(idx, offsets)
            return self.fc(x)
else:
    KnowledgeMLP = None  # torch no disponible en este entorno (CPU-only BitNet)


def quantize_state_dict_158(sd: dict) -> dict:
    """Cuantiza todos los tensores float a ternario {-1,0,1} + weight indexing.
    Igual formato que trainer_bittts (1.58-bit)."""
    out = {}
    total = 0
    n_tern = 0
    for k, v in sd.items():
        if not hasattr(v, "numel") or v.numel() == 0:
            continue
        arr = v.detach().cpu().float().numpy().ravel()
        scale = (abs(arr).max() + 1e-8) / 1.0  # ternario en [-1,1]
        q = (arr / scale).round().astype("int8")  # -1,0,1
        out[k] = {"q": q.tolist(), "scale": float(scale), "shape": list(v.shape)}
        total += arr.size
        n_tern += int((q != 0).sum())
    return {"meta": out, "total_params": total, "nonzero_tern": n_tern}


# ---------------------------------------------------------------------------
# Entrenamiento local + publicacion al micelio
# ---------------------------------------------------------------------------
def train_local(epochs: int = 3, device: str = "mps", max_items: int = 3000) -> dict:
    """Entrena el modelo de conocimiento en GPU local y emite llm_delta al micelio."""
    assert _TORCH, "torch no disponible"
    dev = _device(device)
    logger.info(f"💠 [LLM-FED] dispositivo: {dev}")
    docs = load_corpus(max_items)
    if not docs:
        logger.warning("💠 [LLM-FED] sin corpus local; no se entrena")
        return {"ok": False, "reason": "no-corpus"}
    vocab, w2i, labels, l2i = build_vocab(docs, top=2000)
    logger.info(f"💠 [LLM-FED] vocab={len(vocab)} ramas={len(labels)} fragmentos={len(docs)}")

    model = KnowledgeMLP(len(vocab), 64, max(2, len(labels))).to(dev)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()

    # Dataset (indices, label)
    pairs = []
    for d in docs:
        idx = featurize(d, w2i)
        if idx:
            pairs.append((idx, label_of(d, l2i)))
    if not pairs:
        logger.warning("💠 [LLM-FED] sin pares utilizables")
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
            out = model(x)
            loss = loss_fn(out, y)
            loss.backward()
            opt.step()
            running += loss.item()
            steps += 1
        total_loss += running
        n += steps
        logger.info(f"💠 [LLM-FED] epoch {ep}/{epochs} loss={running / max(1, steps):.4f} steps={steps}")

    # Cuantiza a 1.58-bit y emite al micelio
    sd = quantize_state_dict_158(model.state_dict())
    mb = round(sum(len(v["q"]) for v in sd["meta"].values()) * 1 / 8 / 1024 / 1024, 6)
    logger.info(f"💠 [LLM-FED] modelo cuantizado: {sd['total_params']} params, ~{mb} MB")

    # Publica al micelio de conocimiento (hook ya cableado en collect_federated_delta,
    # pero aqui emitimos directo tras entrenar localmente).
    try:
        from .knowledge_mycelium import register_llm_delta
        pack = register_llm_delta(epoch=epochs, mb=mb, layers=len(sd["meta"]))
        logger.info(f"💠 [LLM-FED] llm_delta publicado al micelio: {pack.get('id')}")
    except Exception as e:
        logger.warning(f"💠 [LLM-FED] no se pudo publicar llm_delta: {e}")

    # Integra deltas remotos de la colonia (votacion por mayoría)
    try:
        from . import mesh_network
        merged = mesh_network.apply_federated_updates()
        if merged.get("ok"):
            logger.info(f"💠 [LLM-FED] deltas remotos integrados: {merged.get('deltas_agregados')} agregados")
    except Exception as e:
        logger.debug(f"💠 [LLM-FED] merge remoto degradó: {e}")

    return {
        "ok": True,
        "device": dev,
        "epochs": epochs,
        "vocab": len(vocab),
        "branches": len(labels),
        "loss_final": round(total_loss / max(1, n), 4),
        "params": sd["total_params"],
        "mb": mb,
        "llm_delta": True,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--device", default="auto")
    ap.add_argument("--max-items", type=int, default=3000)
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO)
    res = train_local(args.epochs, args.device, args.max_items)
    print(json.dumps(res, ensure_ascii=False))


if __name__ == "__main__":
    main()
