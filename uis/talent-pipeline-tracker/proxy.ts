import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;

  const requiresSession =
    pathname === "/talents" || pathname.startsWith("/talents/") ||
    pathname === "/backoffice" || pathname.startsWith("/backoffice/");

  if (requiresSession) {
    const accessToken = request.cookies.get("healthcore_access_token")?.value;
    let isAuthenticated = false;
    if (accessToken) {
      try {
        const apiBaseUrl = (process.env.HEALTHCORE_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
        const token = decodeURIComponent(accessToken);
        const response = await fetch(`${apiBaseUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        isAuthenticated = response.ok;
      } catch {
        // Fail closed: talent information should not be served if the session
        // cannot be verified against the authentication API.
      }
    }

    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      const response = NextResponse.redirect(loginUrl);
      if (accessToken) response.cookies.delete("healthcore_access_token");
      return response;
    }
  }

  const routeLanguage = pathname === "/en" || pathname.startsWith("/en/") ||
    pathname === "/talents/en" || pathname.startsWith("/talents/en/")
    ? "en"
    : pathname === "/" || pathname === "/care-request" || pathname === "/talents" || pathname.startsWith("/talents/")
      ? "es"
      : request.cookies.get("healthcore_language")?.value;
  requestHeaders.set("x-healthcore-language", routeLanguage === "en" ? "en" : "es");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/", "/care-request", "/en", "/en/:path*", "/login", "/signup", "/forgot-password", "/reset-password",
    "/account/:path*", "/dashboard", "/admin/:path*", "/domain-lab",
    "/talents", "/talents/:path*", "/backoffice", "/backoffice/:path*",
  ],
};