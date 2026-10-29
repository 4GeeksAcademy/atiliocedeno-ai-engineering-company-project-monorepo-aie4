const API_URL = (process.env.NEXT_PUBLIC_HEALTHCORE_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");
const TOKEN_KEY = "healthcore_access_token";

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
};

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function saveAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;
  const token = options.token === "" ? undefined : options.token ?? getAccessToken() ?? undefined;
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal,
  });
  const data = await response.json().catch(() => ({})) as { detail?: string; message?: string };
  if (!response.ok) {
    const detail = data.detail ?? data.message;
    const description = typeof detail === "string" ? detail : `Solicitud a ${path} fallida.`;
    throw new Error(`${description} (HTTP ${response.status}: ${method} ${path})`);
  }
  return data as T;
}

export function authRequest<T>(path: string, body: unknown, token?: string): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body, token });
}

export function clearAccessToken(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}
