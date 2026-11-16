import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-healthcore-language", request.nextUrl.pathname.startsWith("/en") ? "en" : "es");
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/", "/en", "/care-request", "/en/care-request"] };
