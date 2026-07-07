import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { getCurrentUser, getWorkspaceContext } from "@/lib/adminAuth";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  if (!user.email_confirmed_at) redirect(`/check-email?email=${encodeURIComponent(user.email || "")}`);
  const context = await getWorkspaceContext(); if (!context) redirect("/login");
  return <div className="admin-shell"><AdminNav workspaceName={context.workspace.name} workspaceId={context.workspace.id} />{children}</div>;
}
