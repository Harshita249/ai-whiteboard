import React, { useEffect, useState } from "react";

export default function Tooltip() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function show(e) {
      const d = e.detail || {};
      setText(d.text || "");
      setPos({ x: d.x || window.innerWidth / 2, y: d.y || 40 });
      setVisible(true);
    }
    function hide() { setVisible(false); }
    window.addEventListener("tooltip-show", show);
    window.addEventListener("tooltip-hide", hide);
    return () => {
      window.removeEventListener("tooltip-show", show);
      window.removeEventListener("tooltip-hide", hide);
    };
  }, []);

  if (!visible) return null;
  return (
    <div style={{
      position: "fixed",
      left: pos.x,
      top: pos.y,
      transform: "translate(-50%, -120%)",
      background: "rgba(0,0,0,0.85)",
      color: "#fff",
      padding: "6px 10px",
      borderRadius: 6,
      zIndex: 99999,
      pointerEvents: "none",
      fontSize: 12
    }}>{text}</div>
  );
}
