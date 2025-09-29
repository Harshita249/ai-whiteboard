import React from "react";

function ToolBtn({ active, title, onClick, children }) {
  return (
    <button className={`tool-btn side-btn ${active ? "active" : ""}`} title={title} onClick={onClick}>
      {children}
      <span className="tooltip-text">{title}</span>
    </button>
  );
}

export default function ToolbarSide({ activeTool, setActiveTool, setColor }) {
  return (
    <div className="toolbar-side">
      <ToolBtn active={activeTool === "pen"} title="Pen" onClick={() => setActiveTool("pen")}>✏️</ToolBtn>
      <ToolBtn active={activeTool === "eraser"} title="Eraser" onClick={() => setActiveTool("eraser")}>🧽</ToolBtn>
      <ToolBtn active={activeTool === "select"} title="Select" onClick={() => setActiveTool("select")}>🔲</ToolBtn>

      <hr style={{ width: "70%", opacity: 0.12 }} />

      <ToolBtn active={activeTool === "rect"} title="Rectangle" onClick={() => setActiveTool("rect")}>▭</ToolBtn>
      <ToolBtn active={activeTool === "ellipse"} title="Ellipse" onClick={() => setActiveTool("ellipse")}>◯</ToolBtn>
      <ToolBtn active={activeTool === "line"} title="Line" onClick={() => setActiveTool("line")}>—</ToolBtn>
      <ToolBtn active={activeTool === "arrow"} title="Arrow" onClick={() => setActiveTool("arrow")}>➤</ToolBtn>
      <ToolBtn active={activeTool === "text"} title="Text" onClick={() => setActiveTool("text")}>🔤</ToolBtn>
    </div>
  );
}
