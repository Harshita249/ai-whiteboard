import base64
from PIL import Image
from io import BytesIO

def clean_diagram_from_base64(b64_image: str):
    """
    Very small stub: returns a centered rectangle and a text shape.
    Replace with your ML model / external API integration.
    """
    try:
        header, data = (b64_image.split(",", 1) if "," in b64_image else ("", b64_image))
        imgdata = base64.b64decode(data)
        img = Image.open(BytesIO(imgdata)).convert("RGBA")
        w, h = img.size
        shapes = [
            {
                "type": "rect",
                "left": int(w * 0.12),
                "top": int(h * 0.2),
                "width": int(w * 0.76),
                "height": int(h * 0.56),
                "stroke": "#222222",
                "strokeWidth": 2,
                "fill": "rgba(0,0,0,0)"
            },
            {
                "type": "text",
                "left": int(w * 0.5),
                "top": int(h * 0.06),
                "text": "Cleaned Diagram",
                "fontSize": 20,
                "originX": "center"
            }
        ]
        return {"success": True, "width": w, "height": h, "shapes": shapes}
    except Exception as e:
        return {"success": False, "error": str(e)}
