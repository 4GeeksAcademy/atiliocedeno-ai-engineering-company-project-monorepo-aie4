/**
 * HealthCore — Transformations
 *
 * Funciones de agregación y generación de dashboards/reportes para HealthCore.
 * Cada dashboard está alineado con los nombres del CONTEXT.md:
 *   - ClinicalOperationsDashboard  → dashboard de operaciones clínicas
 *   - RevenueDashboard             → dashboard de facturación unificado
 *   - PatientExperienceDashboard   → dashboard de experiencia del paciente
 *   - HRDashboard                  → dashboard de KPIs de RR.HH.
 *   - ExecutiveReport              → informe semanal ejecutivo
 *
 * Trabaja sobre los modelos definidos en types/models.ts.
 *
 * NOTA: Este archivo usa funciones tradicionales (function) y bucles for
 * en lugar de arrow functions, para que sea más fácil de entender.
 */

import type {
  Appointment,
  Claim,
  Clinic,
  Staff,
  Metric,
  ComplianceRecord,
  ExecutiveReport,
  MetricAlert,
  Id,
  Department,
  CurrencyAmount,
  RiskLevel,
} from '../types/models.js';
import { groupBy, sum, average, countBy } from './collections.js';

// ───────────────────────── FUNCIONES AYUDANTES ─────────────────────────
// Estas funciones pequeñas se usan como "predicados" o "callbacks"
// en los filtros y transformaciones de más abajo.

/** Indica si una cita tiene cierto estado */
function appointmentHasStatus(status: string): (a: Appointment) => boolean {
  return function (appointment: Appointment): boolean {
    return appointment.status === status;
  };
}

/** Indica si una reclamación tiene cierto estado */
function claimHasStatus(status: string): (c: Claim) => boolean {
  return function (claim: Claim): boolean {
    return claim.status === status;
  };
}

/** Extrae el tipo de una cita (para countBy) */
function getAppointmentType(a: Appointment): string {
  return a.type;
}

/** Extrae el clinicId de una cita (para countBy) */
function getAppointmentClinicId(a: Appointment): string {
  return a.clinicId;
}

/** Extrae el motivo de rechazo de una reclamación (para groupBy) */
function getDenialReason(c: Claim): string {
  return c.denialReason ?? 'unknown';
}

/** Extrae el pagador de una reclamación (para groupBy) */
function getClaimPayer(c: Claim): string {
  return c.payer;
}

/** Extrae el clinicId de una reclamación (para groupBy) */
function getClaimClinicId(c: Claim): string {
  return c.clinicId;
}

/** Extrae el monto de una reclamación */
function getClaimAmount(c: Claim): number {
  return c.amount;
}

/** Indica si una cita se reservó por cierto método */
function bookingMethodIs(method: string): (a: Appointment) => boolean {
  return function (appointment: Appointment): boolean {
    return appointment.bookingMethod === method;
  };
}

/** Indica si una cita tiene recordatorio enviado */
function hasReminderSent(a: Appointment): boolean {
  return a.reminderSent;
}

/** Extrae el rol de un miembro del staff */
function getStaffRole(s: Staff): string {
  return s.role;
}

/** Extrae el clinicId de un miembro del staff */
function getStaffClinicId(s: Staff): string {
  return s.clinicId;
}

/** Extrae los días para contratar */
function getDaysToHire(s: Staff): number {
  return s.daysToHire;
}

/** Indica si un número es mayor a 0 */
function isGreaterThanZero(d: number): boolean {
  return d > 0;
}

/** Indica si un staff está de licencia */
function isOnLeave(s: Staff): boolean {
  return s.employmentStatus === 'on_leave';
}

/** Indica si un staff tiene CME por vencer */
function hasExpiringCME(s: Staff): boolean {
  // También convertimos el some() interno a función tradicional
  function cmeIsExpiring(c: { status: string }): boolean {
    return c.status === 'expiring_soon';
  }
  return s.cmeHours.some(cmeIsExpiring);
}

/** Indica si una métrica tiene alerta activada */
function hasAlertTriggered(m: Metric): boolean {
  return m.alertTriggered;
}

