"use client";
import { useState } from "react";

export function AdminLogin({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const json = await response.json();
    if (!response.ok) { setError(json.error || "Unable to sign in"); setLoading(false); return; }
    window.location.reload();
  };
  return <main className="admin-login"><form onSubmit={submit} className="admin-login-card"><span className="admin-kicker">CYNiiCAL PRODUCTIONS</span><h1>Admin studio</h1><p>Manage releases, links, imports, and performance.</p>{!configured && <div className="admin-alert">Set <code>ADMIN_PASSWORD</code> in your environment before signing in.</div>}<label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>{error && <p className="form-error">{error}</p>}<button className="admin-primary" disabled={loading || !configured}>{loading ? "Signing in…" : "Enter studio"}</button></form></main>;
}
