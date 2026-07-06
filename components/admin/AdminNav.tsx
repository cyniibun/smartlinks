"use client";
import Link from "next/link";

export function AdminNav({ workspaceName, workspaceId }: { workspaceName?: string; workspaceId?: string }) {
  const logout = async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/login"; };
  const base = workspaceId ? `/dashboard/${workspaceId}` : "/dashboard";
  return <header className="admin-nav"><div className="admin-identity"><Link href={base} className="admin-brand">tone-link</Link>{workspaceName&&<span className="workspace-context">{workspaceName}</span>}</div><nav><Link href={base}>Overview</Link><Link href={`${base}/link-pages`}>Smart Links</Link><Link href={`${base}/create`}>Create / Search</Link><Link href={`${base}/artists`}>Artists</Link><Link href={`${base}/analytics`}>Analytics</Link><Link href={`${base}/settings`}>Settings</Link><button onClick={logout}>Sign out</button></nav></header>;
}
