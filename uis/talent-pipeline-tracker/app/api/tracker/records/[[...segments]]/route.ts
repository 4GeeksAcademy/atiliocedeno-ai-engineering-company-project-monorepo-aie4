// The proxy verifies the HealthCore session. Only record and note operations
// are forwarded; HealthCore cookies and credentials stay on this origin.
type Context = { params: Promise<{ segments?: string[] }> };

async function forward(request: Request, context: Context) {
  const { segments = [] } = await context.params;
  const methods = [["GET", "POST"], ["GET", "PUT", "DELETE"], ["GET", "POST"], ["DELETE"]];
  if (segments.length >= methods.length || (segments.length >= 2 && segments[1] !== "notes") ||
      segments.some(part => !part || part === "." || part === "..")) {
    return new Response(null, { status: 404 });
  }
  if (!methods[segments.length].includes(request.method)) return new Response(null, { status: 405 });
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && origin && origin !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }
  const base = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (!base) return Response.json({ error: "Tracker API unavailable" }, { status: 503 });
  const path = ["records", ...segments.map(encodeURIComponent)].join("/");
  const hasBody = request.method === "POST" || request.method === "PUT";
  if (hasBody && !request.headers.get("content-type")?.startsWith("application/json")) {
    return new Response(null, { status: 415 });
  }
  try {
    const upstream = await fetch(base + "/" + path + new URL(request.url).search, {
      method: request.method,
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
      redirect: "error",
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Tracker API unavailable" }, { status: 502 });
  }
}
export { forward as GET, forward as POST, forward as PUT, forward as DELETE };
