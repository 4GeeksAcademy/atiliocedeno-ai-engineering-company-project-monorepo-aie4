// The Tracker API is independent of HealthCore FastAPI.
export function trackerApiUrl(path: string, isEnglish: boolean): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!base) {
    throw new Error(isEnglish
      ? "The Talent Tracker is not configured. Contact the administrator."
      : "El Tracker de talentos no está configurado. Contacta al administrador.");
  }
  return `/api/tracker${path}`;
}

export async function trackerRequest(path: string, english: boolean, options?: RequestInit): Promise<Response> {
  const url = trackerApiUrl(path, english);
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    throw new Error(english
      ? "Unable to connect to Talent Tracker. Check your connection and try again."
      : "No se pudo conectar al Tracker de talentos. Comprueba la conexión e inténtalo de nuevo.");
  }
  if (response.ok) return response;
  if (response.status === 404) throw new Error(english
    ? "This record is no longer available. Return to the list or reload."
    : "El registro ya no está disponible. Vuelve al listado o recarga.");
  if (response.status === 401) throw new Error(english
    ? "Your session could not be verified. Sign in again."
    : "No se pudo verificar la sesión. Inicia sesión nuevamente.");
  if (response.status >= 500) throw new Error(english
    ? "Talent Tracker is temporarily unavailable. Try again."
    : "El Tracker de talentos no está disponible temporalmente. Inténtalo de nuevo.");
  throw new Error(english
    ? "Talent Tracker rejected this request. Check the information and try again."
    : "El Tracker de talentos rechazó la solicitud. Revisa los datos e inténtalo de nuevo.");
}

export async function trackerJson<T>(
  path: string, english: boolean, decode: (value: unknown) => T | undefined, options?: RequestInit,
): Promise<T> {
  const response = await trackerRequest(path, english, options);
  let data: T | undefined;
  try {
    data = decode(await response.json());
  } catch {
    // Parsing and shape errors share a recovery action.
  }
  if (data === undefined) throw new Error(english
    ? "Talent Tracker returned an unexpected response. Try again."
    : "El Tracker de talentos devolvió una respuesta inesperada. Inténtalo de nuevo.");
  return data;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasField(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.some(key => typeof value[key] === "string" || typeof value[key] === "number");
}

export function trackerRecord(payload: unknown): import("./types").TalentRecord | undefined {
  const value = isObject(payload) && "data" in payload ? payload.data : payload;
  if (!isObject(value) || !hasField(value, ["id", "_id", "name", "full_name", "fullName", "email", "status", "stage"])) return;
  return value as import("./types").TalentRecord;
}

export function trackerRecords(payload: unknown, kind: "records" | "notes" = "records"): import("./types").TalentRecord[] | undefined {
  const value = isObject(payload)
    ? kind === "notes" ? payload.notes ?? payload.data : payload.data ?? payload.records
    : payload;
  if (!Array.isArray(value)) return;
  if (kind === "notes") {
    return value.every(item => isObject(item) && hasField(item, ["id", "note_id", "content", "text", "note"]))
      ? value : undefined;
  }
  return value.every(item => isObject(item) && trackerRecord(item) !== undefined) ? value : undefined;
}
