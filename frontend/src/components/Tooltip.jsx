import React, { useEffect, useState } from "react";

export default function Tooltip() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function onShow(e) {
      const d = e.detail || {};
      setText(d.text || "");
      // if x,y provided, use them; otherwise put it center top
      setPos({ x: d.x || window.innerWidth / 2, y: (d.y || 0) - 28 });
      setVisible(true);
    }
    function onHide() {
      setVisible(false);
    }
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
    padding: "6px 10px",
    background: "rgba(0,0,0,0.8)",
    color: "#fff",
    borderRadius: 6,
    fontSize: 12,
    zIndex: 9999,
    pointerEvents: "none",
    whiteSpace: "nowrap",
  };
  return <div style={style}>{text}</div>;
}
