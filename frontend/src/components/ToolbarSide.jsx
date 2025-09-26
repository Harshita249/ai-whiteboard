import React from "react";

export default function ToolbarSide({ currentTool, setTool, setColor }) {
  const Button = ({ tool, icon, title }) => (
    <button
      className={`tool-btn side-btn ${currentTool === tool ? "active" : ""}`}
      onClick={() => setTool(tool)}
      title={title || tool}
    >
      {icon}
    </button>
  );

  return (
    <div className="toolbar-side" role="navigation" aria-label="Left tools">
      <Button tool="pen" icon="✏️" title="Pen"/>
      <Button tool="eraser" icon="🧽" title="Eraser"/>
      <Button tool="select" icon="🔲" title="Select"/>
      <hr style={{ width: "60%", opacity: 0.1 }} />
      <Button tool="rect" icon="▭" title="Rectangle"/>
      <Button tool="ellipse" icon="◯" title="Ellipse"/>
      <Button tool="line" icon="—" title="Line"/>
      <Button tool="arrow" icon="➤" title="Arrow"/>
      <Button tool="text" icon="T" title="Text"/>
      <hr style={{ width: "60%", opacity: 0.1 }} />
      <input
        type="color"
        className="color-input"
        onChange={(e) => setColor(e.target.value)}
        aria-label="Color picker"
        title="Color"
        defaultValue="#000000"
      />
    </div>
  );
}
