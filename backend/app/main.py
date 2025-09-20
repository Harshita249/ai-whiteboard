import os
import json
import base64
from pathlib import Path
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlmodel import Session, select
from dotenv import load_dotenv

from .db import create_db_and_tables, get_session
from . import models, schemas, crud, auth, ai_service, websocket_manager

load_dotenv()
create_db_and_tables()

app = FastAPI(title="AI Whiteboard (Single-deploy)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = websocket_manager.ConnectionManager()

# API router with prefix /api
api = APIRouter(prefix="/api")


@api.get("/health")
def health():
    return {"status": "ok"}


@api.post("/auth/register", response_model=dict)
def register(u: schemas.UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(models.User).where(models.User.username == u.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = crud.create_user(session, u.username, u.password, u.email)
    return {"id": user.id, "username": user.username}


@api.post("/auth/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, session: Session = Depends(get_session)):
    user = crud.authenticate_user(session, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = auth.create_access_token({"sub": user.username, "user_id": user.id})
    return {"access_token": token, "token_type": "bearer"}


@api.post("/diagrams", response_model=dict)
def save_diagram(payload: schemas.DiagramCreate, token: dict = Depends(auth.get_current_token), session: Session = Depends(get_session)):
    user_id = token.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    d = crud.create_diagram(session, owner_id=user_id, title=payload.title, data=payload.data, thumbnail=payload.thumbnail)
    return {"id": d.id, "title": d.title}

@api.get("/diagrams", response_model=List[dict])
def list_diagrams(token: dict = Depends(auth.get_current_token), session: Session = Depends(get_session)):
    user_id = token.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    items = crud.list_diagrams_for_user(session, user_id)
    return [{"id": i.id, "title": i.title, "data": i.data, "thumbnail": i.thumbnail} for i in items]


@api.post("/ai/clean")
async def ai_clean(file: UploadFile = File(...)):
    b = await file.read()
    b64 = base64.b64encode(b).decode()
    resp = ai_service.clean_diagram_from_base64(b64)
    return resp

# include API router
app.include_router(api)

# WebSocket for real-time
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except:
                message = {"type":"raw","payload":data}
            await manager.broadcast(room_id, message, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)


# Serve frontend (single-deploy). If dist exists, serve SPA; otherwise show JSON root.
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR.parent.joinpath("frontend", "dist")

if FRONTEND_DIST.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIST)), name="static")

    @app.get("/")
    async def serve_index():
        index_file = FRONTEND_DIST / "index.html"
        return FileResponse(index_file)

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if candidate.exists():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def root():
        return JSONResponse({"message":"AI Whiteboard backend is running (frontend not built)."})
