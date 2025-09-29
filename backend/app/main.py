from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from . import db, models
from .auth import router as auth_router
from .routers import gallery, ai

app = FastAPI()

# Create tables
models.Base.metadata.create_all(bind=db.engine)

# Allow frontend calls (if served separately during dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(auth_router)
app.include_router(gallery.router)
app.include_router(ai.router)

# Serve frontend build
app.mount("/", StaticFiles(directory="dist", html=True), name="static")
