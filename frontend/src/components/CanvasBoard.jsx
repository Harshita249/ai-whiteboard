import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { saveDiagram as apiSaveDiagram, aiCleanup as apiAiCleanup } from "../api";

/*
  CanvasBoard (full-feature)
  - Exposes methods via ref:
      undo(), redo(), saveToGallery(), aiClean(), downloadImage(), loadImage(dataUrl)
  - Props: activeTool, strokeColor
*/

const MAX_STACK = 150;

const CanvasBoard = forwardRef(({ activeTool = "pen", strokeColor = "#000" }, ref) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const isDrawingRef = useRef(false);
  const startRef = useRef(null);
  const snapshotRef = useRef(null); // dataURL of canvas before shape preview
  const snapshotImgRef = useRef(null);

  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // For text editing overlay
  const inputRef = useRef(null);

  // init canvas and DPR scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;

      // initial blank background if stack empty
      if (undoStack.current.length === 0) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, rect.height);
        undoStack.current.push(canvas.toDataURL());
      } else {
        // restore latest
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = undoStack.current[undoStack.current.length - 1];
      }
    };

    setup();
    window.addEventListener("resize", setup);
    return () => window.removeEventListener("resize", setup);
  }, []);

  // Utilities: map client coordinates to canvas coordinates (CSS -> canvas px)
  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    let clientX = e.clientX, clientY = e.clientY;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    return {
      x: (clientX - rect.left) * dpr,
      y: (clientY - rect.top) * dpr,
    };
  };

  // Undo / Redo
  const pushUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    undoStack.current.push(canvas.toDataURL());
    if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
    redoStack.current = [];
  };

  const restoreDataUrl = (dataUrl) => {
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
    if (prev) restoreDataUrl(prev);
  };

  const redo = () => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop();
    undoStack.current.push(next);
    restoreDataUrl(next);
  };

  // Drawing primitives
  const drawLineSegment = (from, to, color, width) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const drawShapeOnCtx = (a, b, tool, color) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (tool === "rect") {
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
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
        const head = 12;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - head * Math.cos(angle - Math.PI / 6), b.y - head * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - head * Math.cos(angle + Math.PI / 6), b.y - head * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    } else if (tool === "text") {
      // handled elsewhere
    }
  };

  // Preview shape: restore snapshot then draw shape
  const previewShape = (to) => {
    const canvas = canvasRef.current;
    const img = snapshotImgRef.current;
    const ctx = ctxRef.current;
    if (!snapshotRef.current || !canvas || !ctx) return;
    // If image already loaded, draw immediately
    if (img && img.complete) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      drawShapeOnCtx(startRef.current, to, activeTool, strokeColor);
    } else {
      // fallback: use new image and onload
      const im = new Image();
      im.onload = () => {
        snapshotImgRef.current = im;
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(im, 0, 0, rect.width, rect.height);
        drawShapeOnCtx(startRef.current, to, activeTool, strokeColor);
      };
      im.src = snapshotRef.current;
    }
  };

  // Pointer event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (ev) => {
      ev.preventDefault();
      // for text, we won't begin drawing; we will place input on click
      const pos = getEventPos(ev);
      isDrawingRef.current = true;
      startRef.current = pos;
      // snapshot current canvas for shape preview
      snapshotRef.current = canvas.toDataURL();
      snapshotImgRef.current = new Image();
      snapshotImgRef.current.src = snapshotRef.current;

      // push previous state into undo BEFORE performing the new action
      pushUndo();

      if (activeTool === "pen" || activeTool === "eraser") {
        const ctx = ctxRef.current;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      } else if (activeTool === "text") {
        // create small input overlay at the click position
        createTextInputAt(pos);
        // don't keep drawing mode for text
        isDrawingRef.current = false;
      }
      // capture pointer
      if (ev.pointerId && canvas.setPointerCapture) {
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
      }
    };

    const onPointerMove = (ev) => {
      if (!isDrawingRef.current) return;
      const pos = getEventPos(ev);
      if (activeTool === "pen") {
        drawLineSegment(startRef.current, pos, strokeColor || "#000", 2);
        startRef.current = pos;
      } else if (activeTool === "eraser") {
        drawLineSegment(startRef.current, pos, "#ffffff", 20);
        startRef.current = pos;
      } else {
        previewShape(pos);
      }
    };

    const onPointerUp = (ev) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const pos = getEventPos(ev);
      const canvas = canvasRef.current, ctx = ctxRef.current;
      if (!canvas || !ctx) return;

      if (activeTool === "pen" || activeTool === "eraser") {
        // final stroke already drawn, now push state (we already did pushUndo at pointerdown)
        undoStack.current.push(canvas.toDataURL());
        if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
        redoStack.current = [];
      } else {
        // finalize shape: restore snapshot then draw final
        const img = new Image();
        img.onload = () => {
          const rect = canvas.getBoundingClientRect();
          ctx.clearRect(0, 0, rect.width, rect.height);
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          drawShapeOnCtx(startRef.current, pos, activeTool, strokeColor || "#000");
          undoStack.current.push(canvas.toDataURL());
          if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
          redoStack.current = [];
        };
        img.src = snapshotRef.current;
      }

      // release pointer capture
      if (ev.pointerId && canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(ev.pointerId); } catch (e) {}
      }
    };

    const onPointerCancel = (ev) => {
      isDrawingRef.current = false;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [activeTool, strokeColor]);

  // helper: compute event pos mapped to canvas pixel coordinates
  function getEventPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dprX = canvas.width / rect.width;
    const dprY = canvas.height / rect.height;
    let clientX = e.clientX, clientY = e.clientY;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    return {
      x: (clientX - rect.left) * dprX,
      y: (clientY - rect.top) * dprY,
    };
  }

  // text input overlay
  function createTextInputAt(pos) {
    const container = containerRef.current;
    if (!container) return;
    // remove existing input if any
    if (inputRef.current) {
      inputRef.current.remove();
      inputRef.current = null;
    }
    // position in CSS coordinates
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = rect.width / canvasRef.current.width;
    const scaleY = rect.height / canvasRef.current.height;
    const left = pos.x * scaleX + rect.left - container.getBoundingClientRect().left;
    const top = pos.y * scaleY + rect.top - container.getBoundingClientRect().top;

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Type and press Enter";
    input.style.position = "absolute";
    input.style.left = `${left}px`;
    input.style.top = `${top}px`;
    input.style.zIndex = 9999;
    input.style.background = "rgba(255,255,255,0.95)";
    input.style.color = "#000";
    input.style.padding = "6px";
    input.style.borderRadius = "6px";
    input.style.border = "1px solid rgba(0,0,0,0.15)";
    input.style.minWidth = "80px";

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        const textValue = input.value;
        if (textValue.trim()) {
          // draw text to canvas (convert pos back to canvas coordinates)
          const canvasRect = canvasRef.current.getBoundingClientRect();
          const dprX = canvasRef.current.width / canvasRect.width;
          const dprY = canvasRef.current.height / canvasRect.height;
          const cx = (left - (canvasRect.left - container.getBoundingClientRect().left)) * dprX;
          const cy = (top - (canvasRect.top - container.getBoundingClientRect().top)) * dprY;
          // draw
          const ctx = ctxRef.current;
          ctx.fillStyle = strokeColor || "#000";
          ctx.font = "18px sans-serif";
          ctx.fillText(textValue, cx, cy);
          undoStack.current.push(canvasRef.current.toDataURL());
          if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
        }
        input.remove();
        inputRef.current = null;
      } else if (ev.key === "Escape") {
        input.remove();
        inputRef.current = null;
      }
    });

    container.appendChild(input);
    input.focus();
    inputRef.current = input;
  }

  // Exposed API
  useImperativeHandle(ref, () => ({
    undo: () => undo(),
    redo: () => redo(),
    saveToGallery: async () => {
      try {
        const canvas = canvasRef.current;
        const dataUrl = canvas.toDataURL("image/png");
        // submit to backend via api
        const payload = { title: `Diagram ${Date.now()}`, data_json: JSON.stringify({ png: dataUrl }) };
        await apiSaveDiagram(payload, localStorage.getItem("token"));
        alert("Saved to gallery");
      } catch (err) {
        console.error("Save failed", err);
        alert("Save failed");
      }
    },
    aiClean: async () => {
      try {
        const dataUrl = canvasRef.current.toDataURL();
        const blob = await (await fetch(dataUrl)).blob();
        const fd = new FormData();
        fd.append("image", blob, "board.png");
        const res = await apiAiCleanup(fd, localStorage.getItem("token"));
        if (res?.data?.cleaned_png) {
          const img = new Image();
          img.onload = () => {
            const rect = canvasRef.current.getBoundingClientRect();
            ctxRef.current.clearRect(0, 0, rect.width, rect.height);
            ctxRef.current.drawImage(img, 0, 0, rect.width, rect.height);
            undoStack.current.push(canvasRef.current.toDataURL());
          };
          img.src = res.data.cleaned_png;
        } else {
          alert("AI returned no image");
        }
      } catch (err) {
        console.error("AI clean error", err);
        alert("AI clean failed");
      }
    },
    downloadImage: () => {
      const a = document.createElement("a");
      a.href = canvasRef.current.toDataURL("image/png");
      a.download = `whiteboard-${Date.now()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    },
    loadImage: (dataUrl) => {
      const img = new Image();
      img.onload = () => {
        const rect = canvasRef.current.getBoundingClientRect();
        ctxRef.current.clearRect(0, 0, rect.width, rect.height);
        ctxRef.current.drawImage(img, 0, 0, rect.width, rect.height);
        undoStack.current.push(canvasRef.current.toDataURL());
      };
      img.src = dataUrl;
    }
  }));

  // initial draw helper to fill white background if empty
  useEffect(() => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = ctxRef.current;
    if (canvas && ctx && undoStack.current.length === 0) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);
      undoStack.current.push(canvas.toDataURL());
    }
  }, []);

  // small helper for finalizing shapes manually (if needed)
  function finalizeCurrentShape(endPos) {
    // used elsewhere; not required here
  }

  return (
    <div ref={containerRef} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, position: "relative" }}>
      <div style={{ width: "100%", maxWidth: 1100, height: 680, background: "transparent" }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block", borderRadius: 8, background: "#fff", border: "1px solid rgba(0,0,0,0.06)" }}
        />
      </div>
    </div>
  );
});

export default CanvasBoard;
