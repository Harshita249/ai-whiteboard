import React from "react";

export default function ToolbarSide({ activeTool, setActiveTool }) {
  const ToolButton = ({ tool, icon, label }) => (
    <button
      className={`tool-btn ${activeTool === tool ? "active" : ""}`}
      onClick={() => setActiveTool(tool)}
    >
      {icon}
      <span className="tooltip-text">{label}</span>
    </button>
  );

  return (
    <div className="toolbar toolbar-side">
      <ToolButton tool="rect" icon="▭" label="Rectangle" />
      <ToolButton tool="circle" icon="⚪" label="Circle" />
      <ToolButton tool="line" icon="➖" label="Line" />
      <ToolButton tool="text" icon="🔤" label="Text" />
    </div>
  );
}
