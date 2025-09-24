// frontend/src/components/ColorPicker.jsx
import React, { useState, useEffect } from "react";

export default function ColorPicker({ onChange }) {
  const [color, setColor] = useState("#000000");

  useEffect(() => {
    // emit initial
    window.dispatchEvent(new CustomEvent("color-change", { detail: { color } }));
  }, []);

  function handleChange(e) {
    setColor(e.target.value);
    window.dispatchEvent(new CustomEvent("color-change", { detail: { color: e.target.value } }));
    if (onChange) onChange(e.target.value);
  }

  return (
    <input
      className="color-input"
      type="color"
      value={color}
      onChange={handleChange}
      aria-label="Pick color"
    />
  );
}
