import { CheckEmailForm } from "@/components/admin/CheckEmailForm";

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const params = await searchParams;
  return <CheckEmailForm initialEmail={params.email || ""} />;
}
