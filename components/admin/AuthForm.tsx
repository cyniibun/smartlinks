import Link from "next/link";

export function AuthForm({ mode, error, message }: { mode: "login" | "signup"; error?: string; message?: string }) {
  const signup = mode === "signup";
  return <main className="admin-login"><form action={signup ? "/api/auth/signup" : "/api/admin/login"} method="post" className="admin-login-card">
    <span className="admin-kicker">tone-link</span><h1>{signup ? "Create your workspace" : "Welcome back"}</h1>
    <p>{signup ? "Start managing artists, releases, campaigns, and analytics." : "Sign in to your workspace."}</p>
    {signup && <><label>Full name<input name="fullName" autoComplete="name" required /></label><label>Workspace name (optional)<input name="workspaceName" placeholder="Defaults to your email name" /></label></>}
    <label>Email<input name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" minLength={8} autoComplete={signup ? "new-password" : "current-password"} required /></label>
    {error && <p className="form-error">{error === "invalid-credentials" ? "Email or password is incorrect." : error === "not-configured" ? "Supabase Auth is not configured." : error}</p>}
    {message === "check-email" && <div className="admin-alert">Check your email to confirm your account, then sign in.</div>}
    {message === "email-confirmed" && <div className="admin-alert">Email confirmed. Sign in to open your workspace.</div>}
    <button className="admin-primary">{signup ? "Create account" : "Sign in"}</button>
    {!signup&&<p><Link href="/forgot-password">Forgot your password?</Link></p>}
    <p>{signup ? "Already have an account?" : "New to tone-link?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create one"}</Link></p>
  </form></main>;
}
