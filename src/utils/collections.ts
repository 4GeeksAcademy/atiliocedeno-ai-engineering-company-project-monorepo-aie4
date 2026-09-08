import type { Appointment, AppointmentStatus, Claim } from "../types/models";

type ClaimFilterKey = "locationId" | "status" | "payerName" | "serviceType";

export function filterClaims(
  claims: Claim[],
  filters: Partial<Pick<Claim, "locationId" | "status" | "payerName" | "serviceType">>,
): Claim[] {
  const filterEntries = Object.entries(filters) as Array<[
    ClaimFilterKey,
    Claim[ClaimFilterKey] | undefined,
  ]>;

  return claims.filter((claim) =>
    filterEntries.every(([filterKey, filterValue]) => {
      if (filterValue === undefined) {
        return true;
      }

      return claim[filterKey] === filterValue;
    }),
  );
}

export function filterAppointmentsByStatus(
  appointments: Appointment[],
  status: AppointmentStatus[],
): Appointment[] {
  if (status.length === 0) {
    return [];
  }

  return appointments.filter((appointment) => status.includes(appointment.status));
}

export function sortClaimsById(
  claims: Claim[],
  direction: "asc" | "desc",
): Claim[] {
  const sortedClaims = [...claims];

  sortedClaims.sort((left, right) => {
    const comparison = left.claimId.localeCompare(right.claimId, undefined, {
      numeric: true,
      sensitivity: "base",
    });

    return direction === "asc" ? comparison : comparison * -1;
  });

  return sortedClaims;
}

export function sortAppointmentsByDate(
  appointments: Appointment[],
  direction: "asc" | "desc",
): Appointment[] {
  const sortedAppointments = [...appointments];

  sortedAppointments.sort((left, right) => {
    const leftDate = new Date(`${left.scheduledDate}T${left.scheduledTime}:00`).getTime();
    const rightDate = new Date(`${right.scheduledDate}T${right.scheduledTime}:00`).getTime();

    return direction === "asc" ? leftDate - rightDate : rightDate - leftDate;
  });

  return sortedAppointments;
}

export function groupClaimsBy(
  claims: Claim[],
  key: "locationId" | "payerName" | "status" | "serviceType",
): Record<string, Claim[]> {
  if (claims.length === 0) {
    return {};
  }

  return claims.reduce<Record<string, Claim[]>>((result, claim) => {
    const groupKey = String(claim[key]);

    if (!result[groupKey]) {
      result[groupKey] = [];
    }

    result[groupKey].push(claim);
    return result;
  }, {});
}
