import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { getWorkspaceContext } from "@/lib/adminAuth";
export default async function WorkspaceAnalytics({params}:{params:Promise<{workspace:string}>}){const id=(await params).workspace;if(!await getWorkspaceContext(id))redirect("/login");return <AnalyticsDashboard workspaceId={id}/>}
