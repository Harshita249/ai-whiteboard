import React from "react";

/*
  ToolbarSide dispatches:
   - "tool-change" { tool: 'pen'|'eraser'|'rect'|'ellipse'|'line'|'arrow'|'text'|'select' }
   - "action" { name: 'undo'|'redo'|'save'|'download'|'aiClean' }
   - "tooltip-show" { text, x, y } and "tooltip-hide"
*/

function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function Tool({ tool, emoji, title }) {
  const onClick = () => emit("tool-change", { tool });
  const onEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    emit("tooltip-show", { text: title, x: r.left + r.width / 2, y: r.top });
  };
  const onLeave = () => emit("tooltip-hide");
  return (
    <button
      className="tool-btn"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onTouchStart={() => emit("tooltip-show", { text: title })}
      onTouchEnd={() => emit("tooltip-hide")}
      aria-label={title}
    >
      <div style={{ fontSize: 18 }}>{emoji}</div>
    </button>
  );
}

export default function ToolbarSide() {
  return (
    <div className="toolbar side">
      <Tool tool="pen" emoji="✏️" title="Pen" />
      <Tool tool="eraser" emoji="🧽" title="Eraser" />
      <div className="separator" />
      <Tool tool="rect" emoji="▭" title="Rectangle" />
      <Tool tool="ellipse" emoji="◯" title="Ellipse" />
      <Tool tool="line" emoji="—" title="Line" />
      <Tool tool="arrow" emoji="➤" title="Arrow" />
      <div className="separator" />
      <Tool tool="text" emoji="A" title="Text" />
      <div style={{ height: 8 }} />
      <button
        className="tool-btn"
        onClick={() => emit("action", { name: "undo" })}
        onMouseEnter={(e) => emit("tooltip-show", { text: "Undo", x: e.currentTarget.getBoundingClientRect().left })}
        onMouseLeave={() => emit("tooltip-hide")}
      >
        ↶
      </button>
      <button
        className="tool-btn"
        onClick={() => emit("action", { name: "redo" })}
        onMouseEnter={(e) => emit("tooltip-show", { text: "Redo", x: e.currentTarget.getBoundingClientRect().left })}
        onMouseLeave={() => emit("tooltip-hide")}
      >
        ↷
      </button>
      <div style={{ flex: 1 }} />
      <button
        className="tool-btn"
        onClick={() => emit("action", { name: "save" })}
        onMouseEnter={(e) => emit("tooltip-show", { text: "Save to gallery", x: e.currentTarget.getBoundingClientRect().left })}
        onMouseLeave={() => emit("tooltip-hide")}
      >
        💾
      </button>
      <button
        className="tool-btn"
        onClick={() => emit("action", { name: "download" })}
        onMouseEnter={(e) => emit("tooltip-show", { text: "Download PNG", x: e.currentTarget.getBoundingClientRect().left })}
        onMouseLeave={() => emit("tooltip-hide")}
      >
        ⤓
      </button>
    </div>
  );
}