/** Convierte una métrica con alerta en una MetricAlert */
function metricToAlert(m: Metric): MetricAlert {
  return {
    metricName: m.name,
    currentValue: m.value,
    threshold: m.thresholdAlert ?? m.target,
    severity: m.value > (m.thresholdAlert ?? m.target) ? 'critical' : 'warning',
    department: m.department,
    message: `[${m.department}] ${m.name} = ${m.value}${m.unit} (umbral: ${m.thresholdAlert ?? m.target}${m.unit})`,
  };
}

/** Indica si una métrica superó su umbral */
function hasExceededThreshold(m: Metric): boolean {
  return m.thresholdAlert !== undefined && m.value > m.thresholdAlert;
}

/** Convierte una métrica que excedió el umbral en una MetricAlert (para getTriggeredAlerts) */
function metricExceededToAlert(m: Metric): MetricAlert {
  return {
    metricName: m.name,
    currentValue: m.value,
    threshold: m.thresholdAlert!,
    department: m.department,
    severity: m.value > m.thresholdAlert! * 1.25 ? 'critical' : 'warning',
    message: `${m.name} ha superado el umbral: ${m.value}${m.unit} > ${m.thresholdAlert}${m.unit}`,
  };
}

/** Ordena denial reasons de mayor a menor cantidad */
function sortByCountDesc(a: { count: number }, b: { count: number }): number {
  return b.count - a.count;
}

/** Convierte una entrada [reason, items] en un objeto de denial reason */
function entryToDenialReason(entry: [string, Claim[]]): {
  reason: string;
  count: number;
  amount: CurrencyAmount;
} {
  const reason = entry[0];
  const items = entry[1];
  return {
    reason: reason,
    count: items.length,
    amount: sum(items, getClaimAmount),
  };
}

// ───────────────────────── DASHBOARD DE OPERACIONES CLÍNICAS ─────────────────────────
// Alineado con CONTEXT.md: "dashboard de operaciones clínicas que muestre
// volumen de citas, flujo de pacientes y tiempo de documentación por sede"

export interface ClinicalOperationsDashboard {
  totalAppointments: number;
  completedAppointments: number;
  noShows: number;
  noShowRate: number;              // 0-1
  cancelled: number;
  appointmentsByType: Record<string, number>;
  appointmentsByClinic: Record<string, number>;
  avgDocumentationTimeMin: number;
}

/** Genera un resumen clínico a partir de citas y clínicas */
export function buildClinicalOperationsDashboard(
  appointments: Appointment[],
): ClinicalOperationsDashboard {
  const total = appointments.length;

  // Filtramos usando funciones tradicionales en lugar de arrow functions
  const noShows = appointments.filter(appointmentHasStatus('no_show')).length;
  const completed = appointments.filter(appointmentHasStatus('completed')).length;
  const cancelled = appointments.filter(appointmentHasStatus('cancelled')).length;

  return {
    totalAppointments: total,
    completedAppointments: completed,
    noShows,
    noShowRate: total > 0 ? noShows / total : 0,
    cancelled,
    appointmentsByType: countBy(appointments, getAppointmentType),
    appointmentsByClinic: countBy(appointments, getAppointmentClinicId),
    avgDocumentationTimeMin: 0, // se completa con datos de notas clínicas
  };
}

// ───────────────────────── DASHBOARD DE FACTURACIÓN ─────────────────────────
// Alineado con CONTEXT.md: "dashboard de facturación unificado que muestre
// las corrientes de ingresos de EE.UU. y Reino Unido en tiempo real"

export interface RevenueDashboard {
  totalClaimed: CurrencyAmount;
  totalPaid: CurrencyAmount;
  totalDenied: CurrencyAmount;
  totalUnpaid: CurrencyAmount;
  denialRate: number;              // 0-1
  denialRateByPayer: Record<string, number>;
  topDenialReasons: { reason: string; count: number; amount: CurrencyAmount }[];
  revenueByClinic: Record<string, CurrencyAmount>;
}

