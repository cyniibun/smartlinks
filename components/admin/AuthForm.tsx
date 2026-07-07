"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"/></svg>;
}

export function AuthForm({ mode, error, message }: { mode: "login" | "signup"; error?: string; message?: string }) {
  const signup = mode === "signup";
  const [oauthLoading, setOauthLoading] = useState(false);
  const [clientError, setClientError] = useState("");
  const friendlyError = clientError || (error === "invalid-credentials" ? "Email or password is incorrect."
    : error === "not-configured" ? "Supabase Auth is not configured."
    : error === "passwords-do-not-match" ? "Passwords do not match."
    : error === "too-many-attempts" ? "Too many attempts. Try again shortly."
    : error === "workspace-bootstrap-failed" ? "Account was verified, but workspace setup failed. Try again or contact support."
    : error);
  const startGoogle = async () => {
    setOauthLoading(true);
    setClientError("");
    const supabase = createClient();
    if (!supabase) {
      setOauthLoading(false);
      setClientError("Supabase Auth is not configured.");
      return;
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (oauthError) {
      setOauthLoading(false);
      setClientError(oauthError.message);
    }
  };
  return <main className="admin-login"><div className="admin-login-card auth-card">
    <div className="auth-brand"><span>tone-link</span></div><h1>{signup ? "Create your account" : "Welcome back"}</h1>
    <p>{signup ? "Start building tracked smart links." : "Sign in to your workspace."}</p>
    <form action={signup ? "/api/auth/signup" : "/api/admin/login"} method="post" className="auth-stacked-form">
    {signup && <input name="company" tabIndex={-1} autoComplete="off" className="auth-honeypot" aria-hidden="true" />}
    <label>Email<input name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" minLength={8} autoComplete={signup ? "new-password" : "current-password"} required /></label>
    {signup && <label>Confirm password<input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></label>}
    {friendlyError && <p className="form-error">{friendlyError}</p>}
    {message === "check-email" && <div className="admin-alert">Check your email to confirm your account, then sign in.</div>}
    {message === "email-confirmed" && <div className="admin-alert">Email confirmed. Sign in to open your workspace.</div>}
    <button className="admin-primary">{signup ? "Create account" : "Sign in"}</button>
    </form>
    <div className="auth-divider"><span>or</span></div>
    <button type="button" className="admin-secondary auth-social-button" disabled={oauthLoading} onClick={() => void startGoogle()}><GoogleIcon />{oauthLoading ? "Opening Google…" : "Continue with Google"}</button>
    {!signup&&<p><Link href="/forgot-password">Forgot your password?</Link></p>}
    <p>{signup ? "Already have an account?" : "New to tone-link?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create one"}</Link></p>
    {signup&&<p><Link href="/">Back to home</Link></p>}
  </div></main>;
}
