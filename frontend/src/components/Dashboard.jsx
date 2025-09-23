// frontend/src/components/Dashboard.jsx
import React from "react";
import Toolbar from "./Toolbar";
import CanvasBoard from "./CanvasBoard";
import Gallery from "./Gallery";

export default function Dashboard({ token, username, onLogout }) {
  return (
    <div className="dashboard-root" style={{ display: "flex", gap: 12, height: "100vh", boxSizing: "border-box" }}>
      <Toolbar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 600, color: "#6ee7b7" }}>AI Whiteboard</div>
          <div>
            <span className="small">Signed in: {username}</span>
            <button className="btn" style={{ marginLeft: 12 }} onClick={onLogout}>Logout</button>
          </div>
        </div>

        <div style={{ flex: 1, position: "relative", minHeight: 400, borderRadius: 8, overflow: "hidden", background: "linear-gradient(#ffffff,#ffffff)" }}>
          <CanvasBoard token={token} username={username} />
        </div>

        <div style={{ marginTop: 12 }}>
          <Gallery token={token} />
        </div>
      </div>
    </div>
  );
}
