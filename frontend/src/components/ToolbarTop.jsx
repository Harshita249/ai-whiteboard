import React from "react";
import ColorPicker from "./ColorPicker";

export default function ToolbarTop({ doAction, activeTool, setActiveTool, color, setColor }) {
  const Btn = ({ title, onClick, children }) => (
    <button className="tool-btn top-btn" title={title} onClick={onClick}>
      {children}
      <span className="tooltip-text">{title}</span>
    </button>
  );

  return (
    <div className="toolbar-top">
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Btn title="Undo" onClick={() => doAction("undo")}>↶</Btn>
        <Btn title="Redo" onClick={() => doAction("redo")}>↷</Btn>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Btn title="Save to Gallery" onClick={() => doAction("save")}>💾</Btn>
        <Btn title="AI Clean" onClick={() => doAction("aiClean")}>🤖</Btn>
        <Btn title="Download" onClick={() => doAction("download")}>⬇️</Btn>
      </div>

      <div style={{ marginLeft: 12 }}>
        <ColorPicker value={color} onChange={(c) => setColor(c)} />
      </div>
    </div>
  );
}
