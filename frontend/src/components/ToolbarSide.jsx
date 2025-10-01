import React from "react";

/*
 ToolbarSide.jsx
 - Emits window CustomEvents so CanvasBoard listens and updates.
 - Events:
    "tool-change" => detail: { tool: 'pen'|'eraser'|'rect'|'ellipse'|'line'|'arrow'|'text'|'select' }
    "action" => detail: { name: 'undo'|'redo'|'save'|'download'|'aiClean' }
    "tooltip-show" => detail: { text, x, y }
    "tooltip-hide"
*/

function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function ToolButton({ title, tool, children }) {
  const onClick = () => {
    if (tool) emit("tool-change", { tool });
  };
  const onEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    emit("tooltip-show", { text: title, x: r.left + r.width / 2, y: r.top });
  };
  return (
    <button
      className="tool-btn"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={() => emit("tooltip-hide")}
      onTouchStart={() => emit("tooltip-show", { text: title })}
      onTouchEnd={() => emit("tooltip-hide")}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}

export default function ToolbarSide() {
  return (
    <div className="toolbar-side">
      <ToolButton title="Pen" tool="pen">✏️</ToolButton>
      <ToolButton title="Eraser" tool="eraser">🧽</ToolButton>
      <div className="separator" />
      <ToolButton title="Rectangle" tool="rect">▭</ToolButton>
      <ToolButton title="Ellipse" tool="ellipse">◯</ToolButton>
      <ToolButton title="Line" tool="line">—</ToolButton>
      <ToolButton title="Arrow" tool="arrow">➤</ToolButton>
      <ToolButton title="Text" tool="text">A</ToolButton>
      <div className="separator" />
      <button
        className="tool-btn"
        onClick={() => emit("action", { name: "undo" })}
        onMouseEnter={(e) => emit("tooltip-show", { text: "Undo", x: e.currentTarget.getBoundingClientRect().left })}
        onMouseLeave={() => emit("tooltip-hide")}
      >↶</button>
      <button
        className="tool-btn"
        onClick={() => emit("action", { name: "redo" })}
        onMouseEnter={(e) => emit("tooltip-show", { text: "Redo", x: e.currentTarget.getBoundingClientRect().left })}
        onMouseLeave={() => emit("tooltip-hide")}
      >↷</button>

      <div style={{ height: 8 }} />

      <button
        className="tool-btn"
        onClick={() => emit("action", { name: "save" })}
        onMouseEnter={(e) => emit("tooltip-show", { text: "Save to gallery", x: e.currentTarget.getBoundingClientRect().left })}
        onMouseLeave={() => emit("tooltip-hide")}
      >💾</button>

      <button
        className="tool-btn"
        onClick={() => emit("action", { name: "download" })}
        onMouseEnter={(e) => emit("tooltip-show", { text: "Download PNG", x: e.currentTarget.getBoundingClientRect().left })}
        onMouseLeave={() => emit("tooltip-hide")}
      >⬇</button>

      <button
        className="tool-btn"
        onClick={() => emit("action", { name: "aiClean" })}
        onMouseEnter={(e) => emit("tooltip-show", { text: "AI Clean", x: e.currentTarget.getBoundingClientRect().left })}
        onMouseLeave={() => emit("tooltip-hide")}
      >🤖</button>
    </div>
  );
}
