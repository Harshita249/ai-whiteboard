import React, { useState } from "react";

export default function Register(){
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function doRegister(e){
    e.preventDefault();
    const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/auth/register`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({username, password})
    });
    if (resp.ok) {
      alert("Registered. Please login.");
      window.location.href = "/login";
    } else {
      const body = await resp.json();
      alert("Registration failed: " + (body.detail || JSON.stringify(body)));
    }
  }

  return (
    <div className="centered-page">
      <div className="card">
        <h2>Create account</h2>
        <form onSubmit={doRegister}>
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" required />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required />
          <button type="submit">Register</button>
        </form>
        <p>Already a user? <a href="/login">Login</a></p>
      </div>
    </div>
  );
}
