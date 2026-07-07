"use client";

import Link from "next/link";
import { useState } from "react";
import { AsyncError } from "@/components/admin/AsyncError";

export function ForgotPasswordForm({ initialError = "", sent = false }: { initialError?: string; sent?: boolean }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(sent);
  const [error, setError] = useState(initialError);
  const [detail, setDetail] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setDetail("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || `Reset request failed (${response.status})`);
      setDone(true);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to send reset link.";
      setError("Unable to send reset link.");
      setDetail(message);
    } finally {
      setBusy(false);
    }
  };

  return <main className="admin-login"><form onSubmit={event => void submit(event)} className="admin-login-card">
    <span className="admin-kicker">tone-link</span><h1>Reset your password</h1><p>Enter your account email and we’ll send a secure recovery link.</p>
    {done && <div className="admin-alert">If an account exists for that email, a password-reset link has been sent.</div>}
    {error && <AsyncError message={error} detail={detail} onRetry={email ? () => void submit({ preventDefault() {} } as React.FormEvent) : undefined} />}
    <label>Email<input value={email} onChange={event => setEmail(event.target.value)} name="email" type="email" autoComplete="email" required /></label>
    <button className="admin-primary" disabled={busy || !email}>{busy ? "Sending…" : "Send reset link"}</button>
    <p><Link href="/login">← Back to sign in</Link></p>
  </form></main>;
}
