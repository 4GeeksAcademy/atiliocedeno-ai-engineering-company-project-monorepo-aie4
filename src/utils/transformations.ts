import type {
  Appointment,
  Claim,
  Clinician,
  ClinicianRole,
  CMEReport,
  CMEStatus,
  Location,
  ServiceType,
} from "../types/models.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function parseCalendarDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function differenceInDays(fromDate: Date, toDate: Date): number {
  const differenceMs = toDate.getTime() - fromDate.getTime();
  return Math.round(differenceMs / DAY_IN_MS);
}

function addYears(date: Date, yearsToAdd: number): Date {
  const nextDate = new Date(date.getTime());
  nextDate.setFullYear(nextDate.getFullYear() + yearsToAdd);
  return nextDate;
}

function getReportStatus(
  clinician: Clinician,
  percentComplete: number,
  percentOfCycleElapsed: number,
  isCycleActive: boolean,
): CMEStatus {
  if (clinician.cmeHoursLogged >= clinician.cmeHoursRequired) {
    return "complete";
  }

  if (!isCycleActive && clinician.cmeHoursLogged < clinician.cmeHoursRequired) {
    return "overdue";
  }

  if (isCycleActive && percentComplete < percentOfCycleElapsed - 15) {
    return "at_risk";
  }

  return "on_track";
}

export function calculateDenialRate(claims: Claim[]): number {
  if (claims.length === 0) {
    throw new Error("Claims array cannot be empty when calculating denial rate.");
  }

  const deniedClaims = claims.filter((claim) => claim.status === "denied").length;
  const rate = (deniedClaims / claims.length) * 100;

  if (!Number.isFinite(rate)) {
    return 0;
  }

  return roundTo(rate, 2);
}

export function denialRateByPayer(claims: Claim[]): Record<string, number> {
  const groupedClaims = claims.reduce<Record<string, Claim[]>>((result, claim) => {
    if (!result[claim.payerName]) {
      result[claim.payerName] = [];
    }

    result[claim.payerName].push(claim);
    return result;
  }, {});

  return Object.entries(groupedClaims).reduce<Record<string, number>>((result, [payerName, payerClaims]) => {
    const deniedClaims = payerClaims.filter((claim) => claim.status === "denied").length;
    const rate = (deniedClaims / payerClaims.length) * 100;
    result[payerName] = roundTo(rate, 2);
    return result;
  }, {});
}

export function denialRateByLocation(claims: Claim[]): Record<string, number> {
  const groupedClaims = claims.reduce<Record<string, Claim[]>>((result, claim) => {
    if (!result[claim.locationId]) {
      result[claim.locationId] = [];
    }

    result[claim.locationId].push(claim);
    return result;
  }, {});

  return Object.entries(groupedClaims).reduce<Record<string, number>>((result, [locationId, locationClaims]) => {
    const deniedClaims = locationClaims.filter((claim) => claim.status === "denied").length;
    const rate = (deniedClaims / locationClaims.length) * 100;
    result[locationId] = roundTo(rate, 2);
    return result;
  }, {});
}

export function flagHighDenialPayers(
  claims: Claim[],
  threshold = 8,
): string[] {
  const rateByPayer = denialRateByPayer(claims);

  return Object.entries(rateByPayer)
    .filter(([, rate]) => rate > threshold)
    .map(([payerName]) => payerName);
}

export function calculateNoShowCost(
  appointments: Appointment[],
  location: Location,
  weekEndingDate: string,
): number {
  const endDate = parseCalendarDate(weekEndingDate);
  const startDate = new Date(endDate.getTime() - 6 * DAY_IN_MS);

  const noShowAppointments = appointments.filter((appointment) => {
    if (appointment.locationId !== location.locationId || appointment.status !== "no_show") {
      return false;
    }

    const appointmentDate = parseCalendarDate(appointment.scheduledDate);
    return appointmentDate >= startDate && appointmentDate <= endDate;
  });

  if (noShowAppointments.length === 0) {
    return 0;
  }

  const totalCost = noShowAppointments.reduce((sum, appointment) => {
    const fee = location.averageConsultationFee[appointment.serviceType] ?? 0;
    return sum + fee;
  }, 0);

  return roundTo(totalCost, 2);
}

