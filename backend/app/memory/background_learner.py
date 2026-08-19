import asyncio
import time
import re
from typing import List, Dict, Any, Optional
from .knowledge_graph import knowledge_graph
from .vector_store import vector_store
from ..core.config import settings

class BackgroundLearner:
    """
    Autonomous background cognitive worker for Astraura 1.58-bit AI.
    Runs continuously in second-plane to:
      1. Consolidate recent conversation exchanges into semantic concepts.
      2. Refine associative connections in the Knowledge Graph.
      3. Track and adapt user profile preferences.
      4. Emit real-time cognitive growth events to the frontend.
    """
    def __init__(self):
        self.is_running = False
        self.message_queue: List[Dict[str, Any]] = []
        self.learned_events_log: List[Dict[str, Any]] = []
        self.user_profile: Dict[str, Any] = {
            "preferred_topics": ["1.58-bit Architecture", "Hardware Optimization", "Multi-Agent Systems"],
            "expertise_level": "Advanced / Technical",
            "interaction_count": 0,
            "last_learned_concept": "BitNet b1.58 Ternary Math"
        }
        self.event_callbacks = []

    def register_callback(self, cb):
        self.event_callbacks.append(cb)

    async def emit_event(self, event_type: str, data: Dict[str, Any]):
        event = {
            "timestamp": time.time(),
            "time_formatted": time.strftime("%H:%M:%S"),
            "event_type": event_type,
            "data": data
        }
        self.learned_events_log.append(event)
        if len(self.learned_events_log) > 100:
            self.learned_events_log.pop(0)
            
        for cb in self.event_callbacks:
            try:
                if asyncio.iscoroutinefunction(cb):
                    await cb(event)
                else:
                    cb(event)
            except Exception:
                pass

    def enqueue_interaction(self, user_msg: str, ai_response: str, metadata: Optional[Dict[str, Any]] = None):
        self.message_queue.append({
            "user": user_msg,
            "ai": ai_response,
            "metadata": metadata or {},
            "timestamp": time.time()
        })
        self.user_profile["interaction_count"] += 1

    def _extract_keywords_and_entities(self, text: str) -> List[str]:
        words = re.findall(r"\b[A-Za-z0-9_áéíóúÁÉÍÓÚñÑ]{4,}\b", text)
        stopwords = {
            "para", "como", "este", "esta", "estos", "estas", "pero", "donde", "cuando", "porque",
            "sobre", "entre", "desde", "hasta", "hacia", "hacer", "puede", "pueden", "tiene", "tienen",
            "than", "that", "this", "with", "from", "have", "were", "what", "which", "could", "would"
        }
        filtered = [w.capitalize() for w in words if w.lower() not in stopwords]
        # Return top unique frequent terms
        freq: Dict[str, int] = {}
        for w in filtered:
            freq[w] = freq.get(w, 0) + 1
        sorted_terms = sorted(freq.keys(), key=lambda x: freq[x], reverse=True)
        return sorted_terms[:6]

    async def process_learning_cycle(self):
        """
        Processes pending interactions in queue, distills memories and expands the graph.
        """
        if not self.message_queue:
            return

        batch = list(self.message_queue)
        self.message_queue.clear()

        for item in batch:
            user_text = item["user"]
            ai_text = item["ai"]
            full_exchange = f"Usuario: {user_text}\nAstraura: {ai_text}"

            # 1. Index full exchange in vector store for episodic recall
            vector_store.add_document(
                text=full_exchange,
                metadata={"type": "episodic_memory", "timestamp": item["timestamp"]}
            )

            # 2. Extract potential entities and associations
            entities = self._extract_keywords_and_entities(user_text + " " + ai_text)
            
            created_nodes = []
            if len(entities) >= 2:
                for i in range(len(entities)):
                    term = entities[i]
                    nid = knowledge_graph.add_node(
                        node_id=term,
                        label=term,
                        category="Learned Concept",
                        description=f"Concepto destilado de interacción ({user_text[:35]}...)",
                        strength=0.6
                    )
                    created_nodes.append(nid)
                    
                # Link adjacent extracted entities
                for i in range(len(created_nodes) - 1):
                    knowledge_graph.add_edge(
                        source_id=created_nodes[i],
                        target_id=created_nodes[i+1],
                        relation="asociado_con",
                        weight=0.65
                    )

                self.user_profile["last_learned_concept"] = entities[0]

                await self.emit_event(
                    event_type="concept_consolidated",
                    data={
                        "message": f"Nuevo conocimiento consolidado: {', '.join(entities[:3])}",
                        "entities": entities[:4],
                        "total_nodes": len(knowledge_graph.nodes),
                        "total_edges": len(knowledge_graph.edges)
                    }
                )

    async def start_background_loop(self):
        self.is_running = True
        while self.is_running:
            try:
                await self.process_learning_cycle()
            except Exception as e:
                print(f"[BackgroundLearner] Error in cycle: {e}")
            await asyncio.sleep(settings.background_learning_interval_seconds)

    def stop(self):
        self.is_running = False

background_learner = BackgroundLearner()
