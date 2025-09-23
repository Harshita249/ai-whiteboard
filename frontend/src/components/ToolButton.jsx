import React from "react";

export default function ToolButton({ title, tool, onClick, children }) {
  function handleClick() {
    if (onClick) {
      onClick();
    } else if (tool) {
      window.dispatchEvent(new CustomEvent("tool-change", { detail: { tool } }));
    }
  }

  return (
    <button
      onClick={handleClick}
      className="tool-btn"
      title={title}   // ✅ native tooltip (desktop)
      data-tooltip={title} // ✅ for custom CSS mobile tooltip
    >
      {children}
      <span className="tooltip-text">{title}</span>
    </button>
  );
}
