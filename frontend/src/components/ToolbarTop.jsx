import React, { useState, useEffect } from "react";

/*
 ToolbarTop.jsx
 - Displays active tool and color picker.
 - Emits "color-change" when user picks a color.
 - Shows an AI button that triggers "action" event.
*/

function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export default function ToolbarTop() {
  const [active, setActive] = useState("pen");
  const [color, setColor] = useState("#000000");

  useEffect(() => {
    const onTool = (e) => setActive(e.detail.tool);
    window.addEventListener("tool-change", onTool);
    return () => window.removeEventListener("tool-change", onTool);
  }, []);

  const onColor = (e) => {
    const c = e.target.value;
    setColor(c);
    emit("color-change", { color: c });
  };

  return (
    <div className="toolbar-top">
      <div className="active-tool-label">Tool: <strong>{active}</strong></div>
      <input type="color" className="color-input" value={color} onChange={onColor} />
      <div style={{ marginLeft: "auto" }}>
        <button className="mini-btn" onClick={() => emit("action", { name: "aiClean" })}>🤖 AI</button>
      </div>
    </div>
  );
}
