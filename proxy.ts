import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const firstSegment = request.nextUrl.pathname.split("/").filter(Boolean)[0];
  if (firstSegment && !["admin", "dashboard", "login", "signup", "forgot-password", "reset-password", "check-email", "auth", "api", "embed"].includes(firstSegment)) requestHeaders.set("x-cyniical-song-slug", firstSegment);
  else requestHeaders.delete("x-cyniical-song-slug");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
