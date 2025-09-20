import React from "react";
import Whiteboard from "../components/Whiteboard";
import Gallery from "../components/Gallery";

export default function Dashboard(){
  return (
    <div className="dashboard-root">
      <header className="topbar">
        <div className="brand">AI Whiteboard</div>
        <div className="user-actions">
          <button onClick={() => {localStorage.removeItem('token'); window.location.href='/login'}}>Logout</button>
        </div>
      </header>

      <main className="center-layout">
        <Whiteboard />
        <Gallery />
      </main>
    </div>
  );
}
