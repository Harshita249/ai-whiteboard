// frontend/src/components/Tooltip.jsx
import React, { useEffect, useState } from "react";

export default function Tooltip() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function onShow(e) {
      const d = e.detail || {};
      setText(d.text || "");
      setPos({ x: d.x || window.innerWidth / 2, y: (d.y || 0) - 8 });
      setVisible(true);
    }
    function onHide() { setVisible(false); }
    window.addEventListener("tooltip-show", onShow);
    window.addEventListener("tooltip-hide", onHide);
    return () => {
      window.removeEventListener("tooltip-show", onShow);
      window.removeEventListener("tooltip-hide", onHide);
    };
  }, []);

  if (!visible) return null;
  const style = {
    position: "fixed",
    left: pos.x,
    top: pos.y,
    transform: "translate(-50%, -100%)",
    pointerEvents: "none",
    background: "rgba(0,0,0,0.85)",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: 6,
    zIndex: 99999,
    fontSize: 12,
    whiteSpace: "nowrap",
  };
  return <div style={style}>{text}</div>;
}
