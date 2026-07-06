import { redirect } from "next/navigation";
import { FastCreate } from "@/components/admin/FastCreate";
import { getWorkspaceContext } from "@/lib/adminAuth";
import { listArtists } from "@/lib/releaseRepository";
export default async function CreateSearchPage({params}:{params:Promise<{workspace:string}>}){const id=(await params).workspace;const context=await getWorkspaceContext(id);if(!context)redirect("/login");return <FastCreate workspaceId={id} artists={await listArtists(id)}/>}
