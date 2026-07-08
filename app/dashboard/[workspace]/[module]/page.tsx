import { notFound, redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/adminAuth";
const modules: Record<string, { title: string; description: string }> = {
  "link-pages": { title: "Releases", description: "Published releases, drafts, presaves, podcasts, events, and short links." },
  campaigns: { title: "Campaigns", description: "Organize tracked traffic and campaign performance." },
  analytics: { title: "Analytics", description: "Workspace and entity-level performance filters are being connected." },
  fans: { title: "Fans", description: "Audience capture and consent-based fan data." },
  pixels: { title: "Pixels", description: "Tracking integrations, health checks, verification, and recent pixel events." },
  domains: { title: "Domains", description: "Custom domains and routing configuration." },
  team: { title: "Team", description: "Workspace membership and role management." },
  billing: { title: "Billing", description: "Plan limits are active; Stripe billing comes later." },
  settings: { title: "Settings", description: "Workspace identity and platform preferences." }
};
export default async function ModulePage({ params }: { params: Promise<{ workspace: string; module: string }> }) { const {workspace,module}=await params; if(!await getWorkspaceContext(workspace)) redirect("/login"); const item=modules[module]; if(!item) notFound(); return <main className="admin-main"><div className="admin-title-row"><div><span className="admin-kicker">COMING NEXT</span><h1>{item.title}</h1><p>{item.description}</p></div></div><div className="admin-panel"><p>The data model and access boundary for this module are ready. Product actions will be added without reshaping releases or link pages.</p></div></main>; }
