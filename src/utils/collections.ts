/**
 * HealthCore — Collections
 *
 * Funciones utilitarias para trabajar con arrays y colecciones de datos.
 */

// ───────────────────────── BÁSICAS ─────────────────────────

/** Agrupa elementos de un array por una clave */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

/** Filtra elementos duplicados basándose en una clave */
export function uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();

  function isUnique(item: T): boolean {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }

  return items.filter(isUnique);
}

/** Particiona un array en dos: los que cumplen y los que no cumplen el predicado */
export function partition<T>(items: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];
  for (const item of items) {
    if (predicate(item)) pass.push(item);
    else fail.push(item);
  }
  return [pass, fail];
}

/** Ordena un array de forma segura (sin mutar el original) */
export function sortBy<T>(items: T[], keyFn: (item: T) => number | string, ascending = true): T[] {
  function compare(a: T, b: T): number {
    const ka = keyFn(a);
    const kb = keyFn(b);
    const cmp = ka < kb ? -1 : ka > kb ? 1 : 0;
    return ascending ? cmp : -cmp;
  }

  return [...items].sort(compare);
}

/** Cuenta ocurrencias agrupadas por una clave */
export function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// ───────────────────────── AGREGACIÓN ─────────────────────────

/** Suma de una propiedad numérica */
export function sum<T>(items: T[], valueFn: (item: T) => number): number {
  let total = 0;
  for (const item of items) {
    total += valueFn(item);
  }
  return total;
}

/** Promedio de una propiedad numérica */
export function average<T>(items: T[], valueFn: (item: T) => number): number {
  if (items.length === 0) return 0;
  return sum(items, valueFn) / items.length;
}

/** Valor mínimo de una propiedad */
export function minBy<T>(items: T[], valueFn: (item: T) => number): T | undefined {
  if (items.length === 0) return undefined;

  let best = items[0];
  for (let i = 1; i < items.length; i++) {
    if (valueFn(items[i]) < valueFn(best)) {
      best = items[i];
    }
  }
  return best;
}

/** Valor máximo de una propiedad */
export function maxBy<T>(items: T[], valueFn: (item: T) => number): T | undefined {
  if (items.length === 0) return undefined;

  let best = items[0];
  for (let i = 1; i < items.length; i++) {
    if (valueFn(items[i]) > valueFn(best)) {
      best = items[i];
    }
  }
  return best;
}

// ───────────────────────── TRANSFORMACIÓN ─────────────────────────

/** Paginación simple */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** Aplanar arrays anidados */
export function flatten<T>(nested: T[][]): T[] {
  return ([] as T[]).concat(...nested);
}

/** Mapa de búsqueda rápida a partir de un array */
export function toLookupMap<T>(items: T[], keyFn: (item: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(keyFn(item), item);
  }
  return map;
}

/** Rango de fechas entre dos límites */
export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}