from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from app.db import AsyncSessionLocal
from app import models, auth
from app.schemas import DiagramIn

router = APIRouter(prefix="/api/gallery", tags=["gallery"])

@router.post("/")
async def save_gallery(item: DiagramIn, user: models.User = Depends(auth.get_current_user)):
    async with AsyncSessionLocal() as session:
        db_item = models.GalleryItem(owner_id=user.id, data_json=item.data_json)
        session.add(db_item)
        await session.commit()
        await session.refresh(db_item)
        return {"id": db_item.id, "data_json": db_item.data_json}

@router.get("/")
async def list_gallery(user: models.User = Depends(auth.get_current_user)):
    async with AsyncSessionLocal() as session:
        q = await session.execute(select(models.GalleryItem).filter_by(owner_id=user.id))
        items = q.scalars().all()
        return [{"id": i.id, "data_json": i.data_json} for i in items]

@router.get("/{item_id}")
async def get_gallery_item(item_id: int, user: models.User = Depends(auth.get_current_user)):
    async with AsyncSessionLocal() as session:
        q = await session.execute(select(models.GalleryItem).filter_by(id=item_id, owner_id=user.id))
        item = q.scalars().first()
        if not item:
            raise HTTPException(404, "Item not found")
        return {"id": item.id, "data_json": item.data_json}

@router.delete("/{item_id}")
async def delete_gallery_item(item_id: int, user: models.User = Depends(auth.get_current_user)):
    async with AsyncSessionLocal() as session:
        q = await session.execute(select(models.GalleryItem).filter_by(id=item_id, owner_id=user.id))
        item = q.scalars().first()
        if not item:
            raise HTTPException(404, "Item not found")
        await session.delete(item)
        await session.commit()
        return {"status": "deleted", "id": item_id}
