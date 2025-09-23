import React, { useRef, useEffect, useState } from "react";

export default function CanvasBoard({ token, username }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);

  const [color, setColor] = useState("#000000");
  const [tool, setTool] = useState("pen");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [path, setPath] = useState([]);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [snapshot, setSnapshot] = useState(null); // for shape preview

  // --- Resize + setup canvas ---
  useEffect(() => {
    function createCanvas() {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      if (canvasRef.current && wrapper.contains(canvasRef.current)) {
        wrapper.removeChild(canvasRef.current);
      }
      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      wrapper.appendChild(canvas);
      canvasRef.current = canvas;

      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const c = canvas.getContext("2d");
      c.scale(dpr, dpr);
      c.lineCap = "round";
      c.lineJoin = "round";
      c.fillStyle = "#fff";
      c.fillRect(0, 0, rect.width, rect.height);
      setCtx(c);

      // initialize undo stack
      setUndoStack([canvas.toDataURL()]);
      setRedoStack([]);
    }
    createCanvas();
    window.addEventListener("resize", createCanvas);
    return () => window.removeEventListener("resize", createCanvas);
  }, []);

  // --- Save snapshot (undo checkpoint) ---
  function saveState() {
    if (!canvasRef.current) return;
    const data = canvasRef.current.toDataURL();
    setUndoStack((prev) => [...prev, data]);
    setRedoStack([]);
  }

  // --- Restore from dataURL ---
  function restoreFrom(dataUrl) {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    img.src = dataUrl;
  }

  function undo() {
    if (undoStack.length > 1) {
      const newUndo = [...undoStack];
      const last = newUndo.pop();
      setUndoStack(newUndo);
      setRedoStack((prev) => [...prev, last]);
      restoreFrom(newUndo[newUndo.length - 1]);
    }
  }

  function redo() {
    if (redoStack.length > 0) {
      const newRedo = [...redoStack];
      const redoState = newRedo.pop();
      setRedoStack(newRedo);
      setUndoStack((prev) => [...prev, redoState]);
      restoreFrom(redoState);
    }
  }

  // --- Pointer logic ---
  function getPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    let x = e.clientX, y = e.clientY;
    if (e.touches && e.touches[0]) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    }
    return { x: x - rect.left, y: y - rect.top };
  }

  function handleDown(e) {
    if (!ctx) return;
    setIsDrawing(true);
    const pt = getPoint(e);
    setStartPos(pt);
    if (tool === "pen" || tool === "eraser") setPath([pt]);

    // save snapshot for preview shapes
    setSnapshot(canvasRef.current.toDataURL());
  }

  function handleMove(e) {
    if (!isDrawing || !ctx) return;
    const pt = getPoint(e);

    if (tool === "pen" || tool === "eraser") {
      setPath((prev) => {
        const next = [...prev, pt];
        ctx.beginPath();
        ctx.strokeStyle = tool === "eraser" ? "#fff" : color;
        ctx.lineWidth = tool === "eraser" ? 12 : 2;
        ctx.moveTo(prev[prev.length - 1].x, prev[prev.length - 1].y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
        return next;
      });
    } else {
      // shape preview
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
        drawShape(ctx, startPos, pt, tool, color);
      };
      img.src = snapshot;
    }
  }

  function handleUp(e) {
    if (!ctx) return;
    setIsDrawing(false);
    const pt = getPoint(e);

    if (tool === "rect" || tool === "ellipse" || tool === "line" || tool === "arrow" || tool === "text") {
      drawShape(ctx, startPos, pt, tool, color, true);
    }

    saveState(); // save snapshot after finishing
  }

  function drawShape(ctx, start, end, tool, color, commit = false) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    if (tool === "rect") {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      ctx.strokeRect(x, y, Math.abs(end.x - start.x), Math.abs(end.y - start.y));
    } else if (tool === "ellipse") {
      ctx.ellipse(
        (start.x + end.x) / 2,
        (start.y + end.y) / 2,
        Math.abs(end.x - start.x) / 2,
        Math.abs(end.y - start.y) / 2,
        0, 0, Math.PI * 2
      );
      ctx.stroke();
    } else if (tool === "line" || tool === "arrow") {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      if (tool === "arrow") {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const head = 10;
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    } else if (tool === "text" && commit) {
      const txt = prompt("Enter text:");
      if (txt) {
        ctx.fillStyle = color;
        ctx.font = "16px sans-serif";
        ctx.fillText(txt, end.x, end.y);
      }
    }
  }

  // --- Event listeners ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("pointerdown", handleDown);
    canvas.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    canvas.style.touchAction = "none";
    return () => {
      canvas.removeEventListener("pointerdown", handleDown);
      canvas.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  });

  // --- Toolbar events ---
  useEffect(() => {
    function onTool(e) { setTool(e.detail.tool); }
    function onColor(e) { setColor(e.detail.color); }
    function onAction(e) {
      if (e.detail.name === "undo") undo();
      if (e.detail.name === "redo") redo();
    }
    window.addEventListener("tool-change", onTool);
    window.addEventListener("color-change", onColor);
    window.addEventListener("action", onAction);
    return () => {
      window.removeEventListener("tool-change", onTool);
      window.removeEventListener("color-change", onColor);
      window.removeEventListener("action", onAction);
    };
  }, [undoStack, redoStack]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div ref={wrapperRef} className="canvas-layer" style={{ flex: 1 }} />
    </div>
  );
}
