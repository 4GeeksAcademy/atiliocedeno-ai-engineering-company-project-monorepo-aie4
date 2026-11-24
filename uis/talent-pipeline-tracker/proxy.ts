import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;

  requestHeaders.delete("x-healthcore-role");
  const trackerRequest = pathname.startsWith("/api/tracker/");
  const requiresSession = trackerRequest ||
    pathname === "/dashboard" || pathname === "/domain-lab" ||
    pathname.startsWith("/account/") || pathname.startsWith("/admin/") ||
    pathname === "/talents" || pathname.startsWith("/talents/") ||
    pathname === "/backoffice" || pathname.startsWith("/backoffice/");

  if (requiresSession) {
    const accessToken = request.cookies.get("healthcore_access_token")?.value;
    let role: "admin" | "user" | undefined;
    let unavailable = false;
    if (accessToken) {
      let token: string | undefined;
      try {
        token = decodeURIComponent(accessToken);
      } catch {
        // A malformed local cookie cannot identify a session.
      }
      if (token) {
        const apiBaseUrl = (process.env.HEALTHCORE_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
        let response: Response | undefined;
        try {
          response = await fetch(apiBaseUrl + "/auth/me", {
            headers: { Authorization: "Bearer " + token },
            cache: "no-store",
          });
        } catch {
          unavailable = true;
        }
        if (response?.ok) {
          const account: unknown = await response.json().catch(() => null);
          if (typeof account === "object" && account !== null && "email" in account
              && typeof account.email === "string" && "profile" in account
              && (account.profile === null || (typeof account.profile === "object" && account.profile !== null
                  && "id" in account.profile && Number.isInteger(account.profile.id)
                  && "user_id" in account.profile && Number.isInteger(account.profile.user_id)))
              && "role" in account && (account.role === "admin" || account.role === "manager" || account.role === "user")) {
            role = account.role === "admin" ? "admin" : "user";
          } else {
            unavailable = true;
          }
        } else if (response?.status === 401) {
          const rejection: unknown = await response.json().catch(() => null);
          unavailable = typeof rejection !== "object" || rejection === null
            || !("detail" in rejection) || typeof rejection.detail !== "string";
        } else if (response) {
          unavailable = true;
        }
      }
    }

    if (!role) {
      if (trackerRequest) return NextResponse.json(
        { error: unavailable ? "HealthCore session verification is unavailable" : "Unauthorized" },
        { status: unavailable ? 503 : 401 },
      );
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
      if (unavailable) loginUrl.searchParams.set("session", "unavailable");
      const response = NextResponse.redirect(loginUrl);
      if (accessToken && !unavailable) response.cookies.delete("healthcore_access_token");
      return response;
    }
    requestHeaders.set("x-healthcore-role", role);
    if (pathname.startsWith("/admin/") && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  const routeLanguage = pathname === "/talents/en" || pathname.startsWith("/talents/en/")
    ? "en"
    : pathname === "/talents" || pathname.startsWith("/talents/")
      ? "es"
      : request.cookies.get("healthcore_language")?.value;
  requestHeaders.set("x-healthcore-language", routeLanguage === "en" ? "en" : "es");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/", "/login", "/signup", "/forgot-password", "/reset-password",
    "/api/tracker/:path*", "/account/:path*", "/dashboard", "/admin/:path*", "/domain-lab",
    "/talents", "/talents/:path*", "/backoffice", "/backoffice/:path*",
  ],
};