import React, { useEffect, useState } from "react";
import { listGallery, deleteDiagram } from "../api";

export default function Gallery({ onLoad }) {
  const [items, setItems] = useState([]);

  const refresh = async () => {
    try {
      const res = await listGallery();
      // assume res.data is array of { id, title, data_json }
      setItems(res.data || []);
    } catch (err) {
      console.error("Failed to load gallery", err);
      setItems([]);
    }
  };

  useEffect(() => { refresh(); }, []);

  const remove = async (id) => {
    await deleteDiagram(id);
    refresh();
  };

  return (
    <div style={{ width: 280, padding: 8 }}>
      <h3 style={{ marginBottom: 8 }}>Gallery</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {items.length === 0 && <div className="small">No saved items</div>}
        {items.map((it) => (
          <div key={it.id} style={{ background: "#0b1220", padding: 6, borderRadius: 6 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <img src={typeof it.data_json === "string" ? (JSON.parse(it.data_json).png || it.data_json) : it.data_json} alt={it.title} style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{it.title}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button className="tool-btn" onClick={() => onLoad(typeof it.data_json === "string" ? (JSON.parse(it.data_json).png || it.data_json) : it.data_json)}>Open</button>
                  <button className="tool-btn" onClick={() => remove(it.id)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
