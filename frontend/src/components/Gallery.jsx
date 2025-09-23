// frontend/src/components/Gallery.jsx
import React, { useEffect, useState } from "react";

export default function Gallery({ token }) {
  const [items, setItems] = useState([]);
  async function load() {
    try {
      const res = await fetch((import.meta.env.VITE_BACKEND_URL || "/api") + "/gallery/");
      if (!res.ok) throw new Error("load failed");
      const j = await res.json();
      setItems(j);
    } catch (e) {
      console.error(e);
      setItems([]);
    }
  }

  useEffect(() => {
    load();
    function onUpdate() { load(); }
    window.addEventListener("gallery-updated", onUpdate);
    return () => window.removeEventListener("gallery-updated", onUpdate);
  }, []);

  function onOpen(item) {
    try {
      const parsed = JSON.parse(item.data_json || "{}");
      if (parsed.png) {
        window.dispatchEvent(new CustomEvent("load-diagram", { detail: parsed }));
      } else {
        alert("No image data found");
      }
    } catch (e) {
      console.error(e);
      alert("Invalid gallery item");
    }
  }

  if (!items || items.length === 0) return <div className="gallery-list"><div className="small">No items</div></div>;

  return (
    <div className="gallery-list">
      {items.map(it => (
        <div key={it.id} className="gallery-item" onClick={() => onOpen(it)}>
          <div className="small">{it.title}</div>
          {it.data_json && (() => {
            try {
              const p = JSON.parse(it.data_json);
              if (p.png) return <img src={p.png} alt={it.title} style={{ width: "100%", borderRadius: 6 }} />;
            } catch (e) {}
            return null;
          })()}
        </div>
      ))}
    </div>
  );
}