/** Genera un resumen de ingresos y facturación */
export function buildRevenueDashboard(claims: Claim[]): RevenueDashboard {
  // Filtramos reclamaciones por estado usando funciones tradicionales
  const denied = claims.filter(claimHasStatus('denied'));
  const paid = claims.filter(claimHasStatus('paid'));
  const unpaid = claims.filter(claimHasStatus('unpaid'));

  // Agrupar denial reasons
  const denialGroups = groupBy(denied, getDenialReason);

  // Convertimos el objeto denialGroups en un array ordenado usando funciones tradicionales
  const denialEntries: [string, Claim[]][] = Object.entries(denialGroups);
  const topDenialReasons = denialEntries
    .map(entryToDenialReason)
    .sort(sortByCountDesc);

  // Tasa de rechazo por pagador — usamos bucles for explícitos
  const byPayer = groupBy(claims, getClaimPayer);
  const denialRateByPayer: Record<string, number> = {};

  const payerEntries = Object.entries(byPayer);
  for (let i = 0; i < payerEntries.length; i++) {
    const payer = payerEntries[i][0];
    const items = payerEntries[i][1];

    // Contamos los denegados con un bucle for
    let deniedCount = 0;
    for (let j = 0; j < items.length; j++) {
      if (items[j].status === 'denied') {
        deniedCount++;
      }
    }

    denialRateByPayer[payer] = items.length > 0 ? deniedCount / items.length : 0;
  }

  // Agrupar por clínica y sumar montos pagados — con bucle for tradicional
  const paidByClinic = groupBy(paid, getClaimClinicId);
  const revenueByClinic: Record<string, number> = {};

  const clinicEntries = Object.entries(paidByClinic);
  for (let i = 0; i < clinicEntries.length; i++) {
    const clinicId = clinicEntries[i][0];
    const claimList = clinicEntries[i][1];
    revenueByClinic[clinicId] = sum(claimList, getClaimAmount);
  }

  // Sumamos usando la función getClaimAmount como callback
  return {
    totalClaimed: sum(claims, getClaimAmount),
    totalPaid: sum(paid, getClaimAmount),
    totalDenied: sum(denied, getClaimAmount),
    totalUnpaid: sum(unpaid, getClaimAmount),
    denialRate: claims.length > 0 ? denied.length / claims.length : 0,
    denialRateByPayer,
    topDenialReasons,
    revenueByClinic,
  };
}

// ───────────────────────── DASHBOARD DE EXPERIENCIA DEL PACIENTE ─────────────────────────
// Alineado con CONTEXT.md: "dashboard de experiencia del paciente que registre
// tasas de reserva, no-shows y satisfacción del paciente por sede"

export interface PatientExperienceDashboard {
  totalAppointments: number;
  noShowRate: number;
  onlineBookingRate: number;
  phoneBookingRate: number;
  receptionBookingRate: number;
  reminderDeliveryRate: number;
  patientSatisfactionScore: number;
  estimatedAnnualLossFromNoShows: CurrencyAmount;
}

/** Genera un resumen de experiencia del paciente */
export function buildPatientExperienceDashboard(
  appointments: Appointment[],
  estimatedLossPerNoShow: number = 150, // valor estimado por cita perdida
): PatientExperienceDashboard {
  const total = appointments.length;

  // En lugar de usar .filter() con arrow functions, usamos bucles for tradicionales
  let noShows = 0;
  let onlineBookings = 0;
  let phoneBookings = 0;
  let receptionBookings = 0;
  let withReminder = 0;

  for (let i = 0; i < appointments.length; i++) {
    const a = appointments[i];

    if (a.status === 'no_show') {
      noShows++;
    }
    if (a.bookingMethod === 'online') {
      onlineBookings++;
    }
    if (a.bookingMethod === 'phone') {
      phoneBookings++;
    }
    if (a.bookingMethod === 'reception') {
      receptionBookings++;
    }
    if (a.reminderSent) {
      withReminder++;
    }
  }

  return {
    totalAppointments: total,
    noShowRate: total > 0 ? noShows / total : 0,
    onlineBookingRate: total > 0 ? onlineBookings / total : 0,
    phoneBookingRate: total > 0 ? phoneBookings / total : 0,
    receptionBookingRate: total > 0 ? receptionBookings / total : 0,
    reminderDeliveryRate: total > 0 ? withReminder / total : 0,
    patientSatisfactionScore: 0, // se completa con encuestas
    estimatedAnnualLossFromNoShows: noShows * estimatedLossPerNoShow,
  };
}

