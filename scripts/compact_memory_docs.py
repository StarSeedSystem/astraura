#!/usr/bin/env python3
"""
compact_memory_docs.py — Compacta el memory root de Astraura (Adenda 153).

Los motores automáticos (imaginación, enrutamiento de medios, sueños, enjambre)
llenaron `memory_docs.json` con decenas de miles de documentos sintéticos
(24 MB) que se reescribían enteros en cada alta y bloqueaban la sincronización.

Este script:
  · separa los documentos AUTOGENERADOS (categorías «Almacenamiento Enrutado»,
    «Exocórtex Autorizado/Sincronizado», «Imaginación…», «Sueño…») de los
    documentos humanos/semilla;
  · conserva los N más recientes por categoría (--keep, defecto 150);
  · archiva el resto comprimido en `starseed_memory_root/archive/` (nada se pierde);
  · escribe el memory root compacto.

Uso: python3 scripts/compact_memory_docs.py [--apply] [--keep 150] [--root data/starseed_memory_root]
Sin --apply solo informa (dry-run).
"""
import argparse
import gzip
import json
import re
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUTOGEN = re.compile(r"^(Almacenamiento Enrutado|Exoc[oó]rtex (Autorizado|Sincronizado)|Imaginaci[oó]n|Sue[ñn]o)", re.I)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--keep", type=int, default=150)
    ap.add_argument("--root", default=None)
    a = ap.parse_args()
    candidates = [Path(a.root)] if a.root else [ROOT / "data" / "starseed_memory_root", ROOT / "backend" / "data" / "starseed_memory_root"]
    root = next((c for c in candidates if (c / "memory_docs.json").exists()), None)
    if not root:
        print("No se encontró memory_docs.json en", [str(c) for c in candidates]); return
    f = root / "memory_docs.json"
    docs = json.loads(f.read_text(encoding="utf-8"))
    if not isinstance(docs, list):
        print("Formato inesperado (no es lista)."); return
    by_cat = defaultdict(list)
    human = []
    for d in docs:
        cat = str(d.get("category") or "")
        (by_cat[cat] if AUTOGEN.match(cat) else human).append(d)
    keep, archive = [], []
    for cat, items in by_cat.items():
        items.sort(key=lambda d: float(d.get("created_at") or 0), reverse=True)
        keep.extend(items[: a.keep]); archive.extend(items[a.keep:])
    compact = human + keep
    size_mb = f.stat().st_size / 1e6
    print(f"Memory root: {f}\n  total {len(docs)} docs · {size_mb:.1f} MB\n  humanos/semilla {len(human)} · autogenerados {sum(len(v) for v in by_cat.values())} en {len(by_cat)} categorías\n  → conservar {len(compact)} · archivar {len(archive)}")
    for cat, items in sorted(by_cat.items(), key=lambda kv: -len(kv[1])):
        print(f"    {len(items):6d}  {cat}")
    if not a.apply:
        print("\n(dry-run) Añade --apply para compactar."); return
    arch_dir = root / "archive"; arch_dir.mkdir(exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    backup = arch_dir / f"memory_docs_full_{stamp}.json.gz"
    with gzip.open(backup, "wt", encoding="utf-8") as g:
        json.dump(docs, g, ensure_ascii=False)
    if archive:
        with gzip.open(arch_dir / f"memory_docs_autogen_{stamp}.json.gz", "wt", encoding="utf-8") as g:
            json.dump(archive, g, ensure_ascii=False)
    f.write_text(json.dumps(compact, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n✓ compactado: {len(compact)} docs · copia completa en {backup.name} · {f.stat().st_size/1e6:.1f} MB")


if __name__ == "__main__":
    main()
