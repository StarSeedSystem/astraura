import json
import math
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from ..core.config import settings

class LocalVectorStore:
    """
    Lightweight, dependency-free local vector and semantic memory engine.
    Uses subword n-gram TF-IDF vectors and cosine similarity for rapid semantic search.
    """
    def __init__(self, persistence_file: Optional[Path] = None):
        self.file_path = persistence_file or (settings.data_path / "vector_store" / "vectors.json")
        self.documents: List[Dict[str, Any]] = []
        self.vocabulary: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self.load()

    def _tokenize(self, text: str) -> List[str]:
        cleaned = re.sub(r"[^\w\s-]", " ", text.lower())
        tokens = [t for t in cleaned.split() if len(t) > 2]
        # Also generate character 3-grams & 4-grams for subword semantics
        subwords = []
        for t in tokens:
            if len(t) >= 4:
                for i in range(len(t) - 3):
                    subwords.append(t[i:i+4])
        return tokens + subwords

    def _compute_vector(self, text: str) -> Dict[str, float]:
        tokens = self._tokenize(text)
        if not tokens:
            return {}
        
        # Term Frequency
        tf: Dict[str, float] = {}
        for t in tokens:
            tf[t] = tf.get(t, 0.0) + 1.0
        
        # Normalize and apply IDF
        vec: Dict[str, float] = {}
        norm_sq = 0.0
        for t, count in tf.items():
            idf_val = self.idf.get(t, 1.5)
            val = (count / len(tokens)) * idf_val
            vec[t] = val
            norm_sq += val * val
            
        norm = math.sqrt(norm_sq) or 1.0
        return {k: v / norm for k, v in vec.items()}

    def _cosine_similarity(self, v1: Dict[str, float], v2: Dict[str, float]) -> float:
        score = 0.0
        # Iterate over smaller dict
        if len(v1) > len(v2):
            v1, v2 = v2, v1
        for k, val in v1.items():
            if k in v2:
                score += val * v2[k]
        return score

    def rebuild_idf(self):
        N = len(self.documents)
        if N == 0:
            return
        df: Dict[str, int] = {}
        for doc in self.documents:
            tokens = set(self._tokenize(doc["text"]))
            for t in tokens:
                df[t] = df.get(t, 0) + 1
        self.idf = {t: math.log((N + 1) / (count + 1)) + 1.0 for t, count in df.items()}
        # Recompute vectors
        for doc in self.documents:
            doc["vector"] = self._compute_vector(doc["text"])

    def add_document(self, text: str, metadata: Optional[Dict[str, Any]] = None, auto_rebuild: bool = True):
        doc_id = f"doc_{len(self.documents) + 1}_{int(Path.cwd().stat().st_mtime)}"
        doc = {
            "id": doc_id,
            "text": text.strip(),
            "metadata": metadata or {},
            "vector": {}
        }
        self.documents.append(doc)
        if auto_rebuild:
            self.rebuild_idf()
            self.save()
        return doc_id

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not self.documents:
            return []
        
        q_vec = self._compute_vector(query)
        scored = []
        for doc in self.documents:
            sim = self._cosine_similarity(q_vec, doc.get("vector", {}))
            if sim > 0.01:
                scored.append({
                    "id": doc["id"],
                    "text": doc["text"],
                    "metadata": doc["metadata"],
                    "similarity": round(float(sim), 4)
                })
                
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]

    def save(self):
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "documents": [
                {"id": d["id"], "text": d["text"], "metadata": d["metadata"]}
                for d in self.documents
            ],
            "idf": self.idf
        }
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def load(self):
        if self.file_path.exists():
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.idf = data.get("idf", {})
                    docs = data.get("documents", [])
                    self.documents = []
                    for d in docs:
                        d["vector"] = self._compute_vector(d["text"])
                        self.documents.append(d)
            except Exception:
                self.documents = []

vector_store = LocalVectorStore()
