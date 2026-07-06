import Link from "next/link";

export default async function ForgotPasswordPage({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}) {
  const params=await searchParams;
  return <main className="admin-login"><form action="/api/auth/forgot-password" method="post" className="admin-login-card"><span className="admin-kicker">tone-link</span><h1>Reset your password</h1><p>Enter your account email and we’ll send a secure recovery link.</p>{params.error&&<p className="form-error">{params.error}</p>}{params.message==="sent"&&<div className="admin-alert">If an account exists for that email, a password-reset link has been sent.</div>}<label>Email<input name="email" type="email" autoComplete="email" required/></label><button className="admin-primary">Send reset link</button><p><Link href="/login">← Back to sign in</Link></p></form></main>;
}
