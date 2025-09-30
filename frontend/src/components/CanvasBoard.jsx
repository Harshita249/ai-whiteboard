/* CanvasBoard.jsx — big, feature-complete version */
import React, { useRef, useEffect, useState } from "react";
import axios from "axios";

/*
 Features:
 - pen, eraser (destination-out), rect, ellipse, line, arrow, text
 - live preview on overlay canvas while dragging
 - undo/redo via dataURL stack
 - download PNG
 - save/load/delete gallery (calls /api/gallery)
 - listens to window events: tool-change, color-change, action, tooltip-show/hide
 - keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo), Delete (clear selection)
 - responsive resize handling
*/

const DEFAULT_LINE_WIDTH = 2;
const ERASER_WIDTH = 20;
const PREVIEW_LINE_WIDTH = 2;

function getCoordsFromEvent(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  // use clientX / clientY for mouse; support touch events if needed
  const clientX = e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX);
  const clientY = e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY);

  // Map to canvas internal coordinates
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

export default function CanvasBoard() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [overlayCtx, setOverlayCtx] = useState(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);

  // history as array of dataURLs
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);

  // gallery state
  const [gallery, setGallery] = useState([]);
  const [tooltip, setTooltip] = useState({ show: false, text: "", x: 0, y: 0 });

  // ensure canvas pixel ratio & size
  function setupCanvases() {
    const c = canvasRef.current;
    const o = overlayRef.current;
    if (!c || !o || !containerRef.current) return;

    // Use devicePixelRatio to keep drawing crisp
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(400, containerRef.current.clientWidth);
    const height = Math.max(300, containerRef.current.clientHeight - 16);

    c.style.width = width + "px";
    c.style.height = height + "px";
    o.style.width = width + "px";
    o.style.height = height + "px";

    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    o.width = Math.round(width * dpr);
    o.height = Math.round(height * dpr);

    const cctx = c.getContext("2d");
    const octx = o.getContext("2d");
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale to device pixels
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cctx.lineCap = "round";
    cctx.lineJoin = "round";
    octx.lineCap = "round";
    octx.lineJoin = "round";

    setCtx(cctx);
    setOverlayCtx(octx);
  }

  useEffect(() => {
    setupCanvases();
    window.addEventListener("resize", setupCanvases);
    return () => window.removeEventListener("resize", setupCanvases);
  }, []);

  // toolbar and tooltip events
  useEffect(() => {
    const onTool = (e) => setTool(e.detail.tool);
    const onColor = (e) => setColor(e.detail.color);
    const onAction = (e) => handleAction(e.detail.name);
    const onTooltipShow = (e) => setTooltip({ show: true, ...e.detail });
    const onTooltipHide = () => setTooltip({ show: false, text: "" });

    window.addEventListener("tool-change", onTool);
    window.addEventListener("color-change", onColor);
    window.addEventListener("action", onAction);
    window.addEventListener("tooltip-show", onTooltipShow);
    window.addEventListener("tooltip-hide", onTooltipHide);

    return () => {
      window.removeEventListener("tool-change", onTool);
      window.removeEventListener("color-change", onColor);
      window.removeEventListener("action", onAction);
      window.removeEventListener("tooltip-show", onTooltipShow);
      window.removeEventListener("tooltip-hide", onTooltipHide);
    };
  }, [ctx, overlayCtx]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === "z") {
        ev.preventDefault();
        undo();
      } else if ((ev.ctrlKey || ev.metaKey) && (ev.key === "y" || (ev.shiftKey && ev.key === "Z"))) {
        ev.preventDefault();
        redo();
      } else if (ev.key === "Delete") {
        // clear overlay/selection
        overlayCtx && overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctx, overlayCtx]);

  // --- history helpers ---
  function pushHistory() {
    if (!canvasRef.current) return;
    const data = canvasRef.current.toDataURL("image/png");
    undoStackRef.current.push(data);
    // limit stack size (prevent runaway memory)
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
  }

  function undo() {
    if (!ctx || undoStackRef.current.length === 0) return;
    const last = undoStackRef.current.pop();
    redoStackRef.current.push(canvasRef.current.toDataURL());
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    img.src = last;
  }

  function redo() {
    if (!ctx || redoStackRef.current.length === 0) return;
    const data = redoStackRef.current.pop();
    undoStackRef.current.push(canvasRef.current.toDataURL());
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    img.src = data;
  }

  // --- drawing helpers ---
  function beginStroke(pos) {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function continueStroke(pos, t) {
    if (!ctx) return;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endStroke() {
    if (!ctx) return;
    ctx.closePath();
  }

  function drawArrowHead(context, from, to) {
    const headlen = 10;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    context.beginPath();
    context.moveTo(to.x, to.y);
    context.lineTo(
      to.x - headlen * Math.cos(angle - Math.PI / 6),
      to.y - headlen * Math.sin(angle - Math.PI / 6)
    );
    context.moveTo(to.x, to.y);
    context.lineTo(
      to.x - headlen * Math.cos(angle + Math.PI / 6),
      to.y - headlen * Math.sin(angle + Math.PI / 6)
    );
    context.stroke();
  }

  // Mouse/touch handlers
  function handlePointerDown(e) {
    if (!ctx || !overlayCtx) return;
    // prevent text selection
    e.preventDefault();
    const pos = getCoordsFromEvent(canvasRef.current, e);
    setStartPos(pos);
    setIsDrawing(true);

    if (tool === "pen" || tool === "eraser") {
      pushHistory();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = tool === "eraser" ? ERASER_WIDTH : DEFAULT_LINE_WIDTH;
      ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    }
  }

  function handlePointerMove(e) {
    if (!ctx || !overlayCtx) return;
    const pos = getCoordsFromEvent(canvasRef.current, e);
    if (!isDrawing) return;

    if (tool === "pen" || tool === "eraser") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      // live preview on overlay
      overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      overlayCtx.strokeStyle = color;
      overlayCtx.lineWidth = PREVIEW_LINE_WIDTH;

      const sx = startPos.x;
      const sy = startPos.y;
      const dx = pos.x;
      const dy = pos.y;

      if (tool === "rect") {
        overlayCtx.strokeRect(sx, sy, dx - sx, dy - sy);
      } else if (tool === "ellipse") {
        overlayCtx.beginPath();
        overlayCtx.ellipse(
          (sx + dx) / 2,
          (sy + dy) / 2,
          Math.abs(dx - sx) / 2,
          Math.abs(dy - sy) / 2,
          0,
          0,
          Math.PI * 2
        );
        overlayCtx.stroke();
      } else if (tool === "line" || tool === "arrow") {
        overlayCtx.beginPath();
        overlayCtx.moveTo(sx, sy);
        overlayCtx.lineTo(dx, dy);
        overlayCtx.stroke();
        if (tool === "arrow") drawArrowHead(overlayCtx, { x: sx, y: sy }, { x: dx, y: dy });
      } else if (tool === "text") {
        overlayCtx.font = "18px Arial";
        overlayCtx.fillStyle = color;
        overlayCtx.fillText("Text", pos.x + 4, pos.y + 4);
      }
    }
  }

  function handlePointerUp(e) {
    if (!ctx || !overlayCtx) return;
    if (!isDrawing) return;
    setIsDrawing(false);
    const pos = getCoordsFromEvent(canvasRef.current, e);

    if (tool === "pen" || tool === "eraser") {
      endStroke();
      ctx.globalCompositeOperation = "source-over";
      pushHistory();
    } else if (["rect", "ellipse", "line", "arrow", "text"].includes(tool)) {
      // commit overlay drawing to main canvas
      pushHistory();
      ctx.drawImage(overlayRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      // for arrow, ensure head drawn on final canvas too
      if (tool === "arrow") {
        drawArrowHead(ctx, startPos, pos);
      }
      overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
  }

  // --- actions from toolbar ---
  async function handleAction(name) {
    if (name === "undo") {
      undo();
    } else if (name === "redo") {
      redo();
    } else if (name === "download") {
      downloadPNG();
    } else if (name === "save") {
      await saveToGallery();
    } else if (name === "aiClean") {
      // placeholder: call ai endpoint if available
      alert("AI Clean: not implemented on server — placeholder");
    }
  }

  function downloadPNG() {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "whiteboard.png";
    a.click();
  }

  // --- gallery calls ---
  async function saveToGallery() {
    if (!canvasRef.current) return;
    const data = canvasRef.current.toDataURL("image/png");
    try {
      await axios.post("/api/gallery", { title: "Saved diagram", data });
      await loadGallery();
      alert("Saved to gallery");
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed (check console and backend)");
    }
  }

  async function loadGallery() {
    try {
      const res = await axios.get("/api/gallery");
      setGallery(res.data || []);
    } catch (err) {
      console.warn("Load gallery failed", err);
      setGallery([]);
    }
  }

  async function deleteItem(id) {
    try {
      await axios.delete(`/api/gallery/${id}`);
      await loadGallery();
    } catch (err) {
      console.warn("Delete failed", err);
      alert("Delete failed");
    }
  }

  useEffect(() => {
    // initial load
    loadGallery();
  }, []);

  // Attach pointer events to the visible canvas element (not overlay)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [ctx, overlayCtx, tool, color, isDrawing, startPos]);

  return (
    <>
      <div className="board-container" ref={containerRef}>
        <div className="board-canvas-area">
          <canvas ref={canvasRef} className="main-canvas" />
          <canvas ref={overlayRef} className="overlay-canvas" />
          {tooltip.show && (
            <div className="tooltip-floating" style={{ left: tooltip.x, top: tooltip.y }}>
              {tooltip.text}
            </div>
          )}
        </div>

        <aside className="gallery-panel">
          <h3>Gallery</h3>
          {gallery.length === 0 && <div className="small">No saved items</div>}
          <div className="gallery-list">
            {gallery.map((g) => (
              <div key={g.id} className="gallery-item">
                <img src={g.data_json} alt={g.title} />
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button onClick={() => {
                    const img = new Image();
                    img.src = g.data_json;
                    img.onload = () => {
                      pushHistory();
                      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
                    };
                  }}>Open</button>
                  <button onClick={() => deleteItem(g.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <style jsx>{`
        .board-container {
          display: flex;
          gap: 16px;
          align-items: stretch;
          height: 72vh;
          padding: 12px;
        }
        .board-canvas-area {
          flex: 1;
          position: relative;
          border-radius: 8px;
          background: #fff;
          overflow: hidden;
          box-shadow: 0 4px 30px rgba(2,6,23,0.4);
        }
        .main-canvas, .overlay-canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .overlay-canvas {
          position: absolute;
          left: 0;
          top: 0;
          pointer-events: none;
        }
        .gallery-panel {
          width: 320px;
          background: rgba(255,255,255,0.02);
          border-radius: 8px;
          padding: 12px;
        }
        .gallery-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }
        .gallery-item img {
          width: 100%;
          border-radius: 6px;
          border: 2px solid rgba(255,255,255,0.03);
        }
        .tooltip-floating {
          position: absolute;
          transform: translate(-50%, -150%);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          z-index: 9999;
          font-size: 13px;
        }
          .main-canvas, .overlay-canvas {
          display: block;
          width: 100%;
          height: 100%;
     }

         .overlay-canvas {
         position: absolute;
         left: 0;
         top: 0;
        pointer-events: none;
        z-index: 2; /* ensure it is above the main canvas */
     }

      `}</style>
    </>
  );
}
