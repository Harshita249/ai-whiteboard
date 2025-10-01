import React, { useRef, useState, useEffect } from "react";
import { saveAs } from "file-saver";

const CanvasBoard = ({ tool, color, onSaveToGallery, onAiClean }) => {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  const [ctx, setCtx] = useState(null);
  const [overlayCtx, setOverlayCtx] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);

  // Undo/Redo stack
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  useEffect(() => {
    const c = canvasRef.current;
    const o = overlayRef.current;
    if (c && o) {
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
      o.width = o.offsetWidth;
      o.height = o.offsetHeight;
      setCtx(c.getContext("2d"));
      setOverlayCtx(o.getContext("2d"));
    }
  }, []);

  // Save snapshot for undo
  const pushToUndo = () => {
    if (!ctx) return;
    const data = canvasRef.current.toDataURL();
    setUndoStack((prev) => [...prev, data]);
    setRedoStack([]); // clear redo
  };

  // Undo action
  const handleUndo = () => {
    if (!undoStack.length) return;
    const prev = [...undoStack];
    const last = prev.pop();
    setUndoStack(prev);
    setRedoStack((r) => [...r, canvasRef.current.toDataURL()]);
    restoreImage(last);
  };

  // Redo action
  const handleRedo = () => {
    if (!redoStack.length) return;
    const next = [...redoStack];
    const last = next.pop();
    setRedoStack(next);
    setUndoStack((u) => [...u, canvasRef.current.toDataURL()]);
    restoreImage(last);
  };

  const restoreImage = (src) => {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = src;
  };

  // Pointer handlers
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e) => {
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getPos(e);
    setStartPos(pos);

    if (tool === "pen" || tool === "eraser") {
      pushToUndo();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || !ctx) return;
    const pos = getPos(e);

    if (tool === "pen") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "eraser") {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 20;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (["rect", "circle", "line", "triangle"].includes(tool)) {
      if (!overlayCtx || !startPos) return;
      overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      overlayCtx.strokeStyle = color;
      overlayCtx.lineWidth = 2;
      overlayCtx.beginPath();

      if (tool === "rect") {
        overlayCtx.rect(pos.x - startPos.x, pos.y - startPos.y, startPos.x, startPos.y);
      } else if (tool === "circle") {
        const r = Math.sqrt(
          Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
        );
        overlayCtx.arc(startPos.x, startPos.y, r, 0, 2 * Math.PI);
      } else if (tool === "line") {
        overlayCtx.moveTo(startPos.x, startPos.y);
        overlayCtx.lineTo(pos.x, pos.y);
      } else if (tool === "triangle") {
        overlayCtx.moveTo(startPos.x, pos.y);
        overlayCtx.lineTo((startPos.x + pos.x) / 2, startPos.y);
        overlayCtx.lineTo(pos.x, pos.y);
        overlayCtx.closePath();
      }
      overlayCtx.stroke();
    }
  };

  const handlePointerUp = (e) => {
    if (!ctx || !isDrawing) return;
    setIsDrawing(false);

    if (["rect", "circle", "line", "triangle"].includes(tool) && startPos) {
      pushToUndo();
      const pos = getPos(e);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      if (tool === "rect") {
        ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      } else if (tool === "circle") {
        const r = Math.sqrt(
          Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
        );
        ctx.arc(startPos.x, startPos.y, r, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === "line") {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (tool === "triangle") {
        ctx.moveTo(startPos.x, pos.y);
        ctx.lineTo((startPos.x + pos.x) / 2, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.closePath();
        ctx.stroke();
      }
      overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }

    setStartPos(null);
  };

  // Save to Gallery
  const handleSave = () => {
    const data = canvasRef.current.toDataURL("image/png");
    onSaveToGallery(data);
  };

  // Download as PNG
  const handleDownload = () => {
    const data = canvasRef.current.toDataURL("image/png");
    saveAs(data, "whiteboard.png");
  };

  return (
    <div className="board-wrapper">
      <div className="toolbar-top">
        <button onClick={handleUndo}>⎌ Undo</button>
        <button onClick={handleRedo}>↻ Redo</button>
        <button onClick={handleSave}>💾 Save</button>
        <button onClick={onAiClean}>🤖 AI Clean</button>
        <button onClick={handleDownload}>⬇ Download</button>
      </div>
      <div className="board-canvas-area">
        <canvas ref={canvasRef} className="main-canvas" />
        <canvas ref={overlayRef} className="overlay-canvas" />
      </div>
    </div>
  );
};

export default CanvasBoard;
