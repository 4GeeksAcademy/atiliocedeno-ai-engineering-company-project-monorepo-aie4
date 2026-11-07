import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export function normalizePhone(value: string | null | undefined): string | null {
  const input = value?.trim();
  if (!input) return null;
  if (!/^\+?[0-9 ()\-.]+$/.test(input) || (input.match(/\(/g)?.length ?? 0) !== (input.match(/\)/g)?.length ?? 0)) {
    throw new Error("invalid_phone");
  }
  const number = parsePhoneNumberFromString(input, input.startsWith("0") ? "GB" : "US");
  if (!number || !["US", "GB"].includes(number.country ?? "") || !number.isValid()) throw new Error("invalid_phone");
  return number.number;
}
export function phoneError(value: string, language: "es" | "en" = "es"): string {
  try { normalizePhone(value); return ""; }
  catch { return language === "en" ? "Enter a valid US or UK phone number, including +1 or +44 when using an international format." : "Introduce un teléfono válido de EE. UU. o Reino Unido; usa +1 o +44 para formato internacional."; }
}
