"""
Global State Broadcaster for StarSeed OS / Astraura 1.58-Bit
Ensures 100% real-time state synchronization across all open browser tabs,
installed desktop apps, PWA instances, and mobile web clients.
"""

import json
import asyncio
from typing import Set, Dict, Any, Optional
from fastapi import WebSocket

class GlobalStateBroadcaster:
    """
    Motor de Difusión Global de Estado en Tiempo Real.
    Mantiene todos los clientes (navegador, app instalada, móvil, múltiples pantallas)
    sincronizados como una sola ventana en tiempo real.
    """
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self.last_global_event: Optional[Dict[str, Any]] = None

    async def register(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.add(websocket)
            print(f"📡 [GlobalBroadcaster] Nuevo cliente sincronizado conectado. Total activos: {len(self.active_connections)}")

    async def unregister(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
            print(f"📡 [GlobalBroadcaster] Cliente desconectado. Total activos: {len(self.active_connections)}")

    async def broadcast_state_mutation(self, event_type: str, payload: Dict[str, Any]):
        """
        Transmite una mutación de estado a todas las ventanas y dispositivos conectados.
        """
        message = {
            "type": "sovereign_state_sync",
            "event": event_type,
            "payload": payload,
            "timestamp": asyncio.get_event_loop().time()
        }
        self.last_global_event = message
        
        async with self._lock:
            dead_sockets = set()
            for ws in self.active_connections:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.active_connections.discard(ws)

    def get_sync_telemetry(self) -> Dict[str, Any]:
        return {
            "active_synced_clients": len(self.active_connections),
            "status": "synchronized_mesh" if len(self.active_connections) > 0 else "idle_mesh",
            "last_event": self.last_global_event
        }

global_broadcaster = GlobalStateBroadcaster()
