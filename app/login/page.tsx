import { redirect } from "next/navigation";
import { AuthForm } from "@/components/admin/AuthForm";
import { getCurrentUser } from "@/lib/adminAuth";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard"); const params = await searchParams;
  return <AuthForm mode="login" error={params.error} message={params.message} />;
}