// ───────────────────────── DASHBOARD DE RR.HH. ─────────────────────────
// Alineado con CONTEXT.md: "dashboard de KPIs de RR.HH. que registre
// tiempo de contratación, rotación y absentismo por sede y perfil"

export interface HRDashboard {
  totalStaff: number;
  staffByRole: Record<string, number>;
  staffByClinic: Record<string, number>;
  openPositions: number;
  avgDaysToHire: number;
  avgAbsenteeismRate: number;
  staffWithExpiringCME: Staff[];
}

/** Genera un resumen de recursos humanos */
export function buildHRDashboard(staff: Staff[]): HRDashboard {
  // Usamos countBy con funciones tradicionales
  const byRole = countBy(staff, getStaffRole);
  const byClinic = countBy(staff, getStaffClinicId);

  // Extraemos días para contratar usando .map() con función tradicional
  // y filtramos usando la función isGreaterThanZero
  const daysToHire = staff.map(getDaysToHire).filter(isGreaterThanZero);

  // Filtramos staff en licencia
  const onLeave = staff.filter(isOnLeave);

  // Filtramos staff con CME por vencer
  const staffWithExpiringCME = staff.filter(hasExpiringCME);

  return {
    totalStaff: staff.length,
    staffByRole: byRole,
    staffByClinic: byClinic,
    openPositions: 0, // se completa con datos de recruitment
    avgDaysToHire: daysToHire.length > 0 ? average(daysToHire, averageIdentity) : 0,
    avgAbsenteeismRate: staff.length > 0 ? onLeave.length / staff.length : 0,
    staffWithExpiringCME: staffWithExpiringCME,
  };
}

// ───────────────────────── REPORTE EJECUTIVO ─────────────────────────

export interface WeeklyKPIs {
  appointmentVolume: number;
  noShowRate: number;
  claimDenialRate: number;
  totalRevenue: CurrencyAmount;
  revenueByClinic: Record<Id, CurrencyAmount>;
  patientSatisfaction: number;
  avgDocumentationTimeMin: number;
  avgDaysToHire: number;
}

/** Genera el reporte semanal para la dirección ejecutiva */
export function buildExecutiveReport(
  kpis: WeeklyKPIs,
  departmentMetrics: Metric[],
): ExecutiveReport {
  const now = new Date();
  // Fecha del lunes más reciente
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);

  const weekStart = monday.toISOString().split('T')[0];
  const generatedAt = `${weekStart}T07:00:00.000Z`;

  // Alertas de umbral — usamos funciones tradicionales en lugar de arrow functions
  const metricsWithAlert = departmentMetrics.filter(hasAlertTriggered);
  const thresholdAlerts: MetricAlert[] = metricsWithAlert.map(metricToAlert);

  return {
    id: `report-${weekStart}`,
    weekStart,
    generatedAt,
    kpis: {
      appointmentVolume: kpis.appointmentVolume,
      noShowRate: kpis.noShowRate,
      claimDenialRate: kpis.claimDenialRate,
      totalRevenue: kpis.totalRevenue,
      revenueByClinic: kpis.revenueByClinic,
      patientSatisfaction: kpis.patientSatisfaction,
      avgDocumentationTimeMin: kpis.avgDocumentationTimeMin,
      avgDaysToHire: kpis.avgDaysToHire,
    },
    thresholdAlerts,
  };
}

// ───────────────────────── TRANSFORMACIONES AUXILIARES ─────────────────────────

/** Calcula la pérdida anual estimada por no-shows */
export function estimateNoShowAnnualLoss(
  noShowRate: number,
  totalAnnualAppointments: number,
  avgRevenuePerAppointment: number = 150,
): number {
  return noShowRate * totalAnnualAppointments * avgRevenuePerAppointment;
}

