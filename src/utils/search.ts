/**
 * HealthCore — Search
 *
 * Algoritmos de búsqueda lineal y binaria sobre colecciones de HealthCore.
 * Las funciones son genéricas para funcionar con cualquier tipo de entidad.
 */

// ───────────────────────── BÚSQUEDA LINEAL ─────────────────────────

/**
 * Búsqueda lineal: recorre el array secuencialmente.
 *
 * Complejidad: O(n)
 * Útil para: arrays pequeños, datos no ordenados, o búsquedas por múltiples criterios.
 *
 * @param items - Array de elementos a buscar
 * @param predicate - Función que determina si un elemento cumple la condición
 * @returns El primer elemento que cumple la condición, o undefined si no existe
 */
export function linearFind<T>(items: T[], predicate: (item: T) => boolean): T | undefined {
  for (const item of items) {
    if (predicate(item)) return item;
  }
  return undefined;
}

/**
 * Búsqueda lineal que retorna TODAS las coincidencias.
 *
 * @param items - Array de elementos a buscar
 * @param predicate - Función que determina si un elemento cumple la condición
 * @returns Array con todos los elementos que cumplen la condición
 */
export function linearFilter<T>(items: T[], predicate: (item: T) => boolean): T[] {
  const results: T[] = [];
  for (const item of items) {
    if (predicate(item)) results.push(item);
  }
  return results;
}

/**
 * Búsqueda lineal para encontrar pacientes por nombre (case-insensitive).
 * Ejemplo de uso con el dominio de HealthCore.
 */
export function searchPatientsByName<T extends { firstName: string; lastName: string }>(
  patients: T[],
  query: string,
): T[] {
  const lowerQuery = query.toLowerCase();
  return linearFilter(
    patients,
    (p) =>
      p.firstName.toLowerCase().includes(lowerQuery) ||
      p.lastName.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Búsqueda lineal para filtrar citas por estado.
 */
export function searchAppointmentsByStatus<T extends { status: string }>(
  appointments: T[],
  status: string,
): T[] {
  return linearFilter(appointments, (a) => a.status === status);
}

// ───────────────────────── BÚSQUEDA BINARIA ─────────────────────────

/**
 * Búsqueda binaria sobre un array ordenado.
 *
 * Complejidad: O(log n)
 * REQUISITO: El array debe estar ordenado ascendentemente según la keyFn.
 * Útil para: arrays grandes, búsquedas repetitivas sobre datos ordenados.
 *
 * @param items - Array ordenado de elementos
 * @param target - Valor a buscar
 * @param keyFn - Función que extrae la clave numérica o string de cada elemento
 * @returns El elemento encontrado, o undefined si no existe
 */
export function binarySearch<T>(
  items: T[],
  target: number | string,
  keyFn: (item: T) => number | string,
): T | undefined {
  let left = 0;
  let right = items.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midValue = keyFn(items[mid]);

    if (midValue === target) {
      return items[mid];
    }

    if (midValue < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return undefined;
}

/**
 * Búsqueda binaria que retorna el ÍNDICE del elemento encontrado, o -1 si no existe.
 *
 * Complejidad: O(log n)
 * REQUISITO: El array debe estar ordenado ascendentemente según la keyFn.
 *
 * Difiere de binarySearch() en que retorna un número (índice / -1) en lugar del elemento.
 *
 * @param items - Array ordenado de elementos
 * @param target - Valor a buscar
 * @param keyFn - Función que extrae la clave numérica o string de cada elemento
 * @returns El índice del elemento si se encuentra, o -1 si no
 */
export function binarySearchIndex<T>(
  items: T[],
  target: number | string,
  keyFn: (item: T) => number | string,
): number {
  let left = 0;
  let right = items.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midValue = keyFn(items[mid]);

    if (midValue === target) {
      return mid;
    }

    if (midValue < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1;
}

/**
 * Búsqueda binaria que retorna el índice de inserción (dónde debería ir un elemento
 * para mantener el orden). Útil para mantener arrays ordenados al insertar.
 */
export function binarySearchInsertIndex<T>(
  items: T[],
  target: number | string,
  keyFn: (item: T) => number | string,
): number {
  let left = 0;
  let right = items.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    const midValue = keyFn(items[mid]);

    if (midValue < target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

/**
 * Búsqueda binaria en un rango [start, end].
 * Retorna todos los elementos cuya clave está dentro del rango (inclusive).
 *
 * @param items - Array ordenado de elementos
 * @param start - Límite inferior del rango
 * @param end - Límite superior del rango
 * @param keyFn - Función que extrae la clave numérica de cada elemento
 * @returns Array con elementos en el rango
 */
export function binarySearchRange<T>(
  items: T[],
  start: number,
  end: number,
  keyFn: (item: T) => number,
): T[] {
  // Encontrar primer índice >= start
  let left = 0;
  let right = items.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (keyFn(items[mid]) < start) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  const results: T[] = [];
  for (let i = left; i < items.length; i++) {
    const val = keyFn(items[i]);
    if (val > end) break;
    results.push(items[i]);
  }

  return results;
}

// ───────────────────────── EJEMPLOS DOMINIO HEALTHCORE ─────────────────────────

/**
 * Busca citas en un rango de fechas usando búsqueda binaria.
 * Los appointments deben estar ordenados por fecha.
 */
export function searchAppointmentsByDateRange<T extends { dateTime: string }>(
  appointments: T[],
  startDate: string,
  endDate: string,
): T[] {
  const toTimestamp = (dateStr: string) => new Date(dateStr).getTime();
  const startTs = toTimestamp(startDate);
  const endTs = toTimestamp(endDate);

  return binarySearchRange(
    appointments.sort((a, b) => toTimestamp(a.dateTime) - toTimestamp(b.dateTime)),
    startTs,
    endTs,
    (a) => toTimestamp(a.dateTime),
  );
}

/**
 * Busca reclamaciones por monto exacto usando búsqueda binaria.
 * Las reclamaciones deben estar ordenadas por monto.
 */
export function searchClaimByAmount<T extends { amount: number }>(
  claims: T[],
  amount: number,
): T | undefined {
  const sorted = [...claims].sort((a, b) => a.amount - b.amount);
  return binarySearch(sorted, amount, (c) => c.amount);
}