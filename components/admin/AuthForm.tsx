import Link from "next/link";

export function AuthForm({ mode, error, message }: { mode: "login" | "signup"; error?: string; message?: string }) {
  const signup = mode === "signup";
  const friendlyError = error === "invalid-credentials" ? "Email or password is incorrect."
    : error === "not-configured" ? "Supabase Auth is not configured."
    : error === "passwords-do-not-match" ? "Passwords do not match."
    : error === "too-many-attempts" ? "Too many attempts. Try again shortly."
    : error === "workspace-bootstrap-failed" ? "Account was verified, but workspace setup failed. Try again or contact support."
    : error;
  return <main className="admin-login"><div className="admin-login-card">
    <span className="admin-kicker">tone-link</span><h1>{signup ? "Create your workspace" : "Welcome back"}</h1>
    <p>{signup ? "Start managing artists, releases, campaigns, and analytics." : "Sign in to your workspace."}</p>
    <form action={signup ? "/api/auth/signup" : "/api/admin/login"} method="post" className="auth-stacked-form">
    {signup && <><input name="company" tabIndex={-1} autoComplete="off" className="auth-honeypot" aria-hidden="true" /><label>Full name<input name="fullName" autoComplete="name" required /></label></>}
    <label>Email<input name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" minLength={8} autoComplete={signup ? "new-password" : "current-password"} required /></label>
    {signup && <label>Confirm password<input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></label>}
    {friendlyError && <p className="form-error">{friendlyError}</p>}
    {message === "check-email" && <div className="admin-alert">Check your email to confirm your account, then sign in.</div>}
    {message === "email-confirmed" && <div className="admin-alert">Email confirmed. Sign in to open your workspace.</div>}
    <button className="admin-primary">{signup ? "Create account" : "Sign in"}</button>
    </form>
    <form action="/api/auth/google" method="post" className="auth-stacked-form">
      <button type="submit" className="admin-secondary">Continue with Google</button>
    </form>
    {!signup&&<p><Link href="/forgot-password">Forgot your password?</Link></p>}
    <p>{signup ? "Already have an account?" : "New to tone-link?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "Sign in" : "Create one"}</Link></p>
  </div></main>;
}
