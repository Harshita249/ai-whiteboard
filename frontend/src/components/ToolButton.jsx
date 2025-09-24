// frontend/src/components/ToolButton.jsx
import React from "react";

/*
ToolButton:
- shows a small tooltip (via Tooltip component using events)
- supports active highlighting
- emits tool-change or custom onClick
*/

export default function ToolButton({ title, tool, onClick, children, active }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) return onClick(e);
    if (tool) window.dispatchEvent(new CustomEvent("tool-change", { detail: { tool } }));
  };

  const showTip = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent("tooltip-show", {
      detail: { text: title, x: rect.left + rect.width / 2, y: rect.top }
    }));
  };
  const hideTip = () => window.dispatchEvent(new CustomEvent("tooltip-hide"));

  return (
    <button
      className={`tool-btn ${active ? "active" : ""}`}
      onClick={handleClick}
      onMouseEnter={showTip}
      onMouseLeave={hideTip}
      onTouchStart={showTip}
      onTouchEnd={hideTip}
      title={title}
      aria-label={title}
    >
      {children}
      <span className="tooltip-text" aria-hidden>{title}</span>
    </button>
  );
}
