import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  requestHeaders.set(
    "x-healthcore-language",
    pathname === "/en" || pathname === "/en/care-request" ||
      pathname === "/talents/en" || pathname.startsWith("/talents/en/") ? "en" : "es",
  );

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/", "/care-request", "/en", "/en/care-request", "/talents/:path*"],
};