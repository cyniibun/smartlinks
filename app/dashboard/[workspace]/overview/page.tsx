import { redirect } from "next/navigation";
import { WorkspaceOverview } from "@/components/admin/WorkspaceOverview";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getWorkspaceOverview } from "@/lib/workspaceOverview";

export default async function OverviewPage({params}:{params:Promise<{workspace:string}>}){const workspaceId=(await params).workspace;const context=await getWorkspaceContext(workspaceId);if(!context)redirect("/login");return <WorkspaceOverview workspaceId={workspaceId} workspaceName={context.workspace.name} data={await getWorkspaceOverview(workspaceId)}/>}
