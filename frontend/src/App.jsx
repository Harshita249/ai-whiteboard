// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Tooltip from "./components/Tooltip";

export default function App() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState("Guest");

  // on mount read values from localStorage (ensures token available after page refresh)
  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("username");
    if (t) setToken(t);
    if (u) setUsername(u);
  }, []);

  const onLogin = (newToken, user) => {
    setToken(newToken);
    setUsername(user || "Guest");
    if (newToken) localStorage.setItem("token", newToken);
    if (user) localStorage.setItem("username", user);
  };

  const onLogout = () => {
    setToken(null);
    setUsername("Guest");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  };

  return (
    <div className="app-root">
      <Tooltip />
      {!token ? (
        <Login onLogin={onLogin} />
      ) : (
        <Dashboard token={token} username={username} onLogout={onLogout} />
      )}
    </div>
  );
}
