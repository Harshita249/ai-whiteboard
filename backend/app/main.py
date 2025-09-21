import os
import json
import base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List
from dotenv import load_dotenv
from sqlmodel import Session

from .db import create_db_and_tables, get_session
from . import models, schemas, crud, auth, ai_service, websocket_manager

load_dotenv()
create_db_and_tables()

app = FastAPI(title="AI Whiteboard Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = websocket_manager.ConnectionManager()

# ----------- API Routes -----------
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
def save_diagram(payload: schemas.DiagramCreate, session: Session = Depends(get_session)):
    owner_id = 1  # simplify demo
    d = crud.create_diagram(session, owner_id=owner_id, title=payload.title, data=payload.data, thumbnail=payload.thumbnail)
    return {"id": d.id, "title": d.title}

@app.get("/diagrams", response_model=List[dict])
def list_diagrams(session: Session = Depends(get_session)):
    owner_id = 1
    items = crud.list_diagrams_for_user(session, owner_id)
    return [{"id": i.id, "title": i.title, "data": i.data, "thumbnail": i.thumbnail} for i in items]

@app.post("/ai/clean")
async def ai_clean(file: UploadFile = File(...)):
    b = await file.read()
    b64 = base64.b64encode(b).decode()
    resp = ai_service.clean_diagram_from_base64(b64)
    return resp

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except:
                message = {"type": "raw", "payload": data}
            await manager.broadcast(room_id, message, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)

# ----------- Serve Frontend -----------
frontend_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

@app.get("/")
async def root():
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not built yet"}
