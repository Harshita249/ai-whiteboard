import React, {useEffect, useState} from "react";

export default function Gallery(){
  const [items,setItems] = useState([]);
  useEffect(()=>{
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/diagrams`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r=>r.json()).then(setItems).catch(()=>setItems([]));
  },[]);
  return (
    <aside className="gallery">
      <h3>Gallery</h3>
      {items.length===0 && <div className="empty">No saved diagrams yet.</div>}
      {items.map(it=>(
        <div key={it.id} className="thumb">
          {it.thumbnail ? <img src={it.thumbnail} alt={it.title} /> :
            <div className="placeholder">{it.title}</div>}
          <div className="meta">{it.title}</div>
        </div>
      ))}
    </aside>
  );
}