export function noShowRateByLocation(
  appointments: Appointment[],
): Record<string, number> {
  const totals = appointments.reduce<Record<string, { total: number; noShows: number }>>((result, appointment) => {
    if (!result[appointment.locationId]) {
      result[appointment.locationId] = { total: 0, noShows: 0 };
    }

    result[appointment.locationId].total += 1;

    if (appointment.status === "no_show") {
      result[appointment.locationId].noShows += 1;
    }

    return result;
  }, {});

  return Object.entries(totals).reduce<Record<string, number>>((result, [locationId, metrics]) => {
    if (metrics.total === 0) {
      return result;
    }

    const rate = (metrics.noShows / metrics.total) * 100;
    result[locationId] = roundTo(rate, 2);
    return result;
  }, {});
}

export function flagHighNoShowLocations(
  appointments: Appointment[],
  threshold = 20,
): string[] {
  const rateByLocation = noShowRateByLocation(appointments);

  return Object.entries(rateByLocation)
    .filter(([, rate]) => rate > threshold)
    .map(([locationId]) => locationId);
}

export function generateCMEReport(
  clinicians: Clinician[],
  asOfDate: string,
): CMEReport[] {
  const asOf = parseCalendarDate(asOfDate);

  return clinicians.map((clinician) => {
    const hoursRequired = clinician.cmeHoursRequired;
    const hoursLogged = clinician.cmeHoursLogged;
    const hoursRemaining = Math.max(0, hoursRequired - hoursLogged);
    const percentComplete = hoursRequired === 0 ? 100 : (hoursLogged / hoursRequired) * 100;
    const cycleStart = parseCalendarDate(clinician.cmeYearStartDate);
    const cycleEnd = addYears(cycleStart, 1);
    const cycleLengthDays = Math.max(1, differenceInDays(cycleStart, cycleEnd));
    const daysElapsedInCycle = Math.max(0, differenceInDays(cycleStart, asOf));
    const percentOfCycleElapsed = (daysElapsedInCycle / cycleLengthDays) * 100;
    const isCycleActive = asOf <= cycleEnd;
    const daysRemainingInCycle = isCycleActive
      ? Math.max(0, differenceInDays(asOf, cycleEnd))
      : 0;
    const complianceStatus = getReportStatus(
      clinician,
      percentComplete,
      percentOfCycleElapsed,
      isCycleActive,
    );
    const licenceExpiryDate = parseCalendarDate(clinician.licenceExpiryDate);
    const licenceDaysRemaining = differenceInDays(asOf, licenceExpiryDate);

    return {
      clinicianId: clinician.clinicianId,
      fullName: `${clinician.firstName} ${clinician.lastName}`,
      role: clinician.role,
      locationId: clinician.locationId,
      hoursRequired,
      hoursLogged,
      hoursRemaining,
      percentComplete: roundTo(percentComplete, 1),
      daysRemainingInCycle,
      complianceStatus,
      licenceExpiryDate: clinician.licenceExpiryDate,
      licenceDaysRemaining,
    };
  });
}

export function getCliniciansAtRisk(
  clinicians: Clinician[],
  asOfDate: string,
): Clinician[] {
  return clinicians.filter((clinician) => {
    const report = generateCMEReport([clinician], asOfDate)[0];
    return report.complianceStatus === "at_risk" || report.complianceStatus === "overdue";
  });
}

export function getCliniciansWithExpiringLicences(
  clinicians: Clinician[],
  asOfDate: string,
  daysThreshold: number,
): Clinician[] {
  const asOf = parseCalendarDate(asOfDate);

  return clinicians.filter((clinician) => {
    const expiry = parseCalendarDate(clinician.licenceExpiryDate);
    const remainingDays = differenceInDays(asOf, expiry);
    return remainingDays >= 0 && remainingDays <= daysThreshold;
  });
}

export function getCMEReportByClinician(
  clinicians: Clinician[],
  asOfDate: string,
): Record<string, CMEReport> {
  return clinicians.reduce<Record<string, CMEReport>>((result, clinician) => {
    const report = generateCMEReport([clinician], asOfDate)[0];
    result[clinician.clinicianId] = report;
    return result;
  }, {});
}

export function getValidClinicianRoles(): ClinicianRole[] {
  return [
    "physician",
    "nurse_practitioner",
    "nurse",
    "medical_assistant",
  ];
}
