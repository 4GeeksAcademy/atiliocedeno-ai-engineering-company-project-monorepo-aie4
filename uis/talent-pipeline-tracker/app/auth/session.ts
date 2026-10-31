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

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = "ApiError"; }
}
export function isUnauthorized(error: unknown): boolean { return error instanceof ApiError && error.status === 401; }
export function hasStatus(error: unknown, status: number): boolean { return error instanceof ApiError && error.status === status; }
function language(): "en" | "es" { return typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "es"; }
function errorMessage(status: number, path: string, data: unknown): { code: string; message: string } {
  const en = language() === "en";
  const detail = (data as {detail?: unknown})?.detail;
  if (Array.isArray(detail) && detail.some(item => item?.loc?.includes("phone"))) return {code:"phone",message:en ? "Enter a valid US or UK phone number." : "Introduce un teléfono válido de EE. UU. o Reino Unido."};
  if (status === 401) return {code:"unauthorized",message:path === "/auth/login" ? (en ? "Incorrect email or password." : "Correo electrónico o contraseña incorrectos.") : (en ? "Your session expired. Please sign in again." : "Tu sesión venció. Inicia sesión nuevamente.")};
  if (status === 403) return {code:"forbidden",message:en ? "You do not have permission for this action." : "No tienes permiso para realizar esta acción."};
  if (status >= 500) return {code:"server",message:en ? "The service is temporarily unavailable. Try again." : "El servicio no está disponible temporalmente. Inténtalo de nuevo."};
  if (status === 400 && path === "/auth/change-password") return {code:"password",message:en ? "The current password is incorrect." : "La contraseña actual es incorrecta."};
  if (status === 409) return {code:"conflict",message:en ? "The operation could not be completed. Check your details." : "No se pudo completar la operación. Revisa los datos."};
  return {code:"request",message:en ? "The request could not be completed. Check your details and try again." : "No se pudo completar la solicitud. Revisa los datos e inténtalo de nuevo."};
}
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;
  const token = options.token === "" ? undefined : options.token ?? getAccessToken() ?? undefined;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, "network", language() === "en" ? "Unable to connect. Check your connection and try again." : "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const safe = errorMessage(response.status, path, data); throw new ApiError(response.status, safe.code, safe.message); }
  return data as T;
}

export type AccountProfile = { id: number; user_id: number; name: string | null; phone: string | null; address: string | null };
export type Account = { email: string; role: string; profile: AccountProfile | null };
// All existing profile fields are optional. A persisted profile completes setup.
export function accountDestination(account: Account): string { return account.profile ? "/dashboard" : "/account/profile"; }

export function authRequest<T>(path: string, body: unknown, token?: string): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body, token });
}

export function clearAccessToken(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}
