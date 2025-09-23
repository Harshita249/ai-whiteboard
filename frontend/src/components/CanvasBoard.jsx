// frontend/src/components/CanvasBoard.jsx
import React, { useEffect, useRef, useState } from "react";

export default function CanvasBoard({ token, username }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [isDrawing, setIsDrawing] = useState(false);
  const startRef = useRef(null);
  const pathRef = useRef([]);
  const snapshotRef = useRef(null);

  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);

  // create/rescale canvas to wrapper size + DPR
  useEffect(() => {
    function makeCanvas() {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      // cleanup
      if (canvasRef.current && wrapper.contains(canvasRef.current)) {
        wrapper.removeChild(canvasRef.current);
      }
      const canvas = document.createElement("canvas");
      canvas.tabIndex = 0;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      wrapper.appendChild(canvas);
      canvasRef.current = canvas;
      // scale
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctxRef.current = ctx;
      // init stacks
      undoStackRef.current = [canvas.toDataURL()];
      redoStackRef.current = [];
    }
    makeCanvas();
    window.addEventListener("resize", makeCanvas);
    return () => window.removeEventListener("resize", makeCanvas);
  }, []);

  // utility to get pointer position relative to canvas CSS size
  function getPoint(e) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX, clientY = e.clientY;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  // drawing helpers
  function startDown(e) {
    e.preventDefault();
    const p = getPoint(e);
    setIsDrawing(true);
    startRef.current = p;
    pathRef.current = [p];
    // save snapshot for preview
    snapshotRef.current = canvasRef.current.toDataURL();
  }

  function moving(e) {
    if (!isDrawing || !ctxRef.current) return;
    const p = getPoint(e);
    const ctx = ctxRef.current;

    if (tool === "pen" || tool === "eraser") {
      const prev = pathRef.current[pathRef.current.length - 1];
      if (!prev) { pathRef.current.push(p); return; }
      ctx.beginPath();
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = tool === "eraser" ? 16 : 2;
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      pathRef.current.push(p);
    } else {
      // shape preview: restore snapshot then draw shape
      const img = new Image();
      img.onload = () => {
        // clear and draw snapshot scaled to canvas real pixel dims
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
        drawShape(ctx, startRef.current, p, tool, color);
      };
      img.src = snapshotRef.current;
    }
  }

  function up(e) {
    if (!ctxRef.current) return;
    setIsDrawing(false);
    const ctx = ctxRef.current;
    const p = getPoint(e);

    if (tool === "pen") {
      // send stroke via ws (optional) — not required here
      // after finishing a stroke, save snapshot
      pushUndo();
    } else if (tool === "eraser") {
      pushUndo();
    } else if (["rect","ellipse","line","arrow","text"].includes(tool)) {
      drawShape(ctx, startRef.current, p, tool, color, true);
      pushUndo();
    }
    pathRef.current = [];
    startRef.current = null;
    snapshotRef.current = null;
  }

  function drawShape(ctx, a, b, toolName, col, commit=false) {
    ctx.beginPath();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    if (toolName === "rect") {
      const x = Math.min(a.x,b.x), y = Math.min(a.y,b.y), w = Math.abs(b.x-a.x), h = Math.abs(b.y-a.y);
      ctx.strokeRect(x,y,w,h);
    } else if (toolName === "ellipse") {
      ctx.beginPath();
      ctx.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.abs(b.x-a.x)/2,Math.abs(b.y-a.y)/2,0,0,Math.PI*2);
      ctx.stroke();
    } else if (toolName === "line" || toolName === "arrow") {
      ctx.moveTo(a.x,a.y);
      ctx.lineTo(b.x,b.y);
      ctx.stroke();
      if (toolName === "arrow") {
        const angle = Math.atan2(b.y-a.y, b.x-a.x);
        const head = 10;
        ctx.beginPath();
        ctx.moveTo(b.x,b.y);
        ctx.lineTo(b.x - head*Math.cos(angle - Math.PI/6), b.y - head*Math.sin(angle - Math.PI/6));
        ctx.moveTo(b.x,b.y);
        ctx.lineTo(b.x - head*Math.cos(angle + Math.PI/6), b.y - head*Math.sin(angle + Math.PI/6));
        ctx.stroke();
      }
    } else if (toolName === "text") {
      const txt = prompt("Enter text:");
      if (txt) {
        ctx.fillStyle = col;
        ctx.font = "16px sans-serif";
        ctx.fillText(txt, b.x, b.y);
      }
    }
  }

  // Undo / Redo
  function pushUndo() {
    if (!canvasRef.current) return;
    undoStackRef.current.push(canvasRef.current.toDataURL());
    // cap stack size
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
  }

  function undo() {
    if (undoStackRef.current.length < 2) return;
    // pop last into redo, restore previous
    const last = undoStackRef.current.pop();
    redoStackRef.current.push(last);
    const url = undoStackRef.current[undoStackRef.current.length - 1];
    restoreFrom(url);
  }

  function redo() {
    if (redoStackRef.current.length === 0) return;
    const url = redoStackRef.current.pop();
    undoStackRef.current.push(url);
    restoreFrom(url);
  }

  function restoreFrom(dataUrl) {
    const img = new Image();
    img.onload = () => {
      const ctx = ctxRef.current;
      // draw into real pixel canvas
      ctx.clearRect(0,0,canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    img.src = dataUrl;
  }

  // Save (upload to backend / fallback to download)
  async function handleSave() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    // try upload to backend
    try {
      const endpoint = (import.meta.env.VITE_BACKEND_URL || "/api") + "/gallery/";
      const payload = { title: `Saved by ${username||"user"}`, data_json: JSON.stringify({ png: dataUrl }) };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Upload failed ${res.status}`);
      alert("Saved to gallery");
      window.dispatchEvent(new CustomEvent("gallery-updated"));
      return;
    } catch (e) {
      console.warn("Upload failed, falling back to download", e);
      // fallback download
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `whiteboard-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      alert("Downloaded image (backend upload failed)");
    }
  }

  // Gallery load helper
  function openGallery() {
    window.dispatchEvent(new CustomEvent("open-gallery"));
  }

  // Attach global listeners
  useEffect(() => {
    function onTool(e) { if (e.detail && e.detail.tool) setTool(e.detail.tool); }
    function onColor(e) { if (e.detail && e.detail.color) setColor(e.detail.color); }
    function onAction(e) {
      const name = e.detail && e.detail.name;
      if (!name) return;
      if (name === "undo") undo();
      else if (name === "redo") redo();
      else if (name === "save") handleSave();
      else if (name === "gallery") openGallery();
      else if (name === "aiClean") alert("AI Clean invoked (stub)");
    }
    window.addEventListener("tool-change", onTool);
    window.addEventListener("color-change", onColor);
    window.addEventListener("action", onAction);
    // pointer events are attached per canvas element below
    return () => {
      window.removeEventListener("tool-change", onTool);
      window.removeEventListener("color-change", onColor);
      window.removeEventListener("action", onAction);
    };
  }, [token, username]);

  // attach pointer listeners to current canvas element
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.addEventListener("pointerdown", startDown);
    c.addEventListener("pointermove", moving);
    window.addEventListener("pointerup", up);
    c.style.touchAction = "none";
    return () => {
      c.removeEventListener("pointerdown", startDown);
      c.removeEventListener("pointermove", moving);
      window.removeEventListener("pointerup", up);
    };
  });

  return (
    <div className="canvas-wrapper" style={{ width: "100%", height: "100%" }}>
      <div ref={wrapperRef} className="canvas-layer" style={{ width: "100%", height: "100%", boxSizing: "border-box", padding: 8 }} />
    </div>
  );
}
