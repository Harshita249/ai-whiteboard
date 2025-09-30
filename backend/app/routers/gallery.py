# backend/app/routers/gallery.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List

from app.db import AsyncSessionLocal
from app import models
from app.auth import get_current_user

router = APIRouter(prefix="/api/gallery", tags=["gallery"])

class DiagramIn(BaseModel):
    title: str
    data: str  # Data URL (base64 png)

class DiagramOut(BaseModel):
    id: int
    title: str
    data_json: str

    class Config:
        orm_mode = True

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@router.post("/", response_model=DiagramOut)
async def save_diagram(payload: DiagramIn, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    diag = models.Diagram(owner=user.username, title=payload.title, data_json=payload.data)
    db.add(diag)
    await db.commit()
    await db.refresh(diag)
    return diag

@router.get("/", response_model=List[DiagramOut])
async def list_diagrams(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(select(models.Diagram).where(models.Diagram.owner == user.username))
    return result.scalars().all()

@router.delete("/{diagram_id}")
async def delete_diagram(diagram_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(select(models.Diagram).where(models.Diagram.id == diagram_id, models.Diagram.owner == user.username))
    diag = result.scalars().first()
    if not diag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagram not found")
    await db.delete(diag)
    await db.commit()
    return {"ok": True}
