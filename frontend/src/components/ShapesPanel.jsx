// frontend/src/components/ShapesPanel.jsx
import React from "react";
import ToolButton from "./ToolButton";

/*
ShapesPanel: exposes shape tools and graphs
Graph tools will insert sample graphs (bar/line/pie) into the canvas
*/

function emit(tool) {
  window.dispatchEvent(new CustomEvent("tool-change", { detail: { tool } }));
}

export default function ShapesPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <ToolButton title="Rectangle" onClick={() => emit("rect")}>▭</ToolButton>
      <ToolButton title="Ellipse" onClick={() => emit("ellipse")}>◯</ToolButton>
      <ToolButton title="Line" onClick={() => emit("line")}>—</ToolButton>
      <ToolButton title="Arrow" onClick={() => emit("arrow")}>➤</ToolButton>
      <ToolButton title="Triangle" onClick={() => emit("triangle")}>🔺</ToolButton>
      <ToolButton title="Polygon" onClick={() => emit("polygon")}>🔷</ToolButton>
      <div style={{ height: 6 }} />
      <div style={{ fontSize: 11, color: "#9aa" }}>Graphs</div>
      <ToolButton title="Bar Chart" onClick={() => emit("graph-bar")}>📊</ToolButton>
      <ToolButton title="Line Chart" onClick={() => emit("graph-line")}>📈</ToolButton>
      <ToolButton title="Pie Chart" onClick={() => emit("graph-pie")}>🥧</ToolButton>
    </div>
  );
}
