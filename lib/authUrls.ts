export function getSiteUrl(request?: Request) {
  const requestOrigin = request ? new URL(request.url).origin : "";
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin);
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configured) return configured.startsWith("http") ? configured.replace(/\/$/, "") : `https://${configured.replace(/\/$/, "")}`;
  if (vercelUrl) return vercelUrl.startsWith("http") ? vercelUrl.replace(/\/$/, "") : `https://${vercelUrl.replace(/\/$/, "")}`;
  if (isLocal) return requestOrigin;
  return "http://localhost:3000";
}

export function getEmailPrefix(email: string) {
  return (email.split("@")[0] || "user").trim() || "user";
}

export function slugifyWorkspaceName(name: string, fallback = "workspace") {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
}
