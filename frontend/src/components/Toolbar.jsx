import React from "react";
import ColorPicker from "./ColorPicker";
import ShapesPanel from "./ShapesPanel";

function ToolButton({ title, tool, active, onClick, children }) {
  return (
    <button
      className={`tool-btn ${active ? "active" : ""}`}
      onClick={() => onClick(tool)}
    >
      {children}
      <span className="tooltip-text">{title}</span>
    </button>
  );
}

export default function Toolbar({ currentTool, setTool, setColor, doAction }) {
  return (
    <div className="toolbar">
      <ToolButton title="Pen" tool="pen" active={currentTool==="pen"} onClick={setTool}>✏️</ToolButton>
      <ToolButton title="Eraser" tool="eraser" active={currentTool==="eraser"} onClick={setTool}>🧽</ToolButton>
      <ToolButton title="Select" tool="select" active={currentTool==="select"} onClick={setTool}>🔲</ToolButton>
      <ShapesPanel setTool={setTool} currentTool={currentTool}/>
      <ColorPicker onChange={setColor}/>
      <ToolButton title="Undo" onClick={()=>doAction("undo")}>↶</ToolButton>
      <ToolButton title="Redo" onClick={()=>doAction("redo")}>↷</ToolButton>
      <ToolButton title="Save" onClick={()=>doAction("save")}>💾</ToolButton>
      <ToolButton title="AI Clean" onClick={()=>doAction("aiClean")}>🤖</ToolButton>
      <ToolButton title="Download" onClick={()=>doAction("download")}>⬇️</ToolButton>
    </div>
  );
}
