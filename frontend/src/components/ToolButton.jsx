// frontend/src/components/ToolButton.jsx
import React from "react";

export default function ToolButton({ title, tool, onClick, children, active }) {
  // Dispatch the primary action when clicked/tapped
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) return onClick();
    if (tool) window.dispatchEvent(new CustomEvent("tool-change", { detail: { tool } }));
  };

  // Show tooltip events for global Tooltip component
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
      aria-label={title}
      title={title}
    >
      {children}
      <span className="tooltip-text" aria-hidden>{title}</span>
    </button>
  );
}
