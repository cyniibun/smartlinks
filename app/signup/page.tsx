import { redirect } from "next/navigation";
import { AuthForm } from "@/components/admin/AuthForm";
import { getCurrentUser } from "@/lib/adminAuth";
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser(); if (user?.email_confirmed_at) redirect("/dashboard"); if (user && !user.email_confirmed_at) redirect(`/check-email?email=${encodeURIComponent(user.email || "")}`); return <AuthForm mode="signup" error={(await searchParams).error} />;
}
