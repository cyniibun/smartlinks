const hits = new Map<string, number[]>();

export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export function isLocalRequest(request: Request) {
  const host = new URL(request.url).hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export function checkRateLimit(request: Request, key: string, limit = 8, windowMs = 15 * 60 * 1000) {
  if (process.env.NODE_ENV !== "production" || isLocalRequest(request)) return true;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
