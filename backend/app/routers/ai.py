from fastapi import APIRouter, File, UploadFile
import base64

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/cleanup")
async def cleanup(image: UploadFile = File(...)):
    # Just return same image base64 for now
    data = await image.read()
    encoded = "data:image/png;base64," + base64.b64encode(data).decode()
    return {"cleaned_png": encoded}
