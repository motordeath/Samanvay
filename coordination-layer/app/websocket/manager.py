from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import logging

logger = logging.getLogger("samanvay.websocket")

class ConnectionManager:
    def __init__(self):
        # Maps org_id -> set of WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, token: str, org_id: str):
        # 1. Validate JWT / session explicitly
        if not self._validate_token(token):
            await websocket.close(code=1008, reason="Invalid token")
            return False
            
        await websocket.accept()
        
        # 2. Scope subscriptions to org context to prevent cross-org leakage
        if org_id not in self.active_connections:
            self.active_connections[org_id] = set()
        self.active_connections[org_id].add(websocket)
        
        logger.info(json.dumps({"event": "ws_connect", "org_id": org_id}))
        return True

    def _validate_token(self, token: str) -> bool:
        # TODO: Implement actual JWT validation logic (verify signature, expiration)
        # For boilerplate, we ensure it's provided.
        return token is not None and len(token) > 0

    def disconnect(self, websocket: WebSocket, org_id: str):
        if org_id in self.active_connections:
            self.active_connections[org_id].discard(websocket)
            if not self.active_connections[org_id]:
                del self.active_connections[org_id]
        logger.info(json.dumps({"event": "ws_disconnect", "org_id": org_id}))

    async def broadcast_to_org(self, org_id: str, message: dict):
        if org_id in self.active_connections:
            logger.info(json.dumps({"event": "ws_broadcast", "org_id": org_id, "channel": message.get("type", "update")}))
            dead_connections = set()
            for connection in self.active_connections[org_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_connections.add(connection)
                    
            for dead in dead_connections:
                self.disconnect(dead, org_id)

ws_manager = ConnectionManager()
