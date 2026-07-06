import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/adminAuth";
export default async function DashboardPage(){const context=await getWorkspaceContext();if(!context)redirect("/login");redirect(`/dashboard/${context.workspace.id}/overview`)}
