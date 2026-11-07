import { NextResponse } from "next/server";

const API_BASE_URL = (
  process.env.HEALTHCORE_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

type RouteContext = { params: Promise<{ path: string[] }> };

async function forward(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const incomingUrl = new URL(request.url);
  const apiUrl = `${API_BASE_URL}/${path.map(encodeURIComponent).join("/")}${incomingUrl.search}`;
  const headers = new Headers();

  for (const name of ["accept", "authorization", "content-type"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(apiUrl, {
      method: request.method,
      headers,
      ...(request.method === "GET" || request.method === "HEAD"
        ? {}
        : { body: await request.arrayBuffer() }),
      cache: "no-store",
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const name of ["content-encoding", "content-length", "transfer-encoding"])
      responseHeaders.delete(name);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { detail: "HealthCore API is unavailable." },
      { status: 502 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const DELETE = forward;
