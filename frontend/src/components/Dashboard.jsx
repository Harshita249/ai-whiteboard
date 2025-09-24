// frontend/src/components/Dashboard.jsx
import React from "react";
import Toolbar from "./Toolbar";
import CanvasBoard from "./CanvasBoard";
import Gallery from "./Gallery";

export default function Dashboard({ token, username, onLogout }) {
  return (
    <div className="workspace" style={{ width: "100%", height: "100vh" }}>
      <Toolbar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: 8 }}>
          <div className="brand">AI Whiteboard</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="small">Signed in: <strong>{username}</strong></div>
            <button className="tool-btn" onClick={onLogout}>Logout</button>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", gap: 12, padding: 12 }}>
          <div style={{ flex: 1, minHeight: 420, borderRadius: 8, overflow: "hidden", background: "#fff" }}>
            <CanvasBoard token={token} username={username} />
          </div>

          <Gallery token={token} />
        </div>
      </div>
    </div>
  );
}
