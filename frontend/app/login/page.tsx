"use client";
import { useState } from "react";
import { api } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("hr@example.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");

  async function handleLogin() {
    try {
      const result = await api.login(email, password);
      localStorage.removeItem("noop"); // placeholder -- swap for real token storage strategy
      console.log("logged in as", result.role);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 360 }}>
      <h1>Login</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        Demo users: hr@example.com / manager@example.com / it@example.com / security@example.com, password: demo123
      </p>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" style={{ display: "block", marginBottom: 8, width: "100%" }} />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="password" style={{ display: "block", marginBottom: 8, width: "100%" }} />
      <button onClick={handleLogin}>Log in</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}
