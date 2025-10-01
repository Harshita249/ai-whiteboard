/* CanvasBoard.jsx
   Full-featured whiteboard canvas component.

   Key features:
   - Pen (freehand), Eraser (destination-out), Rectangle, Ellipse, Line, Arrow, Text
   - Live preview overlay while drawing shapes
   - Undo / Redo (history of image snapshots)
   - Save to gallery (calls /api/gallery, requires backend)
   - Download PNG (native)
   - Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
   - Toolbar event wiring via window CustomEvents:
       - "tool-change" { tool }
       - "color-change" { color }
       - "action" { name }
       - "tooltip-show" / "tooltip-hide"
   - Proper canvas coordinate math (bounding rect + devicePixelRatio)
   - Responsive resizing
*/

import React, { useRef, useEffect, useState } from "react";

/* small helper to download without extra deps */
function downloadDataUrl(dataUrl, filename = "whiteboard.png") {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function CanvasBoard() {
  const containerRef = useRef(null);
  const mainRef = useRef(null);     // main canvas (committed drawing)
  const overlayRef = useRef(null);  // overlay canvas (preview)
  const [ctx, setCtx] = useState(null);
  const [overlayCtx, setOverlayCtx] = useState(null);

  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);

  // history for undo/redo (store dataURL snapshots)
  const historyRef = useRef([]);
  const redoRef = useRef([]);
  const MAX_HISTORY = 60;

  // gallery (client-side cache)
  const [gallery, setGallery] = useState([]);

  // tooltip state (for floating tooltip)
  const [tooltip, setTooltip] = useState({ show: false, text: "", x: 0, y: 0 });

  // device pixel ratio used to size canvas backing store
  const getDPR = () => window.devicePixelRatio || 1;

  // Initialize canvas context and sizing
  useEffect(() => {
    const resize = () => {
      const container = containerRef.current;
      const main = mainRef.current;
      const overlay = overlayRef.current;
      if (!container || !main || !overlay) return;

      // target CSS size
      const w = Math.max(400, container.clientWidth);
      const h = Math.max(300, container.clientHeight);

      const dpr = getDPR();
      main.style.width = w + "px";
      main.style.height = h + "px";
      overlay.style.width = w + "px";
      overlay.style.height = h + "px";

      main.width = Math.round(w * dpr);
      main.height = Math.round(h * dpr);
      overlay.width = Math.round(w * dpr);
      overlay.height = Math.round(h * dpr);

      const mctx = main.getContext("2d");
      const octx = overlay.getContext("2d");

      // scale so drawing operations use CSS pixels
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);

      mctx.lineCap = "round";
      mctx.lineJoin = "round";
      octx.lineCap = "round";
      octx.lineJoin = "round";

      setCtx(() => mctx);
      setOverlayCtx(() => octx);

      // After resize, if we have a saved snapshot at top of history, restore it
      if (historyRef.current.length > 0) {
        const last = historyRef.current[historyRef.current.length - 1];
        if (last) {
          const img = new Image();
          img.onload = () => {
            mctx.clearRect(0, 0, main.width, main.height);
            // draw scaled to CSS pixels (context already scaled)
            mctx.drawImage(img, 0, 0, w, h);
          };
          img.src = last;
        }
      } else {
        // clear canvases
        mctx.clearRect(0, 0, main.width, main.height);
        octx.clearRect(0, 0, overlay.width, overlay.height);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Wire toolbar events
  useEffect(() => {
    const onTool = (e) => setTool(e.detail.tool);
    const onColor = (e) => setColor(e.detail.color);
    const onAction = async (e) => {
      const name = e.detail.name;
      if (name === "undo") undo();
      else if (name === "redo") redo();
      else if (name === "download") download();
      else if (name === "save") await saveToGallery();
      else if (name === "aiClean") await aiClean();
    };
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

  // Keyboard shortcuts
  useEffect(() => {
    const kb = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
        e.preventDefault();
        redo();
      }
      if (e.key === "Delete") {
        // clear overlay selection if any
        if (overlayCtx && overlayRef.current) {
          overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
        }
      }
    };
    window.addEventListener("keydown", kb);
    return () => window.removeEventListener("keydown", kb);
  }, [overlayCtx]);

  // Utility: convert client event to canvas coords (CSS pixels), considering DPR and context transform
  const clientToCanvas = (clientX, clientY) => {
    const canvas = mainRef.current;
    const rect = canvas.getBoundingClientRect();
    // Use CSS coordinate system for drawing (context is scaled accordingly)
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // Snapshot history
  const pushHistory = () => {
    if (!mainRef.current) return;
    const cssW = mainRef.current.clientWidth;
    const cssH = mainRef.current.clientHeight;
    // use toDataURL of CSS-sized canvas: draw current content to an offscreen canvas scaled to CSS pixels
    // But simplest: toDataURL on canvas (context scaled) produces a DPR scaled image; that's fine for snapshots.
    const data = mainRef.current.toDataURL();
    historyRef.current.push(data);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    // clear redo stack
    redoRef.current = [];
  };

  const restoreFromDataUrl = (dataUrl) => {
    if (!ctx || !mainRef.current) return;
    const img = new Image();
    img.onload = () => {
      // clear main canvas (CSS pixel size)
      const w = mainRef.current.clientWidth;
      const h = mainRef.current.clientHeight;
      ctx.clearRect(0, 0, mainRef.current.width, mainRef.current.height);
      // draw using CSS pixel coordinates (context already scaled)
      ctx.drawImage(img, 0, 0, w, h);
    };
    img.src = dataUrl;
  };

  // Undo
  const undo = () => {
    if (historyRef.current.length === 0) return;
    const last = historyRef.current.pop();
    redoRef.current.push(last);
    const top = historyRef.current[historyRef.current.length - 1];
    if (top) {
      restoreFromDataUrl(top);
    } else {
      // nothing left: clear canvas
      ctx && ctx.clearRect(0, 0, mainRef.current.width, mainRef.current.height);
    }
  };

  // Redo
  const redo = () => {
    if (redoRef.current.length === 0) return;
    const next = redoRef.current.pop();
    historyRef.current.push(next);
    restoreFromDataUrl(next);
  };

  // Pointer event handlers
  const handlePointerDown = (ev) => {
    if (!ctx || !overlayCtx) return;
    ev.preventDefault();
    const isTouch = ev.type.startsWith("touch");
    const clientX = isTouch ? ev.touches[0].clientX : ev.clientX;
    const clientY = isTouch ? ev.touches[0].clientY : ev.clientY;
    const pos = clientToCanvas(clientX, clientY);
    setIsDrawing(true);
    setStartPos(pos);

    if (tool === "pen" || tool === "eraser") {
      pushHistory();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = tool === "eraser" ? 20 : 2;
      ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    }
  };

  const handlePointerMove = (ev) => {
    if (!isDrawing || !ctx || !overlayCtx) return;
    ev.preventDefault();
    const isTouch = ev.type.startsWith("touch");
    const clientX = isTouch ? (ev.touches && ev.touches[0] && ev.touches[0].clientX) : ev.clientX;
    const clientY = isTouch ? (ev.touches && ev.touches[0] && ev.touches[0].clientY) : ev.clientY;
    const pos = clientToCanvas(clientX, clientY);

    if (tool === "pen" || tool === "eraser") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      // shape preview
      overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      overlayCtx.strokeStyle = color;
      overlayCtx.lineWidth = 2;
      if (!startPos) return;
      const sx = startPos.x;
      const sy = startPos.y;
      const dx = pos.x;
      const dy = pos.y;

      if (tool === "rect") {
        overlayCtx.strokeRect(sx, sy, dx - sx, dy - sy);
      } else if (tool === "ellipse") {
        overlayCtx.beginPath();
        overlayCtx.ellipse((sx + dx) / 2, (sy + dy) / 2, Math.abs(dx - sx) / 2, Math.abs(dy - sy) / 2, 0, 0, Math.PI * 2);
        overlayCtx.stroke();
      } else if (tool === "line") {
        overlayCtx.beginPath();
        overlayCtx.moveTo(sx, sy);
        overlayCtx.lineTo(dx, dy);
        overlayCtx.stroke();
      } else if (tool === "arrow") {
        drawArrow(overlayCtx, { x: sx, y: sy }, { x: dx, y: dy }, color);
      } else if (tool === "text") {
        overlayCtx.font = "18px Arial";
        overlayCtx.fillStyle = color;
        overlayCtx.fillText("Text", dx + 4, dy + 4);
      }
    }
  };

  const handlePointerUp = (ev) => {
    if (!isDrawing || !ctx || !overlayCtx) return;
    ev.preventDefault();
    setIsDrawing(false);
    const isTouch = ev.type.startsWith("touch");
    const clientX = isTouch ? (ev.changedTouches && ev.changedTouches[0] && ev.changedTouches[0].clientX) : ev.clientX;
    const clientY = isTouch ? (ev.changedTouches && ev.changedTouches[0] && ev.changedTouches[0].clientY) : ev.clientY;
    const pos = clientToCanvas(clientX, clientY);

    if (tool === "pen" || tool === "eraser") {
      ctx.stroke();
      ctx.closePath();
      ctx.globalCompositeOperation = "source-over";
      pushHistory();
    } else {
      // commit preview to main canvas
      const sx = startPos.x;
      const sy = startPos.y;
      const dx = pos.x;
      const dy = pos.y;

      pushHistory();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      if (tool === "rect") {
        ctx.strokeRect(sx, sy, dx - sx, dy - sy);
      } else if (tool === "ellipse") {
        ctx.beginPath();
        ctx.ellipse((sx + dx) / 2, (sy + dy) / 2, Math.abs(dx - sx) / 2, Math.abs(dy - sy) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tool === "line") {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(dx, dy);
        ctx.stroke();
      } else if (tool === "arrow") {
        drawArrow(ctx, { x: sx, y: sy }, { x: dx, y: dy }, color);
      } else if (tool === "text") {
        const txt = window.prompt("Enter text:");
        if (txt) {
          ctx.fillStyle = color;
          ctx.font = "18px Arial";
          ctx.fillText(txt, dx, dy);
        }
      }
      overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    }

    setStartPos(null);
  };

  // Arrow draw helper
  const drawArrow = (context, from, to, strokeStyle = "#000") => {
    const headlen = 10;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.strokeStyle = strokeStyle;
    context.stroke();

    context.beginPath();
    context.moveTo(to.x, to.y);
    context.lineTo(to.x - headlen * Math.cos(angle - Math.PI / 6), to.y - headlen * Math.sin(angle - Math.PI / 6));
    context.lineTo(to.x - headlen * Math.cos(angle + Math.PI / 6), to.y - headlen * Math.sin(angle + Math.PI / 6));
    context.closePath();
    context.fillStyle = strokeStyle;
    context.fill();
  };

  // Save current canvas to gallery (calls backend)
  const saveToGallery = async () => {
    if (!mainRef.current) return;
    const data = mainRef.current.toDataURL("image/png");
    // add to UI gallery
    setGallery((g) => [data, ...g]);

    try {
      // If backend requires a token, include Authorization header here
      await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Sketch ${Date.now()}`, data_json: data }),
      });
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  // Load gallery from backend
  const loadGallery = async () => {
    try {
      const res = await fetch("/api/gallery");
      if (res.ok) {
        const data = await res.json();
        // backend might return { items: [...] } or array; adapt if needed
        setGallery(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      console.warn("Load gallery failed", err);
    }
  };

  // Delete gallery item by id
  const deleteGalleryItem = async (id) => {
    try {
      await fetch(`/api/gallery/${id}`, { method: "DELETE" });
      loadGallery();
    } catch (err) {
      console.warn("Delete failed", err);
    }
  };

  // Download current canvas
  const download = () => {
    if (!mainRef.current) return;
    const url = mainRef.current.toDataURL("image/png");
    downloadDataUrl(url, "whiteboard.png");
  };

  // Simple AI clean stub (calls /api/ai/cleanup if exists)
  const aiClean = async () => {
    try {
      const data = mainRef.current.toDataURL("image/png");
      const res = await fetch("/api/ai/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.cleaned_image) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, mainRef.current.width, mainRef.current.height);
            ctx.drawImage(img, 0, 0, mainRef.current.clientWidth, mainRef.current.clientHeight);
            pushHistory();
          };
          img.src = json.cleaned_image;
        }
      } else {
        alert("AI clean failed");
      }
    } catch (err) {
      console.warn("AI Clean error", err);
      alert("AI Clean not available");
    }
  };

  // Initial load: get gallery
  useEffect(() => {
    loadGallery();
  }, []);

  // Attach pointer listeners to overlay/main appropriately
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    // use pointer events for better cross-device
    main.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      main.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [ctx, overlayCtx, isDrawing, startPos, tool, color]);

  // Render
  return (
    <div className="board-container" style={{ display: "flex", gap: 16, height: "70vh" }}>
      <div style={{ flex: 1, position: "relative" }} ref={containerRef}>
        <div style={{ position: "relative", width: "100%", height: "100%", background: "#fff", borderRadius: 10 }}>
          <canvas ref={mainRef} style={{ position: "absolute", left: 0, top: 0, zIndex: 1, width: "100%", height: "100%" }} />
          <canvas ref={overlayRef} style={{ position: "absolute", left: 0, top: 0, zIndex: 2, width: "100%", height: "100%", pointerEvents: "none" }} />
          {/* tooltip */}
          {tooltip.show && (
            <div style={{
              position: "fixed",
              left: tooltip.x,
              top: tooltip.y - 28,
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              padding: "6px 8px",
              borderRadius: 6,
              zIndex: 9999,
              fontSize: 13
            }}>{tooltip.text}</div>
          )}
        </div>
      </div>

      <aside style={{ width: 320, background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8 }}>
        <h3>Gallery</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {gallery.length === 0 && <div className="small">No saved items</div>}
          {gallery.map((item, idx) => {
            // backend might return items with id and data_json; be flexible
            const src = item.data_json || item || "";
            const id = item.id || idx;
            return (
              <div key={id} style={{ borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.03)", padding: 6 }}>
                <img src={src} alt={`g-${id}`} style={{ width: "100%", display: "block" }} />
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button onClick={() => {
                    // open into canvas (push to history)
                    const img = new Image();
                    img.onload = () => {
                      ctx.clearRect(0, 0, mainRef.current.width, mainRef.current.height);
                      ctx.drawImage(img, 0, 0, mainRef.current.clientWidth, mainRef.current.clientHeight);
                      pushHistory();
                    };
                    img.src = src;
                  }}>Open</button>
                  {item.id && <button onClick={() => deleteGalleryItem(item.id)}>Delete</button>}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
