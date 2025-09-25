from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from app.db import AsyncSessionLocal
from app import models
from app.auth import get_current_user

router = APIRouter()

@router.post("/")
async def save_gallery(item: dict, user = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        gi = models.GalleryItem(owner_id=user.id if hasattr(user, "id") else getattr(user, "id", None), data_json=item.get("data_json"))
        session.add(gi)
        await session.commit()
        await session.refresh(gi)
        return {"id": gi.id, "data_json": gi.data_json}

@router.get("/")
async def list_gallery(user = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        q = await session.execute(select(models.GalleryItem).filter_by(owner_id=user.id))
        items = q.scalars().all()
        # return simple list
        return [{"id": it.id, "data_json": it.data_json, "title": getattr(it, "title", None)} for it in items]

@router.delete("/{item_id}")
async def delete_gallery(item_id: int, user = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        q = await session.execute(select(models.GalleryItem).filter_by(id=item_id, owner_id=user.id))
        item = q.scalars().first()
        if not item:
            raise HTTPException(404, "Not found")
        await session.delete(item)
        await session.commit()
        return {"ok": True}
