
from typing import Dict, List
from fastapi import WebSocket
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, room: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(room, []).append(websocket)

    def disconnect(self, room: str, websocket: WebSocket):
        if room in self.active_connections:
            self.active_connections[room] = [w for w in self.active_connections[room] if w != websocket]

    async def broadcast(self, room: str, message: dict):
        if room not in self.active_connections:
            return
        coros = []
        for connection in list(self.active_connections[room]):
            try:
                coros.append(connection.send_json(message))
            except Exception:
                pass
        if coros:
            await asyncio.gather(*coros, return_exceptions=True)

manager = ConnectionManager()
