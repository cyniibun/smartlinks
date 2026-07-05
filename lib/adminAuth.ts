import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "cyniical_admin";
const payload = "cyniical-admin-v1";

function secret() { return process.env.ADMIN_PASSWORD || ""; }
export function adminToken() { return secret() ? createHmac("sha256", secret()).update(payload).digest("hex") : ""; }
export function passwordMatches(value: string) {
  const expected = secret();
  if (!expected || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
export async function isAdmin() {
  const actual = (await cookies()).get(ADMIN_COOKIE)?.value || "";
  const expected = adminToken();
  if (!actual || !expected || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
