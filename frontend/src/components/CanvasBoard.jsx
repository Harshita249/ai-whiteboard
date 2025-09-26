import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from "react";
import { saveGalleryItem, aiCleanup } from "../api";

const MAX_STACK = 120;

const CanvasBoard = forwardRef(({ currentTool, currentColor }, ref) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const drawing = useRef(false);
  const start = useRef(null);
  const snapshot = useRef(null);

  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // Create canvas element and setup DPR scaling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // create canvas if not exists
    if (!canvasRef.current) {
      const c = document.createElement("canvas");
      c.style.display = "block";
      c.style.width = "100%";
      c.style.height = "100%";
      c.style.borderRadius = "8px";
      c.style.background = "#fff";
      canvasRef.current = c;
      container.appendChild(c);
    }

    const canvas = canvasRef.current;

    function resize() {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;

      // Draw previous snapshot or white background
      if (undoStack.current.length) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, rect.width, rect.height);
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = undoStack.current[undoStack.current.length - 1];
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, rect.height);
        undoStack.current.push(canvas.toDataURL());
      }
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);

  }, []); // only once

  // Utility: get mouse/touch point in canvas CSS px
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

  // Undo/Redo helpers
  function pushUndo() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    undoStack.current.push(canvas.toDataURL());
    if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
    redoStack.current = [];
  }

  function restoreDataUrl(dataUrl) {
    const img = new Image();
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    img.onload = () => {
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
    if (prev) restoreDataUrl(prev);
  }

  function redo() {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop();
    undoStack.current.push(next);
    restoreDataUrl(next);
  }

  // Drawing primitives
  function drawLine(p1, p2, color = "#000", width = 2) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  function drawShapeFinal(a, b, tool, color = "#000") {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (tool === "rect") {
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      ctx.strokeRect(x, y, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    } else if (tool === "ellipse") {
      ctx.beginPath();
      ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === "line" || tool === "arrow") {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (tool === "arrow") {
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const head = 10;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - head * Math.cos(angle - Math.PI / 6), b.y - head * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - head * Math.cos(angle + Math.PI / 6), b.y - head * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    } else if (tool === "text") {
      const text = prompt("Text:");
      if (!text) return;
      ctx.fillStyle = color;
      ctx.font = "18px sans-serif";
      ctx.fillText(text, a.x, a.y);
    } else if (tool.startsWith("graph")) {
      // simple placeholder graphs if desired
      const x = Math.min(a.x, b.x);
      const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x);
      const h = Math.abs(b.y - a.y);
      if (tool === "graph-bar") {
        const bars = 5, pad = 6;
        const bw = (w - pad * (bars + 1)) / bars;
        ctx.fillStyle = color;
        for (let i = 0; i < bars; i++) {
          const val = 0.2 + 0.7 * Math.abs(Math.sin(i));
          const bh = val * h;
          ctx.fillRect(x + pad + i * (bw + pad), y + h - bh, bw, bh);
        }
      } else if (tool === "graph-line") {
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
        for (let i = 0; i <= 5; i++) {
          const px = x + (i / 5) * w;
          const py = y + (0.2 + 0.7 * Math.abs(Math.cos(i))) * h;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      } else if (tool === "graph-pie") {
        const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
        let start = -Math.PI / 2;
        const slices = [0.3, 0.3, 0.4];
        for (let i = 0; i < slices.length; i++) {
          const end = start + slices[i] * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, r, start, end);
          ctx.closePath();
          ctx.fillStyle = ["#ff7b7b", "#ffd27b", "#7be8a3"][i % 3];
          ctx.fill();
          start = end;
        }
      }
    }
  }

  // Preview: restore snapshot and draw preview shape (on move)
  function previewShape(a, b, tool, color) {
    const canvas = canvasRef.current;
    if (!snapshot.current || !canvas) return;
    const img = new Image();
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      const ctx = ctxRef.current;
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      // draw preview
      ctx.save();
      ctx.globalAlpha = 1.0;
      drawShapeFinal(a, b, tool, color);
      ctx.restore();
    };
    img.src = snapshot.current;
  }

  // Pointer handlers
  function handleDown(e) {
    e.preventDefault();
    const p = getPoint(e);
    drawing.current = true;
    start.current = p;
    // save snapshot for preview shapes
    snapshot.current = canvasRef.current.toDataURL();
    // push pre-action snapshot for undo
    pushUndo();
    // begin stroke for pen/eraser
    if (currentTool === "pen" || currentTool === "eraser") {
      const ctx = ctxRef.current;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
  }

  function handleMove(e) {
    if (!drawing.current) return;
    const p = getPoint(e);
    if (currentTool === "pen") {
      drawLine(start.current || p, p, currentColor || "#000", 2);
      start.current = p;
    } else if (currentTool === "eraser") {
      drawLine(start.current || p, p, "#ffffff", 20);
      start.current = p;
    } else {
      // shapes preview
      previewShape(start.current, p, currentTool, currentColor || "#000");
    }
  }

  function handleUp(e) {
    if (!drawing.current) return;
    drawing.current = false;
    const p = getPoint(e);
    const canvas = canvasRef.current;
    // finalize shapes
    if (currentTool !== "pen" && currentTool !== "eraser") {
      // restore snapshot then draw final shape, then push final state
      const img = new Image();
      img.onload = () => {
        const rect = canvas.getBoundingClientRect();
        const ctx = ctxRef.current;
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        // draw final
        drawShapeFinal(start.current, p, currentTool, currentColor || "#000");
        // push final to undo stack
        undoStack.current.push(canvas.toDataURL());
        if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
        redoStack.current = [];
      };
      img.src = snapshot.current;
    } else {
      // pen/eraser path already drawn; push current
      undoStack.current.push(canvas.toDataURL());
      if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
      redoStack.current = [];
    }
    start.current = null;
    snapshot.current = null;
  }

  // attach pointer listeners on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", handleDown);
    canvas.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      if (!canvas) return;
      canvas.removeEventListener("pointerdown", handleDown);
      canvas.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [currentTool, currentColor]); // rebind when tool/color changes

  // Expose methods to parent (App)
  useImperativeHandle(ref, () => ({
    undo,
    redo,
    saveToGallery: async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL("image/png");
        const token = localStorage.getItem("token");
        const payload = { title: `Saved ${Date.now()}`, data_json: JSON.stringify({ png: dataUrl }) };
        await saveGalleryItem(payload, token);
        window.dispatchEvent(new CustomEvent("gallery-updated"));
        alert("Saved to gallery");
      } catch (err) {
        console.error(err);
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
            const rect = canvas.getBoundingClientRect();
            ctxRef.current.clearRect(0, 0, rect.width, rect.height);
            ctxRef.current.drawImage(img, 0, 0, rect.width, rect.height);
            // push result to undo stack
            undoStack.current.push(canvas.toDataURL());
          };
          img.src = resp.data.cleaned_png;
        } else {
          alert("AI clean completed (no image returned)");
        }
      } catch (err) {
        console.error(err);
        alert("AI clean failed");
      }
    },
    downloadImage: () => {
      const a = document.createElement("a");
      a.href = canvasRef.current.toDataURL("image/png");
      a.download = `whiteboard-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }));

  // render
  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div style={{ width: "100%", maxWidth: 1100, maxHeight: 700, height: "100%", display: "block" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    </div>
  );
});

export default CanvasBoard;
