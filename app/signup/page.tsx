import { redirect } from "next/navigation";
import { AuthForm } from "@/components/admin/AuthForm";
import { getCurrentUser } from "@/lib/adminAuth";
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard"); return <AuthForm mode="signup" error={(await searchParams).error} />;
}
