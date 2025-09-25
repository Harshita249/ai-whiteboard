import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { saveGalleryItem, aiCleanup } from "../api";

const CanvasBoard = forwardRef(({ currentTool, currentColor }, ref) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const startRef = useRef(null);
  const snapshotRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // Create canvas and resize with DPR
  useEffect(() => {
    function makeCanvas() {
      const container = containerRef.current;
      if (!container) return;

      // remove old canvas if exists
      if (canvasRef.current && container.contains(canvasRef.current)) {
        container.removeChild(canvasRef.current);
      }

      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvasRef.current = canvas;
      container.appendChild(canvas);

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;

      // white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);

      // push initial state
      undoStack.current = [canvas.toDataURL()];
      redoStack.current = [];
    }

    makeCanvas();
    window.addEventListener("resize", makeCanvas);
    return () => window.removeEventListener("resize", makeCanvas);
  }, []);

  // helper: get point in CSS px
  function getPoint(e) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX, clientY = e.clientY;
    if (e.touches && e.touches.length) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  // Save undo state
  function pushUndo() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    undoStack.current.push(canvas.toDataURL());
    if (undoStack.current.length > 80) undoStack.current.shift();
    redoStack.current = [];
  }

  function restoreFromDataUrl(dataUrl) {
    const img = new Image();
    img.onload = () => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = dataUrl;
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

  // Drawing helpers
  function drawSegment(from, to, strokeColor = "#000", width = 2) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function drawPreview(a, b, toolName, color) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (!snapshotRef.current) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (toolName === "rect") {
        const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
        ctx.strokeRect(x, y, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      } else if (toolName === "ellipse") {
        ctx.beginPath();
        ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (toolName === "line" || toolName === "arrow") {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (toolName === "arrow") {
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          const head = 10;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - head * Math.cos(angle - Math.PI / 6), b.y - head * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - head * Math.cos(angle + Math.PI / 6), b.y - head * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      } else if (toolName === "triangle") {
        ctx.beginPath();
        ctx.moveTo((a.x + b.x) / 2, a.y);
        ctx.lineTo(a.x, b.y);
        ctx.lineTo(b.x, b.y);
        ctx.closePath();
        ctx.stroke();
      } else if (toolName.startsWith("graph-")) {
        // draw lightweight placeholder graphs
        const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
        const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
        if (toolName === "graph-bar") {
          const bars = 5; const pad = 6;
          const bw = (w - pad * (bars + 1)) / bars;
          ctx.fillStyle = color;
          for (let i = 0; i < bars; i++) {
            const val = 0.2 + 0.7 * Math.abs(Math.sin(i * 1.3));
            const bh = h * val; const bx = x + pad + i * (bw + pad); const by = y + (h - bh);
            ctx.fillRect(bx, by, bw, bh);
          }
        } else if (toolName === "graph-line") {
          ctx.beginPath(); ctx.strokeStyle = color;
          for (let i = 0; i < 6; i++) {
            const px = x + (i / 5) * w;
            const py = y + (0.2 + 0.7 * Math.abs(Math.cos(i * 0.9))) * h;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        } else if (toolName === "graph-pie") {
          const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
          const slices = [0.3, 0.25, 0.45]; let sa = -Math.PI / 2;
          for (let i = 0; i < slices.length; i++) {
            const ea = sa + slices[i] * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, sa, ea);
            ctx.closePath(); ctx.fillStyle = ["#ff7b7b", "#ffd27b", "#7be8a3"][i % 3]; ctx.fill();
            sa = ea;
          }
        }
      }
    };
    img.src = snapshotRef.current;
  }

  // pointer handlers
  function onPointerDown(e) {
    e.preventDefault();
    const p = getPoint(e);
    drawingRef.current = true;
    startRef.current = p;
    const canvas = canvasRef.current;
    snapshotRef.current = canvas.toDataURL();
    if (["pen", "eraser"].includes(currentTool)) {
      const ctx = ctxRef.current;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
  }

  function onPointerMove(e) {
    if (!drawingRef.current) return;
    const p = getPoint(e);
    if (["pen", "eraser"].includes(currentTool)) {
      const prev = startRef.current || p;
      const stroke = currentTool === "eraser" ? "#ffffff" : currentColor || "#000";
      const width = currentTool === "eraser" ? 18 : 2;
      drawSegment(prev, p, stroke, width);
      startRef.current = p;
    } else {
      // shapes & graphs preview
      drawPreview(startRef.current, p, currentTool, currentColor || "#000");
    }
  }

  function onPointerUp(e) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const p = getPoint(e);
    if (!["pen", "eraser"].includes(currentTool)) {
      // finalize preview - draw one more time on top (drawPreview already restored snapshot and preview),
      // but ensure it's persisted by pushing a new snapshot
      drawPreview(startRef.current, p, currentTool, currentColor || "#000");
    }
    pushUndo();
    snapshotRef.current = null;
    startRef.current = null;
  }

  // attach pointer listeners to canvas element
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  });

  // listen to load-diagram events (open gallery item)
  useEffect(() => {
    function onLoad(e) {
      const d = (e.detail || {}).png;
      if (d) {
        const img = new Image();
        img.onload = () => {
          const ctx = ctxRef.current;
          const canvas = canvasRef.current;
          if (!ctx || !canvas) return;
          const rect = canvas.getBoundingClientRect();
          ctx.clearRect(0, 0, rect.width, rect.height);
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          pushUndo();
        };
        img.src = d;
      }
    }
    window.addEventListener("load-diagram", onLoad);
    return () => window.removeEventListener("load-diagram", onLoad);
  }, []);

  // exposed api to parent via ref
  useImperativeHandle(ref, () => ({
    undo: () => undo(),
    redo: () => redo(),
    saveToGallery: async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL("image/png");
        const token = localStorage.getItem("token");
        const payload = { title: `Saved`, data_json: JSON.stringify({ png: dataUrl }) };
        await saveGalleryItem(payload, token);
        window.dispatchEvent(new CustomEvent("gallery-updated"));
        alert("Saved to gallery");
      } catch (e) {
        console.warn(e);
        alert("Save failed");
      }
    },
    aiCleanup: async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL("image/png");
        const blob = await (await fetch(dataUrl)).blob();
        const fd = new FormData();
        fd.append("image", blob, "board.png");
        const token = localStorage.getItem("token");
        const resp = await aiCleanup(fd, token);
        if (resp && resp.data && resp.data.cleaned_png) {
          const img = new Image();
          img.onload = () => {
            const ctx = ctxRef.current;
            if (!ctx) return;
            const rect = canvas.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height);
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
            pushUndo();
          };
          img.src = resp.data.cleaned_png;
        } else {
          alert("AI clean completed (no image returned by server)");
        }
      } catch (e) {
        console.warn(e);
        alert("AI clean failed");
      }
    },
    downloadImage: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `whiteboard-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }));

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div style={{ padding: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <div className="small">Tool: {currentTool}</div>
        <div style={{ flex: 1 }} />
      </div>
      <div ref={containerRef} style={{ width: "100%", height: "calc(100% - 48px)", background: "#fff", borderRadius: 6 }} />
    </div>
  );
});

export default CanvasBoard;
