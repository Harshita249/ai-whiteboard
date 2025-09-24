// frontend/src/components/Gallery.jsx
import React, { useEffect, useState } from "react";
import { listGallery, deleteGalleryItem } from "../api";

export default function Gallery({ token }) {
  const [items, setItems] = useState([]);

  async function load() {
    try {
      const resp = await listGallery();
      if (resp && resp.data) setItems(resp.data);
      else setItems([]);
    } catch (e) {
      console.error("gallery load failed", e);
      setItems([]);
    }
  }

  useEffect(() => {
    load();
    function onUpdate() { load(); }
    function onOpenGallery() { load(); /* open if you have a modal */ }
    window.addEventListener("gallery-updated", onUpdate);
    window.addEventListener("open-gallery", onOpenGallery);
    return () => {
      window.removeEventListener("gallery-updated", onUpdate);
      window.removeEventListener("open-gallery", onOpenGallery);
    };
  }, []);

  function onOpen(item) {
    try {
      const parsed = JSON.parse(item.data_json || "{}");
      if (parsed.png) {
        window.dispatchEvent(new CustomEvent("load-diagram", { detail: parsed }));
      } else {
        alert("Cannot open this item (no image).");
      }
    } catch (e) {
      console.error(e);
      alert("Invalid item");
    }
  }

  function onDelete(item) {
    if (!window.confirm("Delete this item?")) return;
    window.dispatchEvent(new CustomEvent("gallery-delete", { detail: { id: item.id } }));
  }

  return (
    <div className="right-panel">
      <h4 style={{ color: "#6ee7b7" }}>Gallery</h4>
      {items.length === 0 && <div className="small">No items</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
        {items.map(it => {
          let imgSrc = null;
          try { const parsed = JSON.parse(it.data_json || "{}"); imgSrc = parsed.png; } catch (e) {}
          return (
            <div key={it.id} style={{ background: "rgba(255,255,255,0.02)", padding: 8, borderRadius: 8 }}>
              <div className="small" style={{ marginBottom: 6 }}>{it.title}</div>
              {imgSrc && <img src={imgSrc} alt={it.title} style={{ width: "100%", borderRadius: 6, cursor: "pointer" }} onClick={() => onOpen(it)} />}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="tool-btn" onClick={() => onOpen(it)}>Open</button>
                <button className="tool-btn" onClick={() => onDelete(it)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
