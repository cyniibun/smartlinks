"use client";
import Link from "next/link";

export function AdminNav() {
  const logout = async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/admin"; };
  return <header className="admin-nav"><Link href="/admin" className="admin-brand">tone-link</Link><nav><Link href="/admin">Releases</Link><Link href="/admin/import">Import</Link><Link href="/admin/analytics">Analytics</Link><button onClick={logout}>Sign out</button></nav></header>;
}
