import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/adminAuth";
export default async function HomePage() { redirect(await getCurrentUser() ? "/dashboard" : "/login"); }
