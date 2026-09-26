"""Aprendizaje continuo de Astraura 1.58 (Ola 268, 2026-09-07).

Capa «Corpus vivo»: captura turnos de chat y generaciones de cognition por
personalidad en JSONL mensual, con limpieza estilo Falcon, filtro de
privacidad, valoraciones y exportación de un train.jsonl listo para LoRA.
"""

from .corpus import APRENDIZAJE_COLECTIVO, CorpusVivo, aprendizaje_de, corpus_vivo

__all__ = ["APRENDIZAJE_COLECTIVO", "CorpusVivo", "aprendizaje_de", "corpus_vivo"]
