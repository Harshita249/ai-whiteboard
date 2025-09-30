import React, { useEffect, useState } from "react";

function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/* Small color picker + active tool label */
export default function ToolbarTop() {
  const [color, setColor] = useState("#000000");
  const [active, setActive] = useState("pen");

  useEffect(() => {
    const onTool = (e) => setActive(e.detail.tool);
    const onColor = (e) => setColor(e.detail.color);
    window.addEventListener("tool-change", onTool);
    window.addEventListener("color-change", onColor);
    return () => {
      window.removeEventListener("tool-change", onTool);
      window.removeEventListener("color-change", onColor);
    };
  }, []);

  const onColorChange = (ev) => {
    const c = ev.target.value;
    setColor(c);
    emit("color-change", { color: c });
  };

  return (
    <div className="toolbar top">
      <div className="active-tool-label">Tool: <strong>{active}</strong></div>
      <div style={{ marginLeft: 12 }}>
        <input type="color" value={color} onChange={onColorChange} className="color-input" />
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button className="mini-btn" onClick={() => emit("action", { name: "aiClean" })}>🤖 AI</button>
      </div>
    </div>
  );
}
