import { notFound,redirect } from "next/navigation";
import { SmartLinkEditor } from "@/components/admin/SmartLinkEditor";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { getSmartLinkEditorPage } from "@/lib/linkPageEditor";
export default async function LinkPagePage({params,searchParams}:{params:Promise<{workspace:string;linkPage:string}>;searchParams:Promise<{created?:string}>}){const{workspace,linkPage}=await params;if(!await getWorkspaceContext(workspace))redirect("/login");const page=await getSmartLinkEditorPage(linkPage,workspace);if(!page)notFound();return <SmartLinkEditor workspaceId={workspace} initialPage={page} created={(await searchParams).created==="1"}/>}
