"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "../../lib/api";
import { useAuth } from "../../lib/useAuth";


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("hr@example.com");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { role, logout } = useAuth();


  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const result = await api.login(email, password);
      setToken(result.access_token, result.role);
      router.push("/directory");
    } catch (e) {
      setError("Login failed -- check credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 32, maxWidth: 360 }}>
      <h1>Login</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        Demo users: hr@example.com / manager@example.com / it@example.com / security@example.com, password: demo123
      </p>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" style={{ display: "block", marginBottom: 8, width: "100%" }} />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="password"
             onKeyDown={(e) => e.key === "Enter" && handleLogin()}
             style={{ display: "block", marginBottom: 8, width: "100%" }} />
      <button onClick={handleLogin} disabled={loading}>{loading ? "Logging in..." : "Log in"}</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}