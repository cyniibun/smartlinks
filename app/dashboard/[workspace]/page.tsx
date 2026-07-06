import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/adminAuth";
export default async function WorkspaceDashboardPage({params}:{params:Promise<{workspace:string}>}){const id=(await params).workspace;if(!await getWorkspaceContext(id))redirect("/login");redirect(`/dashboard/${id}/overview`)}
