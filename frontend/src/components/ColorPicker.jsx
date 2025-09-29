import React from "react";

export default function ColorPicker({ value = "#000000", onChange }) {
  return (
    <input
      aria-label="Choose color"
      className="color-input"
      type="color"
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      title="Choose color"
    />
  );
}
