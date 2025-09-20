import os
import base64
import json
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from dotenv import load_dotenv

from .db import create_db_and_tables, get_session
from . import models, schemas, crud, auth, ai_service, websocket_manager

# Load environment variables
load_dotenv()

# Create DB tables if not exists
create_db_and_tables()

# FastAPI app
app = FastAPI(title="AI Whiteboard Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket manager
manager = websocket_manager.ConnectionManager()


# ✅ Root endpoint (fixes Railway "Not Found")
@app.get("/")
def root():
    return {"message": "AI Whiteboard backend is running!"}


# ---------------- AUTH ---------------- #

@app.post("/auth/register", response_model=dict)
def register(u: schemas.UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(models.User).where(models.User.username == u.username)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = crud.create_user(session, u.username, u.password, u.email)
    return {"id": user.id, "username": user.username}


@app.post("/auth/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, session: Session = Depends(get_session)):
    user = crud.authenticate_user(session, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = auth.create_access_token({"sub": user.username, "user_id": user.id})
    return {"access_token": token, "token_type": "bearer"}


# ---------------- DIAGRAMS ---------------- #

@app.post("/diagrams", response_model=dict)
def save_diagram(
    payload: schemas.DiagramCreate,
    token: str = Depends(auth.get_current_token),
    session: Session = Depends(get_session),
):
    user_id = token.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    d = crud.create_diagram(
        session,
        owner_id=user_id,
        title=payload.title,
        data=payload.data,
        thumbnail=payload.thumbnail,
    )
    return {"id": d.id, "title": d.title}


@app.get("/diagrams", response_model=List[dict])
def list_diagrams(
    token: str = Depends(auth.get_current_token),
    session: Session = Depends(get_session),
):
    user_id = token.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    items = crud.list_diagrams_for_user(session, user_id)
    return [
        {"id": i.id, "title": i.title, "data": i.data, "thumbnail": i.thumbnail}
        for i in items
    ]


# ---------------- AI CLEANING ---------------- #

@app.post("/ai/clean")
async def ai_clean(file: UploadFile = File(...)):
    """
    Receive an image (screenshot) from frontend and return cleaned shape commands.
    """
    b = await file.read()
    b64 = base64.b64encode(b).decode()
    resp = ai_service.clean_diagram_from_base64(b64)
    return resp


# ---------------- WEBSOCKETS ---------------- #

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except Exception:
                message = {"type": "raw", "payload": data}
            await manager.broadcast(room_id, message, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
