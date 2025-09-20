import React, { useState } from "react";

export default function Login(){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function doLogin(e){
    e.preventDefault();
    const BACK = import.meta.env.VITE_BACKEND_URL || "";
    const res = await fetch(`${BACK}/api/auth/login`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({username, password})
    });
    if (res.ok) {
      const body = await res.json();
      localStorage.setItem("token", body.access_token);
      window.location.href = "/dashboard";
    } else {
      alert("Login failed");
    }
  }

  return (
    <div className="centered-page">
      <div className="card">
        <h2>Sign in</h2>
        <form onSubmit={doLogin}>
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" required />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required />
          <button type="submit">Sign in</button>
        </form>
        <p>Don't have an account? <a href="/register">Register</a></p>
      </div>
    </div>
  );
}
