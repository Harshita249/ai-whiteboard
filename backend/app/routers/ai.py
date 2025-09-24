from fastapi import APIRouter, UploadFile, File, Depends
from app.auth import get_current_user
from app import models
import base64

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/cleanup")
async def ai_cleanup(
    image: UploadFile = File(...),
    user: models.User = Depends(get_current_user)
):
    content = await image.read()
    b64 = base64.b64encode(content).decode()
    return {"cleaned_png": f"data:image/png;base64,{b64}"}