/** Calcula el ahorro potencial al reducir la tasa de rechazo al benchmark del sector */
export function estimateDenialRateSavings(
  currentDenialRate: number,
  industryDenialRate: number,
  totalAnnualClaimedAmount: CurrencyAmount,
): CurrencyAmount {
  const excessDenials = currentDenialRate - industryDenialRate;
  return excessDenials * totalAnnualClaimedAmount;
}

/** Calcula el tiempo administrativo recuperable con IA */
export function estimateIASavings(
  staffCount: number,
  documentationTimeMinPerDay: number,
  workingDaysPerYear: number = 260,
): { minutesPerYear: number; hoursPerYear: number; fteRecovered: number } {
  const minutesPerYear = staffCount * documentationTimeMinPerDay * workingDaysPerYear;
  const hoursPerYear = minutesPerYear / 60;
  const fteRecovered = hoursPerYear / (workingDaysPerYear * 8);
  return { minutesPerYear, hoursPerYear, fteRecovered };
}

/** Convierte un rate (0-1) a porcentaje con formato */
export function formatRate(rate: number, decimals: number = 1): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}

/** Filtra métricas que han superado su umbral de alerta */
export function getTriggeredAlerts(metrics: Metric[]): MetricAlert[] {
  const exceededMetrics = metrics.filter(hasExceededThreshold);
  return exceededMetrics.map(metricExceededToAlert);
}

// ───────────────────────── FUNCIÓN AYUDANTE EXTRA ─────────────────────────

/** Función identidad para usar con average (devuelve el mismo número) */
function averageIdentity(d: number): number {
  return d;
}

// ───────────────────────── DASHBOARD DE CUMPLIMIENTO ─────────────────────────
// Alineado con CONTEXT.md: "dashboard centralizado de monitorización del cumplimiento
// que muestre patrones de acceso a datos en ambas jurisdicciones"

export interface ComplianceDashboard {
  totalRecords: number;
  recordsByJurisdiction: { HIPAA: number; UK_GDPR: number };
  pendingDSARs: number;
  criticalViolations: number;
  unresolvedViolations: number;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  averageRiskScore: number;
}

/** Genera un dashboard de cumplimiento normativo */
export function buildComplianceDashboard(records: ComplianceRecord[]): ComplianceDashboard {
  let hipaaCount = 0;
  let ukGdprCount = 0;
  let totalPendingDSARs = 0;
  let totalCriticalUnresolved = 0;
  let totalUnresolved = 0;
  let riskSum = 0;

  for (let i = 0; i < records.length; i++) {
    const r = records[i];

    // Contar por jurisdicción
    if (r.jurisdiction === 'HIPAA') {
      hipaaCount++;
    } else if (r.jurisdiction === 'UK_GDPR') {
      ukGdprCount++;
    }

    // Solicitudes de datos pendientes
    for (let j = 0; j < r.dataSubjectRequests.length; j++) {
      if (r.dataSubjectRequests[j].status === 'pending') {
        totalPendingDSARs++;
      }
    }

    // Violaciones
    for (let k = 0; k < r.potentialViolations.length; k++) {
      const v = r.potentialViolations[k];
      if (!v.resolved) {
        totalUnresolved++;
        if (v.severity === 'critical') {
          totalCriticalUnresolved++;
        }
      }
    }

    riskSum += r.riskScore;
  }

  const totalRecords = records.length;
  const avgRiskScore = totalRecords > 0 ? riskSum / totalRecords : 0;

  return {
    totalRecords,
    recordsByJurisdiction: { HIPAA: hipaaCount, UK_GDPR: ukGdprCount },
    pendingDSARs: totalPendingDSARs,
    criticalViolations: totalCriticalUnresolved,
    unresolvedViolations: totalUnresolved,
    overallRiskScore: avgRiskScore,
    overallRiskLevel: avgRiskScore >= 0.7 ? 'high' : avgRiskScore >= 0.4 ? 'medium' : 'low',
    averageRiskScore: avgRiskScore,
  };
}