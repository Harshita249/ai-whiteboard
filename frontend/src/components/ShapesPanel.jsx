import React from "react";

export default function ShapesPanel({ setTool, currentTool }) {
  const S = ({ title, t, children }) => (
    <button className={`tool-btn ${currentTool === t ? "active" : ""}`} onClick={() => setTool(t)}>
      {children}
      <span className="tooltip-text">{title}</span>
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <S title="Rectangle" t="rect">▭</S>
      <S title="Ellipse" t="ellipse">◯</S>
      <S title="Line" t="line">—</S>
      <S title="Arrow" t="arrow">➤</S>
      <S title="Triangle" t="triangle">🔺</S>
      <S title="Polygon" t="polygon">🔷</S>
      <div style={{ height: 6 }} />
      <div style={{ fontSize: 11, color: "#9aa" }}>Graphs</div>
      <S title="Bar Chart" t="graph-bar">📊</S>
      <S title="Line Chart" t="graph-line">📈</S>
      <S title="Pie Chart" t="graph-pie">🥧</S>
      <S title="Text" t="text">T</S>
    </div>
  );
}
