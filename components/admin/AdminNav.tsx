"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FiActivity, FiBarChart2, FiDisc, FiRadio, FiSettings, FiSliders, FiUser, FiUsers } from "react-icons/fi";

export function AdminNav({ workspaceName, workspaceId }: { workspaceName?: string; workspaceId?: string }) {
  const pathname=usePathname();const[pendingHref,setPendingHref]=useState("");
  const logout = async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/login"; };
  const base = workspaceId ? `/dashboard/${workspaceId}` : "/dashboard";
  const items=[
    {label:"Overview",href:`${base}/overview`,icon:<FiActivity/>},
    {label:"Releases",href:`${base}/link-pages`,icon:<FiDisc/>},
    {label:"Analytics",href:`${base}/analytics`,icon:<FiBarChart2/>},
    {label:"Artists",href:`${base}/artists`,icon:<FiUsers/>},
    {label:"Pixels",href:`${base}/pixels`,icon:<FiRadio/>},
    {label:"Settings",href:`${base}/settings`,icon:<FiSettings/>},
  ];
  const isActive=(href:string)=>pathname===href||pathname.startsWith(`${href}/`)||(href.endsWith("/link-pages")&&pathname.includes("/link-pages"));
  return <aside className="admin-nav"><div className="admin-nav-top"><Link href={`${base}/overview`} className="admin-brand" prefetch><span className="brand-mark"><i/><i/><i/><i/></span><strong>tone-link</strong></Link><div className="workspace-card"><div className="workspace-avatar">{workspaceName?.slice(0,1)||"T"}</div><div><strong>{workspaceName||"Workspace"}</strong><span>Workspace</span></div><FiSliders/></div><nav>{items.map(item=><Link key={item.href} href={item.href} prefetch onClick={()=>setPendingHref(item.href)} className={`${isActive(item.href)?"active":""} ${pendingHref===item.href&&!isActive(item.href)?"pending":""}`}><span>{item.icon}</span>{pendingHref===item.href&&!isActive(item.href)?"Loading…":item.label}</Link>)}</nav></div><div className="admin-nav-bottom"><div className="plan-card"><strong>Pro Plan</strong><span>Marketing OS preview</span><i/></div><button className="user-card" onClick={logout}><span><FiUser/></span><strong>Sign out</strong><small>Account</small></button></div></aside>;
}
