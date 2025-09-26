import React from "react";
import ColorPicker from "./ColorPicker";

export default function ToolbarTop({ activeTool, setActiveTool, undo, redo, save, aiClean, color, setColor }) {
  const ToolButton = ({ tool, icon, label, onClick }) => (
    <button
      className={`tool-btn ${activeTool === tool ? "active" : ""}`}
      onClick={onClick || (() => setActiveTool(tool))}
    >
      {icon}
      <span className="tooltip-text">{label}</span>
    </button>
  );

  return (
    <div className="toolbar toolbar-top">
      <ToolButton tool="pen" icon="✏️" label="Pen" />
      <ToolButton tool="eraser" icon="🩹" label="Eraser" />
      <ToolButton tool="select" icon="🔲" label="Select" />

      {/* Color Picker */}
      <div style={{ padding: 6 }}>
        <ColorPicker
          onChange={(c) => {
            setColor(c);
            setActiveTool("pen");
          }}
        />
      </div>

      <ToolButton icon="↶" label="Undo" onClick={undo} />
      <ToolButton icon="↷" label="Redo" onClick={redo} />
      <ToolButton icon="💾" label="Save" onClick={save} />
      <ToolButton icon="🤖" label="AI Clean" onClick={aiClean} />
    </div>
  );
}
