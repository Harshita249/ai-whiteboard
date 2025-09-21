
from fastapi import APIRouter, Form
import json

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/cleanup", summary="AI cleanup (stub)")
async def ai_cleanup(data_json: str = Form(...)):
    try:
        parsed = json.loads(data_json)
    except Exception:
        parsed = {"error": "invalid json"}
    # Stub - return same data. Replace with real model call.
    return {"ok": True, "cleaned": parsed}
