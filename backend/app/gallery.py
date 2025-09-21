
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .schemas import DiagramIn
from .models import Diagram
from .db import AsyncSessionLocal
from typing import List, Optional

router = APIRouter(prefix="/api/gallery", tags=["gallery"])

@router.post("/", summary="Save diagram to gallery")
async def save_diagram(diagram: DiagramIn, authorization: Optional[str] = Header(None)):
    owner = "anonymous"
    if authorization and authorization.lower().startswith("bearer "):
        owner = authorization.split(" ",1)[1]  # for demo, token string shown; in prod decode token
    async with AsyncSessionLocal() as session:
        db_diagram = Diagram(owner=owner, title=diagram.title or "Untitled", data_json=diagram.data_json)
        session.add(db_diagram)
        await session.commit()
        await session.refresh(db_diagram)
        return {"id": db_diagram.id, "title": db_diagram.title}

@router.get("/", summary="List gallery diagrams")
async def list_diagrams():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Diagram).order_by(Diagram.created_at.desc()).limit(100))
        rows = result.scalars().all()
        return [{"id": r.id, "title": r.title, "data_json": r.data_json} for r in rows]

@router.get("/{diagram_id}", summary="Get diagram by id")
async def get_diagram(diagram_id: int):
    async with AsyncSessionLocal() as session:
        result = await session.get(Diagram, diagram_id)
        if not result:
            raise HTTPException(status_code=404, detail="Diagram not found")
        return {"id": result.id, "title": result.title, "data_json": result.data_json}
