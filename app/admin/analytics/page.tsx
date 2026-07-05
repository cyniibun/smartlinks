import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { isAdmin } from "@/lib/adminAuth";
export default async function AnalyticsPage() { if (!await isAdmin()) redirect("/admin"); return <div className="admin-shell"><AdminNav /><AnalyticsDashboard /></div>; }
