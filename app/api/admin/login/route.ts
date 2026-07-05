import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken, passwordMatches } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const isForm = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded") || false;
  const password = isForm
    ? String((await request.formData()).get("password") || "")
    : String((await request.json().catch(() => ({ password: "" }))).password || "");
  if (!passwordMatches(password)) {
    return isForm
      ? NextResponse.redirect(new URL("/admin?error=incorrect-password", request.url), 303)
      : NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  const response = isForm
    ? NextResponse.redirect(new URL("/admin", request.url), 303)
    : NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, adminToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}
