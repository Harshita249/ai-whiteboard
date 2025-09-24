// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Tooltip from "./components/Tooltip";

export default function App() {
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState("Guest");

  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("username");
    if (t) setToken(t);
    if (u) setUsername(u);
  }, []);

  const onLogin = (tok, user) => {
    setToken(tok);
    setUsername(user || "Guest");
    if (tok) localStorage.setItem("token", tok);
    if (user) localStorage.setItem("username", user);
  };

  const onLogout = () => {
    setToken(null);
    setUsername("Guest");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  };

  return (
    <div className="app">
      <Tooltip />
      {!token ? (
        <Login onLogin={onLogin} />
      ) : (
        <Dashboard token={token} username={username} onLogout={onLogout} />
      )}
    </div>
  );
}
