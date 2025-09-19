from fastapi import WebSocket
from typing import Dict, List
import asyncio

class ConnectionManager:
    def __init__(self):
        # rooms: room_id -> list of websockets
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, room: str, websocket: WebSocket):
        await websocket.accept()
        self.rooms.setdefault(room, []).append(websocket)

    def disconnect(self, room: str, websocket: WebSocket):
        if room in self.rooms and websocket in self.rooms[room]:
            self.rooms[room].remove(websocket)

    async def broadcast(self, room: str, message: dict, exclude: WebSocket = None):
        conns = self.rooms.get(room, [])
        to_remove = []
        for conn in conns:
            try:
                if conn is exclude:
                    continue
                await conn.send_json(message)
            except Exception:
                to_remove.append(conn)
        for r in to_remove:
            self.disconnect(room, r)
