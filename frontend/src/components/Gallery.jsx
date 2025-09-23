import React, { useEffect, useState } from "react";

export default function Gallery() {
  const [items, setItems] = useState([]);

  async function fetchGallery() {
    try {
      const res = await fetch((import.meta.env.VITE_BACKEND_URL || "/api") + "/gallery/");
      const data = await res.json();
      setItems(data);
    } catch (e) {
      console.error("gallery load failed", e);
    }
  }

  useEffect(() => {
    fetchGallery();
    // listen for event when new item is saved
    function onUpdate() { fetchGallery(); }
    window.addEventListener("gallery-updated", onUpdate);
    return () => window.removeEventListener("gallery-updated", onUpdate);
  }, []);

  function onLoad(item) {
    try {
      const parsed = JSON.parse(item.data_json || "{}");
      window.dispatchEvent(new CustomEvent("load-diagram", { detail: parsed }));
    } catch (e) {
      console.error("invalid diagram", e);
      alert("Cannot load this diagram");
    }
  }

  return (
    <div>
      <h4 style={{ color: "#6ee7b7" }}>Gallery</h4>
      {items.length === 0 && <div className="small">No items</div>}
      {items.map((it) => (
        <div key={it.id} style={{ background: "rgba(255,255,255,0.01)", borderRadius: 8, padding: 8, marginTop: 8 }}>
          <div className="small">{it.title}</div>
          {it.data_json && (() => {
            try {
              const parsed = JSON.parse(it.data_json);
              if (parsed.png) {
                return <img src={parsed.png} style={{ width: "100%", borderRadius: 6, marginTop: 6, cursor: "pointer" }} onClick={() => onLoad(it)} />;
              }
            } catch (e) {}
            return null;
          })()}
        </div>
      ))}
    </div>
  );
}
