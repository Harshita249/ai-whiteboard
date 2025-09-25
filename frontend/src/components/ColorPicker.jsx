import React from "react";

export default function ColorPicker({ onChange }) {
  const handle = (e) => onChange && onChange(e.target.value);
  return <input className="color-input" type="color" defaultValue="#000000" onChange={handle} aria-label="Color picker" />;
}
