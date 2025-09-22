import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import select

from .db import engine, Base, AsyncSessionLocal
from . import models, auth, gallery, ai_service
from .ws_manager import manager
from .schemas import UserCreate, Token, DiagramIn

app = FastAPI(title="AI Whiteboard Backend")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(gallery.router)
app.include_router(ai_service.router)

# --- DB Startup ---
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# --- Auth Routes ---
@app.post("/api/register")
async def register(user: UserCreate):
    async with AsyncSessionLocal() as session:
        q = await session.execute(select(models.User).filter_by(username=user.username))
        if q.scalars().first():
            raise HTTPException(400, "username exists")
        hashed = auth.get_password_hash(user.password)
        u = models.User(username=user.username, hashed_password=hashed)
        session.add(u)
        await session.commit()
        return {"ok": True, "username": user.username}

@app.post("/api/login", response_model=Token)
async def login(user: UserCreate):
    async with AsyncSessionLocal() as session:
        q = await session.execute(select(models.User).filter_by(username=user.username))
        u = q.scalars().first()
        if not u or not auth.verify_password(user.password, u.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = auth.create_access_token({"sub": u.username})
        return {"access_token": token, "token_type": "bearer"}

# --- WebSocket ---
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(room_id, data)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)

# --- Health Check ---
@app.get("/ping")
async def ping():
    return {"ok": True}

# --- React Frontend ---
# Serve React frontend
app.mount("/static", StaticFiles(directory="dist/assets"), name="static")

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if full_path.startswith("api") or full_path.startswith("ws"):
        return {"error": "Not Found"}  # don't override APIs
    return FileResponse("dist/index.html")

