import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, WORKSPACE_COOKIE } from "@/lib/adminAuth";
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, WORKSPACE_COOKIE]) response.cookies.set(name, "", { path: "/", maxAge: 0 });
  return response;
}
