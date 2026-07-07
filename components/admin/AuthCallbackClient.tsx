"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export function AuthCallbackClient({ code, next, error }: { code: string; next: string; error: string }) {
  const [message, setMessage] = useState("Completing sign in…");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    let active = true;
    const finish = async () => {
      if (window.location.hash.includes("access_token")) {
        history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        if (!active) return;
        setMessage("OAuth flow mismatch.");
        setDetail("Supabase returned hash tokens instead of a PKCE auth code. Check the Supabase OAuth flow settings and try again.");
        return;
      }
      if (error) {
        setMessage("OAuth failed.");
        setDetail(error);
        return;
      }
      if (!code) {
        setMessage("Missing auth code.");
        setDetail("The OAuth callback did not include a PKCE code.");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setMessage("Supabase Auth is not configured.");
        return;
      }
      const exchanged = await supabase.auth.exchangeCodeForSession(code);
      if (exchanged.error || !exchanged.data.session) {
        if (!active) return;
        setMessage("Unable to complete sign in.");
        setDetail(exchanged.error?.message || "No Supabase session was returned.");
        return;
      }
      const response = await fetch("/api/auth/complete-oauth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accessToken: exchanged.data.session.access_token,
          refreshToken: exchanged.data.session.refresh_token,
          expiresIn: exchanged.data.session.expires_in,
          next,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (!active) return;
        setMessage("Workspace setup failed.");
        setDetail(json.error || `Request failed (${response.status})`);
        return;
      }
      window.location.assign(json.redirectTo || "/dashboard");
    };
    void finish();
    return () => { active = false; };
  }, [code, error, next]);

  return <main className="admin-login"><section className="admin-login-card auth-card"><div className="auth-brand"><span>tone-link</span></div><h1>{message}</h1>{detail && <p className="form-error">{detail}</p>}<p><Link href="/login">Back to login</Link></p></section></main>;
}
