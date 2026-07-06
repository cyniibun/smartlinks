export function AdminLogin({ configured, loginError = false }: { configured: boolean; loginError?: boolean }) {
  return <main className="admin-login">
    <form action="/api/admin/login" method="post" className="admin-login-card">
      <span className="admin-kicker">tone-link</span>
      <h1>Admin studio</h1>
      <p>Manage releases, links, imports, and performance.</p>
      {!configured && <div className="admin-alert">Set <code>ADMIN_PASSWORD</code> in your environment before signing in.</div>}
      <label>Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {loginError && <p className="form-error">Incorrect password. Check the exact <code>ADMIN_PASSWORD</code> value.</p>}
      <button className="admin-primary" disabled={!configured}>Enter studio</button>
    </form>
  </main>;
}
