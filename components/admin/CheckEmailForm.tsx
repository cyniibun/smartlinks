"use client";

import Link from "next/link";
import { useState } from "react";

export function CheckEmailForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const resend = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || `Request failed (${response.status})`);
      setNotice("If this email has a pending account, a new confirmation link has been sent.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to resend confirmation.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="admin-login">
    <form onSubmit={event => void resend(event)} className="admin-login-card auth-card">
      <div className="auth-brand"><span>tone-link</span></div>
      <h1>Check your email</h1>
      <p>Confirm your email address before opening your dashboard.</p>
      {notice && <div className="admin-alert">{notice}</div>}
      {error && <p className="form-error">{error}</p>}
      <label>Email<input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" required /></label>
      <button className="admin-primary" disabled={busy || !email}>{busy ? "Sending…" : "Resend confirmation email"}</button>
      <p><Link href="/login">Back to sign in</Link></p>
    </form>
  </main>;
}
