import React, { useRef, useEffect, useState } from "react";
import { saveAs } from "file-saver";

export default function CanvasBoard() {
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [previewCtx, setPreviewCtx] = useState(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [isDrawing, setIsDrawing] = useState(false);
  const [start, setStart] = useState(null);

  // Undo/redo stack
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Gallery
  const [gallery, setGallery] = useState([]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!canvas || !preview) return;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      preview.width = rect.width;
      preview.height = rect.height;
      setCtx(canvas.getContext("2d"));
      setPreviewCtx(preview.getContext("2d"));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Toolbar event listeners
  useEffect(() => {
    const handleTool = (e) => setTool(e.detail.tool);
    const handleColor = (e) => setColor(e.detail.color);
    const handleAction = (e) => {
      if (e.detail.name === "undo") undo();
      if (e.detail.name === "redo") redo();
      if (e.detail.name === "save") saveToGallery();
      if (e.detail.name === "download") download();
      if (e.detail.name === "aiClean") aiClean();
    };
    window.addEventListener("tool-change", handleTool);
    window.addEventListener("color-change", handleColor);
    window.addEventListener("action", handleAction);
    return () => {
      window.removeEventListener("tool-change", handleTool);
      window.removeEventListener("color-change", handleColor);
      window.removeEventListener("action", handleAction);
    };
  }, [ctx, tool]);

  // Keyboard shortcuts
  useEffect(() => {
    const kb = (e) => {
      if (e.ctrlKey && e.key === "z") undo();
      if (e.ctrlKey && e.key === "y") redo();
    };
    window.addEventListener("keydown", kb);
    return () => window.removeEventListener("keydown", kb);
  }, [history, redoStack]);

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Start drawing
  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStart(pos);

    if (tool === "pen" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = tool === "eraser" ? 20 : 2;
    }
  };

  // Drawing / preview shapes
  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);

    if (tool === "pen" || tool === "eraser") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      // Preview shapes
      previewCtx.clearRect(0, 0, previewRef.current.width, previewRef.current.height);
      previewCtx.strokeStyle = color;
      previewCtx.lineWidth = 2;

      if (tool === "rect") {
        previewCtx.strokeRect(start.x, start.y, pos.x - start.x, pos.y - start.y);
      }
      if (tool === "circle") {
        const r = Math.sqrt((pos.x - start.x) ** 2 + (pos.y - start.y) ** 2);
        previewCtx.beginPath();
        previewCtx.arc(start.x, start.y, r, 0, Math.PI * 2);
        previewCtx.stroke();
      }
      if (tool === "line") {
        previewCtx.beginPath();
        previewCtx.moveTo(start.x, start.y);
        previewCtx.lineTo(pos.x, pos.y);
        previewCtx.stroke();
      }
      if (tool === "arrow") {
        drawArrow(previewCtx, start, pos, color);
      }
    }
  };

  // Finish drawing
  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    setIsDrawing(false);

    if (tool === "rect" || tool === "circle" || tool === "line" || tool === "arrow") {
      previewCtx.clearRect(0, 0, previewRef.current.width, previewRef.current.height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      if (tool === "rect") {
        ctx.strokeRect(start.x, start.y, pos.x - start.x, pos.y - start.y);
      }
      if (tool === "circle") {
        const r = Math.sqrt((pos.x - start.x) ** 2 + (pos.y - start.y) ** 2);
        ctx.beginPath();
        ctx.arc(start.x, start.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (tool === "line") {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
      if (tool === "arrow") {
        drawArrow(ctx, start, pos, color);
      }
    }

    if (tool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        ctx.fillStyle = color;
        ctx.font = "20px Arial";
        ctx.fillText(text, pos.x, pos.y);
      }
    }

    // Save snapshot to history
    saveState();
  };

  // Arrow drawing helper
  const drawArrow = (context, from, to, strokeStyle) => {
    const headlen = 10;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);

    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.strokeStyle = strokeStyle;
    context.stroke();

    context.beginPath();
    context.moveTo(to.x, to.y);
    context.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 6), to.y - headlen * Math.sin(angle - Math.PI / 6));
    context.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 6), to.y - headlen * Math.sin(angle + Math.PI / 6));
    context.lineTo(to.x, to.y);
    context.fillStyle = strokeStyle;
    context.fill();
  };

  // Undo/redo
  const saveState = () => {
    const data = canvasRef.current.toDataURL();
    setHistory((h) => [...h, data]);
    setRedoStack([]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = [...history];
    const last = prev.pop();
    setRedoStack((r) => [...r, last]);
    setHistory(prev);
    restore(prev[prev.length - 1]);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = [...redoStack];
    const last = next.pop();
    setRedoStack(next);
    setHistory((h) => [...h, last]);
    restore(last);
  };

  const restore = (dataUrl) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  // Save to gallery (backend)
  const saveToGallery = async () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setGallery([...gallery, dataUrl]);

    try {
      await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Sketch ${Date.now()}`, data_json: dataUrl }),
      });
    } catch (err) {
      console.error("Gallery save failed", err);
    }
  };

  // Download PNG
  const download = () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    saveAs(dataUrl, "whiteboard.png");
  };

  // AI Clean (stub)
  const aiClean = async () => {
    alert("AI Clean triggered (backend not yet implemented).");
  };

  return (
    <div className="board">
      <div className="canvas-area">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
        <canvas ref={previewRef} />
      </div>
    </div>
  );
}
