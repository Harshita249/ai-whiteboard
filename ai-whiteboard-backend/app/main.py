import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from dotenv import load_dotenv
from .db import create_db_and_tables, get_session
from . import models, schemas, crud, auth, ai_service, websocket_manager
from sqlmodel import Session
import base64
import json

load_dotenv()
create_db_and_tables()

app = FastAPI(title="AI Whiteboard Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # lock this down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = websocket_manager.ConnectionManager()

@app.post("/auth/register", response_model=dict)
def register(u: schemas.UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(models.User.select().where(models.User.username == u.username)).first()
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

@app.post("/diagrams", response_model=dict)
def save_diagram(payload: schemas.DiagramCreate, token: str = None, session: Session = Depends(get_session)):
    # token sent as "Authorization: Bearer <token>" optional; simplified here:
    # For simplicity accept ?token=... or header later. We'll parse in production.
    # Here assume owner_id=1 for demo OR require token in header. For demo allow owner_id 1.
    # In frontend we include the token in a header "Authorization".
    owner_id = 1
    d = crud.create_diagram(session, owner_id=owner_id, title=payload.title, data=payload.data, thumbnail=payload.thumbnail)
    return {"id": d.id, "title": d.title}

@app.get("/diagrams", response_model=List[dict])
def list_diagrams(session: Session = Depends(get_session)):
    owner_id = 1
    items = crud.list_diagrams_for_user(session, owner_id)
    return [{"id": i.id, "title": i.title, "data": i.data, "thumbnail": i.thumbnail} for i in items]

@app.post("/ai/clean")
async def ai_clean(file: UploadFile = File(...)):
    """
    Receive an image (select area screenshot) from the frontend and return cleaned shape commands.
    Frontend should send form-data with a PNG/JPEG.
    """
    b = await file.read()
    b64 = base64.b64encode(b).decode()
    resp = ai_service.clean_diagram_from_base64(b64)
    return resp

# WebSocket endpoint for real-time collaboration
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    # Accept the connection and add to room
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # receive JSON string
            try:
                message = json.loads(data)
            except:
                message = {"type": "raw", "payload": data}
            # Broadcast to other clients in room
            await manager.broadcast(room_id, message, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
