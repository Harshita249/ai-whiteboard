import React, { useRef, useEffect, useState } from "react";

/**
 * CanvasBoard.jsx
 * Full-featured drawing board with:
 *  - Pen, Eraser, Shapes, Text
 *  - Undo/Redo
 *  - Save + Gallery Integration
 *  - Tooltips + Tool highlight
 *  - AI Clean (clear placeholder)
 */

export default function CanvasBoard({ token }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  // Tools
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);

  // Undo/Redo
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Gallery
  const [gallery, setGallery] = useState([]);

  // Canvas size
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 600 });

  // --- Initialize Canvas ---
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctxRef.current = ctx;
  }, [canvasSize]);

  // --- Handle Tool + Color change via events ---
  useEffect(() => {
    const handleTool = (e) => setTool(e.detail.tool);
    const handleColor = (e) => {
      setColor(e.detail.color);
      if (ctxRef.current) ctxRef.current.strokeStyle = e.detail.color;
    };
    const handleAction = (e) => {
      if (e.detail.name === "undo") handleUndo();
      if (e.detail.name === "redo") handleRedo();
      if (e.detail.name === "save") handleSave();
      if (e.detail.name === "aiClean") handleAIClean();
    };
    window.addEventListener("tool-change", handleTool);
    window.addEventListener("color-change", handleColor);
    window.addEventListener("action", handleAction);
    return () => {
      window.removeEventListener("tool-change", handleTool);
      window.removeEventListener("color-change", handleColor);
      window.removeEventListener("action", handleAction);
    };
  }, []);

  // --- Mouse Down ---
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setStartPoint({ x, y });
    setIsDrawing(true);

    // Save state for undo
    pushToUndo();
  };

  // --- Mouse Move ---
  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "pen") {
      ctxRef.current.lineTo(x, y);
      ctxRef.current.strokeStyle = color;
      ctxRef.current.stroke();
    } else if (tool === "eraser") {
      ctxRef.current.lineTo(x, y);
      ctxRef.current.strokeStyle = "#ffffff";
      ctxRef.current.lineWidth = 20;
      ctxRef.current.stroke();
      ctxRef.current.lineWidth = 2; // reset
    } else if (["rect", "ellipse", "line", "arrow"].includes(tool)) {
      redrawFromUndo();
      previewShape(tool, startPoint, { x, y });
    }
  };

  // --- Mouse Up ---
  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (["rect", "ellipse", "line", "arrow"].includes(tool)) {
      drawShape(tool, startPoint, { x, y });
    } else if (tool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        ctxRef.current.fillStyle = color;
        ctxRef.current.font = "20px Arial";
        ctxRef.current.fillText(text, x, y);
      }
    }

    ctxRef.current.closePath();
  };

  // --- Shape Preview ---
  const previewShape = (tool, start, end) => {
    const ctx = ctxRef.current;
    ctx.strokeStyle = color;
    if (tool === "rect") {
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    } else if (tool === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(
        (start.x + end.x) / 2,
        (start.y + end.y) / 2,
        Math.abs(end.x - start.x) / 2,
        Math.abs(end.y - start.y) / 2,
        0,
        0,
        2 * Math.PI
      );
      ctx.stroke();
    } else if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (tool === "arrow") {
      drawArrow(ctx, start, end);
    }
  };

  // --- Draw Final Shape ---
  const drawShape = (tool, start, end) => {
    previewShape(tool, start, end);
  };

  // --- Draw Arrow helper ---
  const drawArrow = (ctx, start, end) => {
    const headlen = 10;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineTo(
      end.x - headlen * Math.cos(angle - Math.PI / 6),
      end.y - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headlen * Math.cos(angle + Math.PI / 6),
      end.y - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  // --- Undo/Redo Helpers ---
  const pushToUndo = () => {
    const url = canvasRef.current.toDataURL();
    setUndoStack((prev) => [...prev, url]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, canvasRef.current.toDataURL()]);
    restoreFromURL(last);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, canvasRef.current.toDataURL()]);
    restoreFromURL(last);
  };

  const restoreFromURL = (url) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      ctxRef.current.clearRect(0, 0, canvasSize.w, canvasSize.h);
      ctxRef.current.drawImage(img, 0, 0);
    };
  };

  const redrawFromUndo = () => {
    if (undoStack.length === 0) return;
    restoreFromURL(undoStack[undoStack.length - 1]);
  };

  // --- Save ---
  const handleSave = () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = dataUrl;
    link.click();

    // save to gallery
    fetch("/api/gallery/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: `Diagram-${Date.now()}`,
        data_json: dataUrl,
      }),
    }).then(() => loadGallery());
  };

  // --- Gallery Load/Delete ---
  const loadGallery = async () => {
    const res = await fetch("/api/gallery", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setGallery(data);
    }
  };

  const handleDelete = async (id) => {
    await fetch(`/api/gallery/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadGallery();
  };

  // --- AI Clean (placeholder) ---
  const handleAIClean = () => {
    ctxRef.current.clearRect(0, 0, canvasSize.w, canvasSize.h);
    setUndoStack([]);
    setRedoStack([]);
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const down = (e) => {
      if (e.ctrlKey && e.key === "z") handleUndo();
      if (e.ctrlKey && e.key === "y") handleRedo();
      if (e.key === "Delete") handleAIClean();
      if (e.key === "Escape") setTool("select");
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  });

  // --- Resize canvas when window resizes ---
  useEffect(() => {
    const resize = () => {
      const w = Math.min(window.innerWidth - 300, 1200);
      const h = Math.min(window.innerHeight - 200, 800);
      setCanvasSize({ w, h });
    };
    window.addEventListener("resize", resize);
    resize();
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div className="board">
      <div className="canvas-area">
        <canvas
          ref={canvasRef}
          className="canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      <div className="right-panel">
        <h3>Gallery</h3>
        <button onClick={loadGallery}>Refresh</button>
        <ul>
          {gallery.map((item) => (
            <li key={item.id}>
              <img src={item.data_json} alt={item.title} width="80" />
              <button onClick={() => handleDelete(item.id)}>❌</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
