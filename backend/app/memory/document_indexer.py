import os
import hashlib
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import pypdf

from ..core.config import settings
from .vector_store import vector_store
from .knowledge_graph import knowledge_graph

class DocumentIndexer:
    """
    Scans and indexes workspace documents (PDFs, Markdown, text, code),
    chunks them for the vector store, and extracts conceptual entities 
    into the associative knowledge graph.
    """
    def __init__(self, workspace_path: Optional[Path] = None):
        self.workspace_path = workspace_path or settings.workspace_path
        self.indexed_files_manifest = settings.data_path / "indexed_files.json"
        self.manifest: Dict[str, str] = self._load_manifest()

    def _load_manifest(self) -> Dict[str, str]:
        if self.indexed_files_manifest.exists():
            try:
                with open(self.indexed_files_manifest, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _save_manifest(self):
        with open(self.indexed_files_manifest, "w", encoding="utf-8") as f:
            json.dump(self.manifest, f, indent=2)

    def _file_hash(self, path: Path) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            while chunk := f.read(8192):
                h.update(chunk)
        return h.hexdigest()

    def extract_text_from_pdf(self, pdf_path: Path) -> str:
        text = ""
        try:
            reader = pypdf.PdfReader(str(pdf_path))
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                text += f"\n[Página {i+1}]\n" + page_text
        except Exception as e:
            text = f"Error reading PDF {pdf_path.name}: {str(e)}"
        return text

    def chunk_text(self, text: str, chunk_size: int = 750, overlap: int = 150) -> List[str]:
        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            if len(chunk.strip()) > 30:
                chunks.append(chunk)
            i += (chunk_size - overlap)
        return chunks

    def extract_concepts_from_chunk(self, text: str, source_name: str):
        """
        Rule & pattern extraction to populate the Knowledge Graph.
        """
        t_lower = text.lower()
        
        # Concept map definitions
        rules = [
            ("1.58 bits", "Arquitectura 1.58-bit", "Architecture", "Paradigma de redes neuronales con pesos en {-1, 0, 1}"),
            ("bitnet", "BitNet b1.58", "Model", "Familia de modelos 1-bit de Microsoft"),
            ("bitnet.cpp", "bitnet.cpp", "Engine", "Motor de inferencia nativo de alto rendimiento en C++ con SIMD/NEON"),
            ("matmul", "MatMul Elimination", "Optimization", "Reemplazo de multiplicaciones de matrices por sumas y restas"),
            ("muro de memoria", "Memory Wall", "Hardware", "Cuello de botella de ancho de banda resuelto por 1.58 bits"),
            ("astraura", "Astraura Core", "Agent", "Orquestador contextual consciente del entorno físico y digital"),
            ("starseed", "StarSeed OS", "Ecosystem", "Sistema operativo descentralizado para nodos locales y comunitarios"),
            ("cuantización", "Quantization int2", "Math", "Empaquetado de pesos ternarios en formato de 2 bits (i2_s)"),
            ("offloading", "Hardware Offloading", "Hardware", "Estrategias de distribución de capas y memoria entre CPU y RAM"),
            ("libremesh", "LibreMesh P2P", "Network", "Redes comunitarias en malla donde opera la IA en el edge"),
            ("apple silicon", "Apple Silicon M1/M2/M3", "Hardware", "Procesadores ARM con instrucciones vectoriales NEON y memoria unificada")
        ]

        detected = []
        for keyword, label, category, desc in rules:
            if keyword in t_lower:
                node_id = knowledge_graph.add_node(label, label, category=category, description=desc, strength=0.8)
                detected.append(node_id)

        # Create relations between co-occurring concepts
        for i in range(len(detected)):
            for j in range(i + 1, len(detected)):
                knowledge_graph.add_edge(detected[i], detected[j], relation="co-ocurre_en_" + source_name[:15], weight=0.7)

    def scan_and_index(self, force: bool = False) -> Dict[str, Any]:
        """
        Scans workspace directory for all PDF, MD, and TXT files and indexes them.
        """
        indexed_count = 0
        total_chunks = 0
        processed_files = []

        for p in self.workspace_path.glob("**/*"):
            if ".venv" in p.parts or ".git" in p.parts or "node_modules" in p.parts or "data" in p.parts:
                continue
            
            if p.suffix.lower() in [".pdf", ".md", ".txt"]:
                rel_path = str(p.relative_to(self.workspace_path))
                fhash = self._file_hash(p)
                
                if not force and self.manifest.get(rel_path) == fhash:
                    continue # Already indexed
                    
                # Extract text
                if p.suffix.lower() == ".pdf":
                    content = self.extract_text_from_pdf(p)
                else:
                    try:
                        content = p.read_text(encoding="utf-8")
                    except Exception:
                        content = ""

                if not content.strip():
                    continue

                # Chunk and index into vector store
                chunks = self.chunk_text(content)
                for idx, chunk in enumerate(chunks):
                    vector_store.add_document(
                        text=chunk,
                        metadata={
                            "source": p.name,
                            "path": rel_path,
                            "chunk_idx": idx,
                            "total_chunks": len(chunks)
                        },
                        auto_rebuild=False
                    )
                    self.extract_concepts_from_chunk(chunk, p.name)
                    total_chunks += 1

                self.manifest[rel_path] = fhash
                indexed_count += 1
                processed_files.append(p.name)

        if total_chunks > 0:
            vector_store.rebuild_idf()
            vector_store.save()
            self._save_manifest()

        return {
            "indexed_files_count": indexed_count,
            "new_chunks_added": total_chunks,
            "files_processed": processed_files,
            "total_documents_in_store": len(vector_store.documents),
            "total_knowledge_nodes": len(knowledge_graph.nodes),
            "total_knowledge_edges": len(knowledge_graph.edges)
        }

document_indexer = DocumentIndexer()

if __name__ == "__main__":
    result = document_indexer.scan_and_index()
    print(json.dumps(result, indent=2))
