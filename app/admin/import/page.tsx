import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { ImportTool } from "@/components/admin/ImportTool";
import { isAdmin } from "@/lib/adminAuth";
export default async function ImportPage() { if (!await isAdmin()) redirect("/admin"); return <div className="admin-shell"><AdminNav /><ImportTool /></div>; }
