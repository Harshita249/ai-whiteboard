from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import AsyncSessionLocal
from app import models
from app.auth import get_current_user

router = APIRouter()

async def get_session():
    async with AsyncSessionLocal() as session:
        yield session

@router.get("/")
async def list_gallery(user=Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    q = await session.execute(select(models.Diagram).where(models.Diagram.owner == user.username))
    return q.scalars().all()

@router.post("/")
async def save_diagram(diagram: dict, user=Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    d = models.Diagram(owner=user.username, data=diagram)
    session.add(d)
    await session.commit()
    return {"ok": True, "id": d.id}

@router.delete("/{diagram_id}")
async def delete_diagram(diagram_id: int, user=Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    q = await session.execute(select(models.Diagram).where(models.Diagram.id == diagram_id, models.Diagram.owner == user.username))
    d = q.scalars().first()
    if not d:
        raise HTTPException(404, "Not found")
    await session.delete(d)
    await session.commit()
    return {"ok": True}
