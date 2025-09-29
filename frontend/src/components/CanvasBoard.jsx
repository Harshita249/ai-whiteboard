import React, { useRef, useEffect, useState } from "react";
import axios from "axios";

export default function CanvasBoard() {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [overlayCtx, setOverlayCtx] = useState(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState(null);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [gallery, setGallery] = useState([]);

  // --- Setup canvas ---
  useEffect(() => {
    const c = canvasRef.current;
    const o = overlayRef.current;
    if (!c || !o) return;

    c.width = o.width = c.parentElement.offsetWidth;
    c.height = o.height = c.parentElement.offsetHeight;

    setCtx(c.getContext("2d"));
    setOverlayCtx(o.getContext("2d"));

    window.addEventListener("resize", () => {
      const image = c.toDataURL();
      c.width = o.width = c.parentElement.offsetWidth;
      c.height = o.height = c.parentElement.offsetHeight;
      const img = new Image();
      img.onload = () => ctx?.drawImage(img, 0, 0);
      img.src = image;
    });
  }, []);

  // --- Toolbar listeners ---
  useEffect(() => {
    const onTool = (e) => setTool(e.detail.tool);
    const onColor = (e) => setColor(e.detail.color);
    const onAction = (e) => handleAction(e.detail.name);

    window.addEventListener("tool-change", onTool);
    window.addEventListener("color-change", onColor);
    window.addEventListener("action", onAction);

    return () => {
      window.removeEventListener("tool-change", onTool);
      window.removeEventListener("color-change", onColor);
      window.removeEventListener("action", onAction);
    };
  }, [ctx]);

  // --- Save state for undo ---
  const pushHistory = () => {
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory((h) => [...h, data]);
    setRedoStack([]);
  };

  // --- Drawing handlers ---
  const startDraw = (e) => {
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStart({ x, y });
    setDrawing(true);
    if (tool === "pen" || tool === "eraser") {
      pushHistory();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e) => {
    if (!drawing || !ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "pen") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === "eraser") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 20;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      overlayCtx.strokeStyle = color;
      overlayCtx.lineWidth = 2;

      if (tool === "rect") {
        overlayCtx.strokeRect(start.x, start.y, x - start.x, y - start.y);
      } else if (tool === "ellipse") {
        overlayCtx.beginPath();
        overlayCtx.ellipse(
          (start.x + x) / 2,
          (start.y + y) / 2,
          Math.abs(x - start.x) / 2,
          Math.abs(y - start.y) / 2,
          0,
          0,
          2 * Math.PI
        );
        overlayCtx.stroke();
      } else if (tool === "line") {
        overlayCtx.beginPath();
        overlayCtx.moveTo(start.x, start.y);
        overlayCtx.lineTo(x, y);
        overlayCtx.stroke();
      } else if (tool === "arrow") {
        overlayCtx.beginPath();
        overlayCtx.moveTo(start.x, start.y);
        overlayCtx.lineTo(x, y);
        overlayCtx.stroke();
        const angle = Math.atan2(y - start.y, x - start.x);
        overlayCtx.lineTo(
          x - 10 * Math.cos(angle - Math.PI / 6),
          y - 10 * Math.sin(angle - Math.PI / 6)
        );
        overlayCtx.moveTo(x, y);
        overlayCtx.lineTo(
          x - 10 * Math.cos(angle + Math.PI / 6),
          y - 10 * Math.sin(angle + Math.PI / 6)
        );
        overlayCtx.stroke();
      }
    }
  };

  const endDraw = (e) => {
    if (!drawing || !ctx) return;
    setDrawing(false);

    if (tool === "rect" || tool === "ellipse" || tool === "line" || tool === "arrow") {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      pushHistory();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      if (tool === "rect") {
        ctx.strokeRect(start.x, start.y, x - start.x, y - start.y);
      } else if (tool === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(
          (start.x + x) / 2,
          (start.y + y) / 2,
          Math.abs(x - start.x) / 2,
          Math.abs(y - start.y) / 2,
          0,
          0,
          2 * Math.PI
        );
        ctx.stroke();
      } else if (tool === "line") {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (tool === "arrow") {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        const angle = Math.atan2(y - start.y, x - start.x);
        ctx.lineTo(
          x - 10 * Math.cos(angle - Math.PI / 6),
          y - 10 * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x, y);
        ctx.lineTo(
          x - 10 * Math.cos(angle + Math.PI / 6),
          y - 10 * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
      overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
  };

  // --- Actions ---
  const handleAction = async (name) => {
    if (!ctx) return;
    if (name === "undo") {
      if (history.length === 0) return;
      const last = history[history.length - 1];
      setRedoStack((r) => [...r, ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)]);
      ctx.putImageData(last, 0, 0);
      setHistory((h) => h.slice(0, -1));
    } else if (name === "redo") {
      if (redoStack.length === 0) return;
      const redo = redoStack[redoStack.length - 1];
      ctx.putImageData(redo, 0, 0);
      setRedoStack((r) => r.slice(0, -1));
    } else if (name === "save") {
      const dataUrl = canvasRef.current.toDataURL();
      await axios.post("/api/gallery", { title: "Diagram", data: dataUrl });
      loadGallery();
    } else if (name === "download") {
      const link = document.createElement("a");
      link.download = "whiteboard.png";
      link.href = canvasRef.current.toDataURL();
      link.click();
    } else if (name === "aiClean") {
      alert("AI Clean placeholder");
    }
  };

  // --- Gallery ---
  const loadGallery = async () => {
    const res = await axios.get("/api/gallery");
    setGallery(res.data || []);
  };

  const deleteFromGallery = async (id) => {
    await axios.delete(`/api/gallery/${id}`);
    loadGallery();
  };

  useEffect(() => {
    loadGallery();
  }, []);

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ flex: 1, position: "relative", border: "2px solid #ccc", borderRadius: 8 }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
        />
        <canvas
          ref={overlayRef}
          style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        />
      </div>

      <div style={{ width: 220, overflowY: "auto", background: "#f9fafb", padding: 10, borderRadius: 8 }}>
        <h3>Gallery</h3>
        {gallery.map((g) => (
          <div key={g.id} style={{ marginBottom: 10 }}>
            <img src={g.data_json} alt={g.title} style={{ width: "100%" }} />
            <button onClick={() => deleteFromGallery(g.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
