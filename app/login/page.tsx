import { redirect } from "next/navigation";
import { AuthForm } from "@/components/admin/AuthForm";
import { getCurrentUser } from "@/lib/adminAuth";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const user = await getCurrentUser(); if (user?.email_confirmed_at) redirect("/dashboard"); if (user && !user.email_confirmed_at) redirect(`/check-email?email=${encodeURIComponent(user.email || "")}`); const params = await searchParams;
  return <AuthForm mode="login" error={params.error} message={params.message} />;
}
