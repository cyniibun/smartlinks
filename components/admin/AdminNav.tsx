"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function AdminNav({ workspaceName, workspaceId }: { workspaceName?: string; workspaceId?: string }) {
  const pathname=usePathname();const[pendingHref,setPendingHref]=useState("");
  const logout = async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/login"; };
  const base = workspaceId ? `/dashboard/${workspaceId}` : "/dashboard";
  const items=[["Overview",`${base}/overview`],["Smart Links",`${base}/link-pages`],["Create / Search",`${base}/create`],["Artists",`${base}/artists`],["Analytics",`${base}/analytics`],["Settings",`${base}/settings`]];
  return <header className="admin-nav"><div className="admin-identity"><Link href={`${base}/overview`} className="admin-brand" prefetch>tone-link</Link>{workspaceName&&<span className="workspace-context">{workspaceName}</span>}</div><nav>{items.map(([label,href])=><Link key={href} href={href} prefetch onClick={()=>setPendingHref(href)} className={`${pathname===href?"active":""} ${pendingHref===href&&pathname!==href?"pending":""}`}>{pendingHref===href&&pathname!==href?"Loading…":label}</Link>)}<button onClick={logout}>Sign out</button></nav></header>;
}
