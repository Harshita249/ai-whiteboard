// frontend/src/components/Toolbar.jsx
import React, { useState, useEffect } from "react";
import ToolButton from "./ToolButton";
import ColorPicker from "./ColorPicker";
import ShapesPanel from "./ShapesPanel";

/*
 Emits:
  - tool-change { tool }
  - color-change { color }
  - action { name }
*/

export default function Toolbar() {
  const [active, setActive] = useState("pen");

  useEffect(() => {
    // keep active state synced if other parts change it
    function onTool(e) { if (e.detail && e.detail.tool) setActive(e.detail.tool); }
    window.addEventListener("tool-change", onTool);
    return () => window.removeEventListener("tool-change", onTool);
  }, []);

  const emitAction = (name) => window.dispatchEvent(new CustomEvent("action", { detail: { name } }));

  return (
    <nav className="toolbar" role="toolbar" aria-label="Whiteboard tools">
      <div className="tool-group">
        <ToolButton title="Pen" tool="pen" active={active==="pen"}>✏️</ToolButton>
        <ToolButton title="Eraser" tool="eraser" active={active==="eraser"}>🧽</ToolButton>
        <ToolButton title="Select" tool="select" active={active==="select"}>🔲</ToolButton>
      </div>

      <div className="tool-group">
        <ShapesPanel />
      </div>

      <div className="tool-group">
        <ColorPicker onChange={(c)=>window.dispatchEvent(new CustomEvent("color-change",{detail:{color:c}}))}/>
      </div>

      <div className="tool-group">
        <ToolButton title="Undo" onClick={() => emitAction("undo")}>↶</ToolButton>
        <ToolButton title="Redo" onClick={() => emitAction("redo")}>↷</ToolButton>
        <ToolButton title="Save" onClick={() => emitAction("save")}>💾</ToolButton>
        <ToolButton title="AI Clean" onClick={() => emitAction("aiClean")}>🤖</ToolButton>
        <ToolButton title="Gallery" onClick={() => emitAction("gallery")}>🖼️</ToolButton>
      </div>
    </nav>
  );
}
