// The Tracker API is independent of HealthCore FastAPI.
export function trackerApiUrl(path: string, isEnglish: boolean): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!base) {
    throw new Error(isEnglish
      ? "The Talent Tracker is not configured. Contact the administrator."
      : "El Tracker de talentos no está configurado. Contacta al administrador.");
  }
  return `${base}${path}`;
}
