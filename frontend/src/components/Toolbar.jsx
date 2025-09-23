import React, { useState } from "react";
import ColorPicker from "./ColorPicker";
import ShapesPanel from "./ShapesPanel";

/*
 Toolbar buttons now dispatch custom window events:
  - tool-change { tool: 'pen'|'eraser'|'rect'|'ellipse'|'line'|'arrow'|'text'|'select' }
  - color-change { color: '#xxxxxx' }
  - action { name: 'undo'|'redo'|'save'|'aiClean' }
*/

function emit(evName, detail = {}) {
  window.dispatchEvent(new CustomEvent(evName, { detail }));
}

function ToolButton({ title, tool, children, isActive, onClick }) {
  return (
    <button
      className={`tool-btn ${isActive ? "active" : ""}`}
      title={title}
      onClick={onClick}
    >
      {children}
      <span className="tooltip-text">{title}</span>
    </button>
  );
}

export default function Toolbar() {
  const [activeTool, setActiveTool] = useState("pen");

  const handleToolClick = (tool) => {
    setActiveTool(tool);
    emit("tool-change", { tool });
  };

  return (
    <div className="toolbar">
      <ToolButton
        title="Pen"
        tool="pen"
        isActive={activeTool === "pen"}
        onClick={() => handleToolClick("pen")}
      >
        ✏️
      </ToolButton>

      <ToolButton
        title="Eraser"
        tool="eraser"
        isActive={activeTool === "eraser"}
        onClick={() => handleToolClick("eraser")}
      >
        🧽
      </ToolButton>

      <ToolButton
        title="Select"
        tool="select"
        isActive={activeTool === "select"}
        onClick={() => handleToolClick("select")}
      >
        🔲
      </ToolButton>

      <ShapesPanel />

      <ColorPicker onChange={(color) => emit("color-change", { color })} />

      <ToolButton title="Undo" onClick={() => emit("action", { name: "undo" })}>
        ↶
      </ToolButton>

      <ToolButton title="Redo" onClick={() => emit("action", { name: "redo" })}>
        ↷
      </ToolButton>

      <ToolButton title="Save" onClick={() => emit("action", { name: "save" })}>
        💾
      </ToolButton>

      <ToolButton
        title="AI Clean"
        onClick={() => emit("action", { name: "aiClean" })}
      >
        🤖
      </ToolButton>

      <ToolButton
        title="Gallery"
        onClick={() => emit("action", { name: "gallery" })}
      >
        🖼️
      </ToolButton>
    </div>
  );
}
