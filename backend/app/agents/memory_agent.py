from typing import Dict, Any, List
from ..memory.vector_store import vector_store
from ..memory.knowledge_graph import knowledge_graph

class MemoryAgent:
    """
    Active memory retrieval agent.
    Searches episodic vector memory and expands the associative knowledge graph 
    to provide relevant background context for the active prompt.
    """
    def __init__(self):
        self.name = "Memory Agent (Mnemosyne)"

    async def retrieve_context(self, query: str) -> Dict[str, Any]:
        # 1. Search semantic vector documents
        doc_matches = vector_store.search(query=query, top_k=3)
        context_chunks = [d["text"] for d in doc_matches]

        # 2. Query associative knowledge graph
        graph_sub = knowledge_graph.query_subgraph(query=query, limit=8)
        
        related_concepts = [n["label"] for n in graph_sub["nodes"]]

        thoughts = [
            f"1. Búsqueda vectorial ejecutada: {len(doc_matches)} fragmentos encontrados con relevancia semántica.",
            f"2. Nodos conceptuales activos en el grafo: {', '.join(related_concepts[:5]) if related_concepts else 'Ninguno directo'}.",
            f"3. Inyectando contexto histórico y conceptual al Orquestador."
        ]

        return {
            "agent": self.name,
            "thoughts": thoughts,
            "context_chunks": context_chunks,
            "related_nodes": graph_sub["nodes"],
            "related_edges": graph_sub["edges"],
            "total_matches": len(doc_matches)
        }

memory_agent = MemoryAgent()
