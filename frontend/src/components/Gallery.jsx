import React, { useEffect, useState } from "react";
import { listGallery, deleteGalleryItem } from "../api";

export default function Gallery() {
  const [items, setItems] = useState([]);

  async function load() {
    try {
      const token = localStorage.getItem("token");
      const res = await listGallery();
      setItems(res.data || []);
    } catch (e) {
      console.warn("gallery load failed", e);
      setItems([]);
    }
  }

  useEffect(() => {
    load();
    window.addEventListener("gallery-updated", load);
    return () => window.removeEventListener("gallery-updated", load);
  }, []);

  async function onDelete(it) {
    if (!confirm("Delete this item?")) return;
    try {
      const token = localStorage.getItem("token");
      await deleteGalleryItem(it.id, token);
      window.dispatchEvent(new CustomEvent("gallery-updated"));
    } catch (e) {
      alert("Delete failed");
      console.error(e);
    }
  }

  function onOpen(it) {
    try {
      const parsed = JSON.parse(it.data_json || "{}");
      if (parsed.png) window.dispatchEvent(new CustomEvent("load-diagram", { detail: { png: parsed.png } }));
      else alert("Item has no image");
    } catch (e) {
      alert("Cannot open item");
    }
  }

  return (
    <aside className="right-panel">
      <h4 style={{ color: "#6ee7b7" }}>Gallery</h4>
      {items.length === 0 && <div className="small">No items yet</div>}
      <div style={{ display: "grid", gap: 8 }}>
        {items.map(it => {
          const parsed = (() => { try { return JSON.parse(it.data_json) } catch { return {}; } })();
          return (
            <div key={it.id} className="gallery-item">
              <div className="small">{it.title || `Item ${it.id}`}</div>
              {parsed.png && <img src={parsed.png} style={{ width: "100%", borderRadius: 6, cursor: "pointer" }} onClick={() => onOpen(it)} alt="" />}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="tool-btn" onClick={() => onOpen(it)}>Open</button>
                <button className="tool-btn" onClick={() => onDelete(it)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
