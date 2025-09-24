// frontend/src/components/CanvasBoard.jsx
import React, { useEffect, useRef, useState } from "react";
import { saveGalleryItem, listGallery, deleteGalleryItem, aiCleanup } from "../api";

export default function CanvasBoard({ token, username }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");

  // history stacks
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // for preview
  const snapshot = useRef(null);
  const start = useRef(null);
  const drawing = useRef(false);

  // --- create canvas with DPR scaling ---
  useEffect(() => {
    function makeCanvas() {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      // remove old canvas
      if (canvasRef.current && wrapper.contains(canvasRef.current)) {
        wrapper.removeChild(canvasRef.current);
      }

      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvasRef.current = canvas;
      wrapper.appendChild(canvas);

      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // fill background white
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctxRef.current = ctx;

      // reset histories to initial blank
      undoStack.current = [canvas.toDataURL()];
      redoStack.current = [];
    }

    makeCanvas();
    window.addEventListener("resize", makeCanvas);
    return () => window.removeEventListener("resize", makeCanvas);
  }, []);

  // Utility: get pointer position in CSS pixels (matching scaled context)
  function getPoint(e) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  // --- drawing primitives ---
  function drawLineSegment(from, to, strokeColor = "#000", width = 2) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function drawShapePreview(a, b, toolName, col) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    if (toolName === "rect") {
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
      ctx.strokeRect(x, y, w, h);
    } else if (toolName === "ellipse") {
      ctx.beginPath();
      ctx.ellipse((a.x + b.x)/2, (a.y + b.y)/2, Math.abs(b.x-a.x)/2, Math.abs(b.y-a.y)/2, 0, 0, Math.PI*2);
      ctx.stroke();
    } else if (toolName === "line" || toolName === "arrow") {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (toolName === "arrow") {
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const head = 10;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - head*Math.cos(angle - Math.PI/6), b.y - head*Math.sin(angle - Math.PI/6));
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - head*Math.cos(angle + Math.PI/6), b.y - head*Math.sin(angle + Math.PI/6));
        ctx.stroke();
      }
    } else if (toolName === "triangle") {
      ctx.moveTo(a.x, b.y);
      ctx.lineTo((a.x + b.x)/2, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.closePath();
      ctx.stroke();
    } else if (toolName === "polygon") {
      // 5 sided regular polygon inside bounding rect
      const cx = (a.x + b.x)/2, cy = (a.y+b.y)/2;
      const rx = Math.abs(b.x-a.x)/2, ry = Math.abs(b.y-a.y)/2;
      const sides = 5;
      ctx.beginPath();
      for (let i=0;i<sides;i++){
        const ang = (i/sides)*Math.PI*2 - Math.PI/2;
        const x = cx + rx*Math.cos(ang), y = cy + ry*Math.sin(ang);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  function insertGraph(type, a, b) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    if (type === "graph-bar") {
      const bars = 5;
      const pad = 6;
      const bw = (w - pad*(bars+1)) / bars;
      ctx.fillStyle = color;
      for (let i=0;i<bars;i++){
        const val = 0.2 + 0.7*Math.abs(Math.sin(i*1.3));
        const bh = h * val;
        const bx = x + pad + i*(bw+pad);
        const by = y + (h - bh);
        ctx.fillRect(bx, by, bw, bh);
      }
    } else if (type === "graph-line") {
      const points = [];
      const count = 6;
      for (let i=0;i<count;i++){
        const px = x + (i/(count-1))*w;
        const py = y + (0.2 + 0.7*Math.abs(Math.cos(i*0.9)))*h;
        points.push({x:px, y:py});
      }
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i=1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    } else if (type === "graph-pie") {
      const cx = x + w/2, cy = y + h/2;
      const r = Math.min(w,h)/2;
      const slices = [0.3, 0.25, 0.45];
      let startA = -Math.PI/2;
      for (let i=0;i<slices.length;i++){
        const a1 = startA;
        const a2 = a1 + slices[i]*Math.PI*2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.fillStyle = ["#ff7b7b","#ffd27b","#7be8a3"][i%3];
        ctx.arc(cx, cy, r, a1, a2);
        ctx.closePath();
        ctx.fill();
        startA = a2;
      }
    }
  }

  // restore from dataURL to canvas (use CSS pixels)
  function restoreFromDataUrl(dataUrl) {
    const img = new Image();
    img.onload = () => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      // clear in CSS pixel coords
      ctx.clearRect(0, 0, rect.width, rect.height);
      // draw image to CSS pixel size (ctx is scaled)
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = dataUrl;
  }

  function pushUndo() {
    if (!canvasRef.current) return;
    undoStack.current.push(canvasRef.current.toDataURL());
    if (undoStack.current.length > 60) undoStack.current.shift();
    // clear redo on new action
    redoStack.current = [];
  }

  function undo() {
    if (undoStack.current.length < 2) return;
    const last = undoStack.current.pop();
    redoStack.current.push(last);
    const prev = undoStack.current[undoStack.current.length - 1];
    restoreFromDataUrl(prev);
  }

  function redo() {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop();
    undoStack.current.push(next);
    restoreFromDataUrl(next);
  }

  // pointer handlers
  function onPointerDown(e) {
    e.preventDefault();
    const p = getPoint(e);
    drawing.current = true;
    start.current = p;
    // snapshot for preview
    if (canvasRef.current) snapshot.current = canvasRef.current.toDataURL();
    // pen path: start path
    if (tool === "pen" || tool === "eraser") {
      // nothing else needed; subsequent pointermove draws
    }
  }

  function onPointerMove(e) {
    if (!drawing.current || !ctxRef.current) return;
    const p = getPoint(e);
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    if (tool === "pen" || tool === "eraser") {
      const prev = start.current || p;
      const strokeColor = tool === "eraser" ? "#ffffff" : color;
      const width = tool === "eraser" ? 16 : 2;
      drawLineSegment(prev, p, strokeColor, width);
      start.current = p;
    } else if (tool.startsWith("graph-")) {
      // preview: restore snapshot then draw sample graph inside bounding box defined by start & current
      if (!snapshot.current) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0,0,rect.width,rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        insertGraph(tool, start.current, p);
      };
      img.src = snapshot.current;
    } else {
      // shapes preview - restore snapshot then draw preview
      if (!snapshot.current) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0,0,rect.width,rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        drawShapePreview(start.current, p, tool, color);
      };
      img.src = snapshot.current;
    }
  }

  function onPointerUp(e) {
    if (!ctxRef.current) return;
    drawing.current = false;
    const p = getPoint(e);
    const ctx = ctxRef.current;

    if (tool === "pen" || tool === "eraser") {
      // done stroke; push undo
      pushUndo();
    } else if (tool.startsWith("graph-")) {
      insertGraph(tool, start.current, p);
      pushUndo();
    } else if (["rect","ellipse","line","arrow","triangle","polygon"].includes(tool)) {
      drawShapePreview(start.current, p, tool, color);
      pushUndo();
    } else if (tool === "text") {
      const txt = prompt("Enter text:");
      if (txt && ctx) {
        ctx.fillStyle = color;
        ctx.font = "16px sans-serif";
        ctx.fillText(txt, p.x, p.y);
        pushUndo();
      }
    }

    // cleanup
    snapshot.current = null;
    start.current = null;
  }

  // connect pointer events to canvas element
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.style.touchAction = "none"; // allow dragging
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  });

  // global handlers: tool-change, color-change, action, load-diagram, open-gallery
  useEffect(() => {
    function onTool(e) { if (e.detail && e.detail.tool) setTool(e.detail.tool); }
    function onColor(e) { if (e.detail && e.detail.color) setColor(e.detail.color); }
    async function onAction(e) {
      const name = e.detail && e.detail.name;
      if (!name) return;
      if (name === "undo") undo();
      else if (name === "redo") redo();
      else if (name === "save") await handleSave();
      else if (name === "gallery") window.dispatchEvent(new CustomEvent("open-gallery"));
      else if (name === "aiClean") await performAiClean();
    }
    function onLoad(e) {
      const detail = e.detail || {};
      if (detail.png) {
        // draw png onto canvas
        const img = new Image();
        img.onload = () => {
          const ctx = ctxRef.current;
          const canvas = canvasRef.current;
          if (!ctx || !canvas) return;
          const rect = canvas.getBoundingClientRect();
          ctx.clearRect(0,0,rect.width,rect.height);
          ctx.drawImage(img, 0,0,rect.width,rect.height);
          pushUndo();
        };
        img.src = detail.png;
      }
    }
    window.addEventListener("tool-change", onTool);
    window.addEventListener("color-change", onColor);
    window.addEventListener("action", onAction);
    window.addEventListener("load-diagram", onLoad);
    return () => {
      window.removeEventListener("tool-change", onTool);
      window.removeEventListener("color-change", onColor);
      window.removeEventListener("action", onAction);
      window.removeEventListener("load-diagram", onLoad);
    };
  }, [token, username]);

  // Save: attempt backend upload, fallback to download
  async function handleSave() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    // first try upload to backend
    try {
      const payload = { title: `Saved by ${username||"user"}`, data_json: JSON.stringify({ png: dataUrl }) };
      const resp = await saveGalleryItem(payload, token);
      if (resp && resp.status >= 200 && resp.status < 300) {
        alert("Saved to gallery");
        window.dispatchEvent(new CustomEvent("gallery-updated"));
        return;
      }
      throw new Error("Upload failed");
    } catch (err) {
      console.warn("Upload failed, fallback to download:", err);
      // fallback download
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `whiteboard-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      alert("Downloaded image locally (backend upload failed)");
    }
  }

  // AI clean (stub)
  async function performAiClean() {
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("No canvas");
      const dataUrl = canvas.toDataURL("image/png");
      // demo: send to endpoint as FormData (backend handles it or returns processed png)
      const fd = new FormData();
      fd.append("image", dataUrl);
      const resp = await aiCleanup(fd, token);
      if (resp && resp.data && resp.data.cleaned_png) {
        // if backend returns cleaned_png, load it
        const img = new Image();
        img.onload = () => {
          const ctx = ctxRef.current;
          const rect = canvas.getBoundingClientRect();
          ctx.clearRect(0,0,rect.width,rect.height);
          ctx.drawImage(img, 0,0,rect.width,rect.height);
          pushUndo();
        };
        img.src = resp.data.cleaned_png;
        alert("AI cleaned (server result applied)");
      } else {
        alert("AI cleanup requested (stub). No processed image returned.");
      }
    } catch (e) {
      console.warn("AI clean failed", e);
      alert("AI clean failed (server or network error)");
    }
  }

  // delete gallery item: central event will be triggered from Gallery component
  useEffect(() => {
    async function onDelete(e) {
      const id = e.detail && e.detail.id;
      if (!id) return;
      try {
        await deleteGalleryItem(id, token);
        alert("Deleted gallery item");
        window.dispatchEvent(new CustomEvent("gallery-updated"));
      } catch (err) {
        console.error("delete failed", err);
        alert("Failed to delete item");
      }
    }
    window.addEventListener("gallery-delete", onDelete);
    return () => window.removeEventListener("gallery-delete", onDelete);
  }, [token]);

  // UI: top controls (small)
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", padding: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="color-input"
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              window.dispatchEvent(new CustomEvent("color-change", { detail: { color: e.target.value } }));
            }}
          />
          <button className="tool-btn" onClick={() => { const ctx = ctxRef.current; const canvas = canvasRef.current; if (ctx && canvas) { const rect = canvas.getBoundingClientRect(); ctx.clearRect(0,0,rect.width,rect.height); ctx.fillStyle = "#fff"; ctx.fillRect(0,0,rect.width,rect.height); pushUndo(); } }}>Clear</button>
          <button className="tool-btn" onClick={() => handleSave()}>Save</button>
        </div>
        <div className="small">Tool: {tool}</div>
      </div>

      <div ref={wrapperRef} style={{ flex: 1, width: "100%", height: "100%", padding: 8 }} className="canvas-layer" />
    </div>
  );
}
