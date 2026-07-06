import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { getWorkspaceContext } from "@/lib/adminAuth";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await getWorkspaceContext(); if (!context) redirect("/login");
  return <div className="admin-shell"><AdminNav workspaceName={context.workspace.name} workspaceId={context.workspace.id} />{children}</div>;
}
