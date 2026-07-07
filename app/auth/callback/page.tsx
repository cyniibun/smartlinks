import { AuthCallbackClient } from "@/components/admin/AuthCallbackClient";

export default async function AuthCallbackPage({ searchParams }: { searchParams: Promise<{ code?: string; next?: string; error?: string; error_description?: string }> }) {
  const params = await searchParams;
  console.info("[tone-link:auth-callback:debug]", {
    pathname: "/auth/callback",
    queryKeys: Object.keys(params),
    hasCode: Boolean(params.code),
    hasError: Boolean(params.error || params.error_description),
  });
  return <AuthCallbackClient code={params.code || ""} next={params.next || ""} error={params.error || params.error_description || ""} />;
}
