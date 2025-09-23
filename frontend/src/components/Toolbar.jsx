import React from "react";
import ColorPicker from "./ColorPicker";
import ShapesPanel from "./ShapesPanel";

/*
 Toolbar buttons now dispatch custom window events:
  - tool-change { tool: 'pen'|'eraser'|'rect'|'ellipse'|'line'|'arrow'|'text'|'select' }
  - color-change { color: '#xxxxxx' }
  - action { name: 'undo'|'redo'|'save'|'aiClean' }
  - tooltip-show { text, x, y }
  - tooltip-hide
*/

function emit(evName, detail = {}) {
  window.dispatchEvent(new CustomEvent(evName, { detail }));
}

function ToolButton({ title, children, tool, onClick }) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (tool) {
      emit("tool-change", { tool });
    }
  };

  const onEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    emit("tooltip-show", { text: title, x: rect.left + rect.width / 2, y: rect.top });
  };
  const onLeave = () => emit("tooltip-hide");

  return (
    <button
      className="btn"
      title={title}
      onClick={handleClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onTouchStart={() => emit("tooltip-show", { text: title })}
      onTouchEnd={() => emit("tooltip-hide")}
    >
      {children}
    </button>
  );
}

export default function Toolbar() {
  return (
    <div className="toolbar">
      <ToolButton title="Pen" tool="pen">✏️</ToolButton>
      <ToolButton title="Eraser" tool="eraser">🧽</ToolButton>
      <ToolButton title="Select" tool="select">🔲</ToolButton>

      <ShapesPanel />

      <ColorPicker onChange={(color) => emit("color-change", { color })} />

      <ToolButton title="Undo" onClick={() => emit("action", { name: "undo" })}>↶</ToolButton>
      <ToolButton title="Redo" onClick={() => emit("action", { name: "redo" })}>↷</ToolButton>
      <ToolButton title="Save" onClick={() => emit("action", { name: "save" })}>💾</ToolButton>
      <ToolButton title="AI Clean" onClick={() => emit("action", { name: "aiClean" })}>🤖</ToolButton>
    </div>
  );
}
