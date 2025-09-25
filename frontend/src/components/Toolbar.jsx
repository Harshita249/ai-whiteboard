import React from "react";
import ColorPicker from "./ColorPicker";
import ShapesPanel from "./ShapesPanel";

function ToolButton({ title, tool, onClick, active, children }) {
  return (
    <button
      className={`tool-btn ${active ? "active" : ""}`}
      onClick={() => (tool ? onClick(tool) : onClick())}
      title={title}
      aria-label={title}
    >
      <div className="icon">{children}</div>
      <span className="tooltip-text">{title}</span>
    </button>
  );
}

export default function Toolbar({ currentTool, setTool, setColor, doAction }) {
  return (
    <nav className="toolbar" role="toolbar" aria-label="Tools">
      <div className="tool-block">
        <ToolButton title="Pen" tool="pen" onClick={setTool} active={currentTool === "pen"}>
          ✏️
        </ToolButton>

        <ToolButton title="Eraser" tool="eraser" onClick={setTool} active={currentTool === "eraser"}>
          🧽
        </ToolButton>

        <ToolButton title="Select" tool="select" onClick={setTool} active={currentTool === "select"}>
          🔲
        </ToolButton>
      </div>

      <div className="tool-block">
        <ShapesPanel setTool={setTool} currentTool={currentTool} />
      </div>

      <div className="tool-block">
        <ColorPicker onChange={setColor} />
      </div>

      <div className="tool-block">
        <ToolButton title="Undo" onClick={() => doAction("undo")}>
          ↶
        </ToolButton>
        <ToolButton title="Redo" onClick={() => doAction("redo")}>
          ↷
        </ToolButton>
        <ToolButton title="Save" onClick={() => doAction("save")}>
          💾
        </ToolButton>
        <ToolButton title="AI Clean" onClick={() => doAction("aiClean")}>
          🤖
        </ToolButton>
        <ToolButton title="Download" onClick={() => doAction("download")}>
          ⬇️
        </ToolButton>
      </div>
    </nav>
  );
}
