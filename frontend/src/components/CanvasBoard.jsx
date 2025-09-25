import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { saveGalleryItem, aiCleanup } from "../api"; // make sure api.js exports these

const MAX_STACK = 100;

const CanvasBoard = forwardRef(({ currentTool, currentColor }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawingRef = useRef(false);
  const startRef = useRef(null);
  const snapshotRef = useRef(null);
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // Resize & init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.resetTransform && ctx.resetTransform(); // some browsers
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;

      // if nothing drawn yet, fill white background
      if (undoStack.current.length === 0) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, rect.height);
        // initial state
        undoStack.current.push(canvas.toDataURL());
      } else {
        // reapply top of stack
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, rect.width, rect.height);
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = undoStack.current[undoStack.current.length - 1];
      }
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // pointer helpers
  const getPoint = (evt) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX = evt.clientX, clientY = evt.clientY;
    if (evt.touches && evt.touches.length) {
      clientX = evt.touches[0].clientX; clientY = evt.touches[0].clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // Undo/redo helpers
  const pushUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    undoStack.current.push(canvas.toDataURL());
    if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
    // clear redo on new action
    redoStack.current = [];
  };

  const restoreFromDataUrl = (dataUrl) => {
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
  };

  const undo = () => {
    if (undoStack.current.length < 2) return;
    const last = undoStack.current.pop();
    redoStack.current.push(last);
    const prev = undoStack.current[undoStack.current.length - 1];
    if (prev) restoreFromDataUrl(prev);
  };

  const redo = () => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop();
    undoStack.current.push(next);
    restoreFromDataUrl(next);
  };

  // drawing functions
  const drawLineSegment = (from, to, color = "#000", width = 2) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const drawShapeOnCtx = (a, b, toolName, color = "#000") => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (toolName === "rect") {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      const x = Math.min(a.x, b.x); const y = Math.min(a.y, b.y);
      ctx.strokeRect(x, y, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    } else if (toolName === "ellipse") {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (toolName === "line" || toolName === "arrow") {
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
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
    } else if (toolName.startsWith("graph-")) {
      // simple placeholder visuals
      const x = Math.min(a.x, b.x); const y = Math.min(a.y, b.y);
      const w = Math.abs(b.x - a.x); const h = Math.abs(b.y - a.y);
      if (toolName === "graph-bar") {
        const bars = 5; const pad = 6; const bw = (w - pad * (bars + 1)) / bars;
        ctx.fillStyle = color;
        for (let i = 0; i < bars; i++) {
          const val = 0.2 + 0.7 * Math.abs(Math.sin(i * 1.5));
          const bh = val * h; const bx = x + pad + i * (bw + pad); const by = y + h - bh;
          ctx.fillRect(bx, by, bw, bh);
        }
      } else if (toolName === "graph-line") {
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const px = x + (i / 5) * w; const py = y + (0.2 + 0.7 * Math.abs(Math.cos(i * 0.9))) * h;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      } else if (toolName === "graph-pie") {
        const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
        const slices = [0.3, 0.3, 0.4];
        let start = -Math.PI / 2;
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
    } else if (toolName === "text") {
      const text = prompt("Enter text:");
      if (!text) return;
      ctx.fillStyle = color; ctx.font = "18px sans-serif";
      ctx.fillText(text, a.x, a.y);
    }
  };

  // preview: restore snapshot then draw preview shape
  const previewShape = (to) => {
    const canvas = canvasRef.current;
    if (!snapshotRef.current || !canvas) return;
    const img = new Image();
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      const ctx = ctxRef.current;
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      drawShapeOnCtx(startRef.current, to, currentTool, currentColor || "#000");
    };
    img.src = snapshotRef.current;
  };

  // pointer handlers
  const onPointerDown = (e) => {
    const p = getPoint(e);
    drawingRef.current = true;
    startRef.current = p;
    snapshotRef.current = canvasRef.current.toDataURL(); // used for preview
    // push prior state to undoStack so undo goes back to previous
    pushUndo();
    if (currentTool === "pen" || currentTool === "eraser") {
      const ctx = ctxRef.current;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    // prevent default to avoid scrolling
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!drawingRef.current) return;
    const p = getPoint(e);
    if (currentTool === "pen") {
      drawLineSegment(startRef.current || p, p, currentColor || "#000", 2);
      startRef.current = p;
    } else if (currentTool === "eraser") {
      drawLineSegment(startRef.current || p, p, "#ffffff", 20);
      startRef.current = p;
    } else {
      // shapes preview
      previewShape(p);
    }
  };

  const onPointerUp = (e) => {
    if (!drawingRef.current) return;
    const p = getPoint(e);
    if (currentTool !== "pen" && currentTool !== "eraser") {
      // finalize shape onto canvas by restoring snapshot then drawing final
      restoreFromDataUrl(snapshotRef.current);
      // wait a tick for restore to draw — use onload for reliability:
      const img = new Image();
      img.onload = () => {
        drawShapeOnCtx(startRef.current, p, currentTool, currentColor || "#000");
        // after finalizing, push new state onto undo (we already pushed prior at pointerdown)
        undoStack.current.push(canvasRef.current.toDataURL());
        if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
        redoStack.current = [];
      };
      img.src = snapshotRef.current;
    } else {
      // for pen/eraser final action already drawn; state already pushed at pointerdown
      undoStack.current.push(canvasRef.current.toDataURL());
      if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
      redoStack.current = [];
    }
    drawingRef.current = false;
    startRef.current = null;
    snapshotRef.current = null;
  };

  // attach pointer listeners
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTool, currentColor]);

  // expose methods to parent
  useImperativeHandle(ref, () => ({
    undo,
    redo,
    saveToGallery: async () => {
      try {
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL("image/png");
        const token = localStorage.getItem("token");
        const payload = { title: `Board ${Date.now()}`, data_json: JSON.stringify({ png: dataUrl }) };
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
        const dataUrl = canvas.toDataURL("image/png");
        const blob = await (await fetch(dataUrl)).blob();
        const fd = new FormData(); fd.append("image", blob, "board.png");
        const token = localStorage.getItem("token");
        const res = await aiCleanup(fd, token);
        if (res?.data?.cleaned_png) {
          const img = new Image();
          img.onload = () => {
            const rect = canvas.getBoundingClientRect();
            ctxRef.current.clearRect(0, 0, rect.width, rect.height);
            ctxRef.current.drawImage(img, 0, 0, rect.width, rect.height);
            undoStack.current.push(canvas.toDataURL());
          };
          img.src = res.data.cleaned_png;
        } else {
          alert("AI returned no image");
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
      document.body.appendChild(a); a.click(); a.remove();
    },
  }));

  // main render: canvas container
  return (
    <div className="canvas-area" style={{ width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", background: "#fff", borderRadius: 8 }} />
    </div>
  );
});

export default CanvasBoard;
