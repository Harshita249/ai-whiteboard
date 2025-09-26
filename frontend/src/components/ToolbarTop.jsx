import React from "react";

export default function ToolbarTop({ doAction }) {
  const Button = ({ title, action, icon }) => (
    <button className="tool-btn top-btn" onClick={action} title={title}>
      {icon}
    </button>
  );

  return (
    <div className="toolbar-top">
      <Button title="Undo" action={() => doAction("undo")} icon="↶" />
      <Button title="Redo" action={() => doAction("redo")} icon="↷" />
      <div style={{ width: 8 }} />
      <Button title="Save" action={() => doAction("save")} icon="💾" />
      <Button title="AI Clean" action={() => doAction("aiClean")} icon="🤖" />
      <Button title="Download" action={() => doAction("download")} icon="⬇️" />
    </div>
  );
}
