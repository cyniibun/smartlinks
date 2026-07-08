"use client";

import Link from "next/link";

type Plan = "free" | "basic" | "pro" | "developer" | "enterprise" | "label" | string;

function normalizePlan(plan?: Plan) {
  const value = String(plan || "free").toLowerCase();
  if (value === "developer") return { key: "developer", name: "Developer", status: "Internal Workspace", cta: "Experimental features", icon: "0101" };
  if (value === "pro") return { key: "pro", name: "Pro", status: "Professional Workspace", cta: "Manage plan →", icon: "♕" };
  if (value === "basic") return { key: "basic", name: "Basic", status: "Growing Workspace", cta: "Manage plan →", icon: "◇" };
  if (value === "enterprise" || value === "label") return { key: "enterprise", name: "Enterprise", status: "Label Workspace", cta: "Manage plan →", icon: "✦" };
  return { key: "free", name: "Free", status: "Starter Workspace", cta: "Upgrade now →", icon: "○" };
}

export function WorkspacePlanCard({ workspaceId, plan }: { workspaceId?: string; plan?: Plan }) {
  const resolved = normalizePlan(plan);
  const href = workspaceId ? `/dashboard/${workspaceId}/settings/billing` : "/dashboard";
  return <Link href={href} className={`workspace-plan-card plan-${resolved.key}`} aria-label={`${resolved.name} plan. Open billing settings.`}>
    <span className="workspace-plan-icon">{resolved.icon}</span>
    <strong>{resolved.name}</strong>
    <small>{resolved.status}</small>
    <em>{resolved.cta}</em>
  </Link>;
}
