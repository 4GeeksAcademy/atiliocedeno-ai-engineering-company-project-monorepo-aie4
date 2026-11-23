// Route browser API calls through Next.js so Codespaces port authentication and
// browser CORS restrictions do not block the frontend from reaching FastAPI.
const API_URL = (process.env.NEXT_PUBLIC_HEALTHCORE_API_URL ?? "/api/healthcore").replace(/\/+$/, "");
const TOKEN_KEY = "healthcore_access_token";

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
};

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
  }
  return token;
}

export function saveAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = "ApiError"; }
}
export function isUnauthorized(error: unknown): boolean { return error instanceof ApiError && error.status === 401 && error.code === "unauthorized"; }
export function hasStatus(error: unknown, status: number): boolean { return error instanceof ApiError && error.status === status && error.code !== "invalid_response"; }
function language(): "en" | "es" { return typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "es"; }
function errorMessage(status: number, path: string, data: unknown): { code: string; message: string } {
  const en = language() === "en";
  const detail = (data as {detail?: unknown})?.detail;
  if (status === 422 && Array.isArray(detail)) {
    const issues = detail.filter(item => Array.isArray(item?.loc));
    const fields: Record<string, [string, string]> = {
      email: ["email address", "correo electrónico"],
      name: ["name", "nombre"],
      address: ["address", "dirección"],
      password: ["password", "contraseña"],
      new_password: ["new password", "contraseña nueva"],
      current_password: ["current password", "contraseña actual"],
      token: ["reset link", "enlace de recuperación"],
      role: ["account role", "rol de la cuenta"],
      is_active: ["account status", "estado de la cuenta"],
    };
    for (const issue of issues) {
      if (issue.loc.includes("phone")) return {code:"phone",message:en ? "Enter a valid US or UK phone number." : "Introduce un teléfono válido de EE. UU. o Reino Unido."};
      if (issue.type === "password_too_long") return {code:"password_too_long",message:en ? "Use a password of at most 72 UTF-8 bytes. Accented characters can use more than one byte." : "Usa una contraseña de hasta 72 bytes en UTF-8. Los caracteres con acento pueden ocupar más de un byte."};
      const field = issue.loc.find((part: unknown) => typeof part === "string" && Object.prototype.hasOwnProperty.call(fields, part));
      if (field) return {code:field,message:en ? "Check the " + fields[field][0] + " and try again." : "Revisa el campo «" + fields[field][1] + "» e inténtalo de nuevo."};
    }
  }
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
  if (response.status === 204 && method === "DELETE") return undefined as T;
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (response.ok) throw invalidResponse(response.status);
  }
  if (!response.ok) {
    if (path === "/auth/me" && response.status === 401 && (!isObject(data) || typeof data.detail !== "string")) {
      throw invalidResponse(response.status);
    }
    if (path === "/profiles/me" && method === "GET" && response.status === 404
      && (!isObject(data) || data.detail !== "Profile not found")) {
      throw invalidResponse(response.status);
    }
    const safe = errorMessage(response.status, path, data);
    throw new ApiError(response.status, safe.code, safe.message);
  }
  if (!isExpectedResponse(path, method, data)) throw invalidResponse(response.status);
  return data as T;
}

function invalidResponse(status: number) {
  return new ApiError(status, "invalid_response", language() === "en"
    ? "HealthCore returned an unexpected response. Please try again."
    : "HealthCore devolvió una respuesta inesperada. Inténtalo de nuevo.");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProfile(value: unknown): value is AccountProfile {
  return isObject(value) && Number.isInteger(value.id) && Number.isInteger(value.user_id)
    && [value.name, value.phone, value.address].every(field => field == null || typeof field === "string");
}

export type AccountProfile = { id: number; user_id: number; name?: string | null; phone?: string | null; address?: string | null };
export type Account = { email: string; role: string; profile: AccountProfile | null };

function isAccount(value: unknown): value is Account {
  return isObject(value) && typeof value.email === "string" && typeof value.role === "string" && ["user", "manager", "admin"].includes(value.role)
    && (value.profile === null || isProfile(value.profile));
}

function isUser(value: unknown): boolean {
  return isObject(value) && Number.isInteger(value.id) && typeof value.email === "string"
    && typeof value.role === "string" && ["user", "manager", "admin"].includes(value.role) && typeof value.is_active === "boolean"
    && (value.profile == null || isProfile(value.profile));
}

function isExpectedResponse(path: string, method: string, data: unknown): boolean {
  if (method === "DELETE") return false;
  if (path === "/auth/login") return isObject(data) && typeof data.access_token === "string" && Boolean(data.access_token);
  if (path === "/auth/me") return isAccount(data);
  if (path.startsWith("/auth/")) return isObject(data) && typeof data.message === "string";
  if (path.startsWith("/profiles/")) return isProfile(data);
  if (path === "/users" && method === "GET") return Array.isArray(data) && data.every(isUser);
  if (path === "/users" || path.startsWith("/users/")) return isUser(data);
  return false;
}

// All existing profile fields are optional. A persisted profile completes setup.
export function accountDestination(account: Account, returnTo?: string | null): string {
  if (!account.profile) return "/account/profile";
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")) {
    const origin = "https://healthcore.invalid";
    const url = new URL(returnTo, origin);
    if (url.origin === origin && /^\/(dashboard|account|admin|talents|backoffice|domain-lab)(\/|$)/.test(url.pathname)) {
      return url.pathname + url.search + url.hash;
    }
  }
  return "/dashboard";
}

export function authRequest<T>(path: string, body: unknown, token?: string): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body, token });
}

export function clearAccessToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}
