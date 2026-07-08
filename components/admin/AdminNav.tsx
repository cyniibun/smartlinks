"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FiActivity, FiBarChart2, FiDisc, FiMenu, FiRadio, FiSettings, FiSliders, FiUser, FiUsers, FiX } from "react-icons/fi";

export function AdminNav({ workspaceName, workspaceId }: { workspaceName?: string; workspaceId?: string }) {
  const pathname=usePathname();const[pendingHref,setPendingHref]=useState("");const[drawerOpen,setDrawerOpen]=useState(false);
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
  useEffect(()=>{setDrawerOpen(false);setPendingHref("")},[pathname]);
  useEffect(()=>{if(!drawerOpen)return;const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setDrawerOpen(false)};const previous=document.body.style.overflow;document.body.style.overflow="hidden";window.addEventListener("keydown",onKey);return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",onKey)}},[drawerOpen]);
  const NavLinks=({mobile=false}:{mobile?:boolean})=><nav>{items.map(item=><Link key={item.href} href={item.href} prefetch onClick={()=>{setPendingHref(item.href);if(mobile)setDrawerOpen(false)}} className={`${isActive(item.href)?"active":""} ${pendingHref===item.href&&!isActive(item.href)?"pending":""}`}><span>{item.icon}</span>{item.label}</Link>)}</nav>;
  return <><header className="mobile-admin-bar"><Link href={`${base}/overview`} className="admin-brand" prefetch><span className="brand-mark"><i/><i/><i/><i/></span><strong>tone-link</strong></Link><div><span>{workspaceName||"Workspace"}</span><button type="button" aria-label="Open navigation" onClick={()=>setDrawerOpen(true)}><FiMenu/></button></div></header><aside className="admin-nav"><div className="admin-nav-top"><Link href={`${base}/overview`} className="admin-brand" prefetch><span className="brand-mark"><i/><i/><i/><i/></span><strong>tone-link</strong></Link><div className="workspace-card"><div className="workspace-avatar">{workspaceName?.slice(0,1)||"T"}</div><div><strong>{workspaceName||"Workspace"}</strong><span>Workspace</span></div><FiSliders/></div><NavLinks/></div><div className="admin-nav-bottom"><div className="plan-card"><strong>Pro Plan</strong><span>Marketing OS preview</span><i/></div><button className="user-card" onClick={logout}><span><FiUser/></span><strong>Sign out</strong><small>Account</small></button></div></aside>{drawerOpen&&<div className="mobile-drawer-layer" role="presentation" onMouseDown={()=>setDrawerOpen(false)}><aside className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Dashboard navigation" onMouseDown={event=>event.stopPropagation()}><div className="mobile-drawer-head"><Link href={`${base}/overview`} className="admin-brand" prefetch><span className="brand-mark"><i/><i/><i/><i/></span><strong>tone-link</strong></Link><button type="button" aria-label="Close navigation" onClick={()=>setDrawerOpen(false)}><FiX/></button></div><div className="workspace-card"><div className="workspace-avatar">{workspaceName?.slice(0,1)||"T"}</div><div><strong>{workspaceName||"Workspace"}</strong><span>Workspace</span></div><FiSliders/></div><NavLinks mobile/><div className="admin-nav-bottom"><div className="plan-card"><strong>Pro Plan</strong><span>Marketing OS preview</span><i/></div><button className="user-card" onClick={logout}><span><FiUser/></span><strong>Sign out</strong><small>Account</small></button></div></aside></div>}</>;
}
