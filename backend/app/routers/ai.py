from fastapi import APIRouter, Depends
from app.auth import get_current_user

router = APIRouter()

@router.post("/cleanup")
async def ai_cleanup(data: dict, user=Depends(get_current_user)):
    # Dummy AI cleanup (replace with real service later)
    cleaned = {"shapes": data.get("shapes", []), "status": "cleaned"}
    return cleaned
