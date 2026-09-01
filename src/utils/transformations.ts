/**
 * HealthCore — Transformations
 *
 * Funciones de agregación y generación de reportes para datos de HealthCore.
 * Trabaja sobre los modelos definidos en types/models.ts.
 */

import type {
  Appointment,
  Claim,
  Clinic,
  Staff,
  Metric,
  ExecutiveReport,
  MetricAlert,
  Id,
  Department,
  CurrencyAmount,
} from '../types/models.js';
import { groupBy, sum, average, countBy } from './collections.js';

// ───────────────────────── AGREGACIONES CLÍNICAS ─────────────────────────

export interface ClinicalSummary {
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
export function buildClinicalSummary(
  appointments: Appointment[],
): ClinicalSummary {
  const total = appointments.length;
  const noShows = appointments.filter((a) => a.status === 'no_show').length;
  const completed = appointments.filter((a) => a.status === 'completed').length;
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length;

  return {
    totalAppointments: total,
    completedAppointments: completed,
    noShows,
    noShowRate: total > 0 ? noShows / total : 0,
    cancelled,
    appointmentsByType: countBy(appointments, (a) => a.type),
    appointmentsByClinic: countBy(appointments, (a) => a.clinicId),
    avgDocumentationTimeMin: 0, // se completa con datos de notas clínicas
  };
}

// ───────────────────────── AGREGACIONES DE FACTURACIÓN ─────────────────────────

export interface RevenueSummary {
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
export function buildRevenueSummary(claims: Claim[]): RevenueSummary {
  const denied = claims.filter((c) => c.status === 'denied');
  const paid = claims.filter((c) => c.status === 'paid');
  const unpaid = claims.filter((c) => c.status === 'unpaid');

  // Agrupar denial reasons
  const denialGroups = groupBy(denied, (c) => c.denialReason ?? 'unknown');
  const topDenialReasons = Object.entries(denialGroups)
    .map(([reason, items]) => ({
      reason,
      count: items.length,
      amount: sum(items, (c) => c.amount),
    }))
    .sort((a, b) => b.count - a.count);

  // Tasa de rechazo por pagador
  const byPayer = groupBy(claims, (c) => c.payer);
  const denialRateByPayer: Record<string, number> = {};
  for (const [payer, items] of Object.entries(byPayer)) {
    const deniedCount = items.filter((c) => c.status === 'denied').length;
    denialRateByPayer[payer] = items.length > 0 ? deniedCount / items.length : 0;
  }

  // Agrupar por clínica y sumar montos pagados
  const paidByClinic = groupBy(paid, (c) => c.clinicId);
  const revenueByClinic: Record<string, number> = {};
  for (const [clinicId, claimList] of Object.entries(paidByClinic)) {
    revenueByClinic[clinicId] = sum(claimList, (c) => c.amount);
  }

  return {
    totalClaimed: sum(claims, (c) => c.amount),
    totalPaid: sum(paid, (c) => c.amount),
    totalDenied: sum(denied, (c) => c.amount),
    totalUnpaid: sum(unpaid, (c) => c.amount),
    denialRate: claims.length > 0 ? denied.length / claims.length : 0,
    denialRateByPayer,
    topDenialReasons,
    revenueByClinic,
  };
}

// ───────────────────────── AGREGACIONES DE EXPERIENCIA DEL PACIENTE ─────────────────────────

export interface PatientExperienceSummary {
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
export function buildPatientExperienceSummary(
  appointments: Appointment[],
  estimatedLossPerNoShow: number = 150, // valor estimado por cita perdida
): PatientExperienceSummary {
  const total = appointments.length;
  const noShows = appointments.filter((a) => a.status === 'no_show').length;
  const onlineBookings = appointments.filter((a) => a.bookingMethod === 'online').length;
  const phoneBookings = appointments.filter((a) => a.bookingMethod === 'phone').length;
  const receptionBookings = appointments.filter((a) => a.bookingMethod === 'reception').length;
  const withReminder = appointments.filter((a) => a.reminderSent).length;

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

// ───────────────────────── AGREGACIONES DE RR.HH. ─────────────────────────

export interface HRSummary {
  totalStaff: number;
  staffByRole: Record<string, number>;
  staffByClinic: Record<string, number>;
  openPositions: number;
  avgDaysToHire: number;
  avgAbsenteeismRate: number;
  staffWithExpiringCME: Staff[];
}

/** Genera un resumen de recursos humanos */
export function buildHRSummary(staff: Staff[]): HRSummary {
  const byRole = countBy(staff, (s) => s.role);
  const byClinic = countBy(staff, (s) => s.clinicId);

  const daysToHire = staff
    .map((s) => s.daysToHire)
    .filter((d) => d > 0);

  const onLeave = staff.filter((s) => s.employmentStatus === 'on_leave');

  return {
    totalStaff: staff.length,
    staffByRole: byRole,
    staffByClinic: byClinic,
    openPositions: 0, // se completa con datos de recruitment
    avgDaysToHire: daysToHire.length > 0 ? average(daysToHire, (d) => d) : 0,
    avgAbsenteeismRate: staff.length > 0 ? onLeave.length / staff.length : 0,
    staffWithExpiringCME: staff.filter(
      (s) => s.cmeHours.some((c) => c.status === 'expiring_soon'),
    ),
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

  // Alertas de umbral
  const thresholdAlerts: MetricAlert[] = departmentMetrics
    .filter((m) => m.alertTriggered)
    .map((m) => ({
      metricName: m.name,
      currentValue: m.value,
      threshold: m.thresholdAlert ?? m.target,
      severity: m.value > (m.thresholdAlert ?? m.target) ? 'critical' : 'warning',
      department: m.department,
      message: `[${m.department}] ${m.name} = ${m.value}${m.unit} (umbral: ${m.thresholdAlert ?? m.target}${m.unit})`,
    }));

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
  return metrics
    .filter((m) => m.thresholdAlert !== undefined && m.value > m.thresholdAlert)
    .map((m) => ({
      metricName: m.name,
      currentValue: m.value,
      threshold: m.thresholdAlert!,
      department: m.department,
      severity: m.value > m.thresholdAlert! * 1.25 ? 'critical' : 'warning',
      message: `${m.name} ha superado el umbral: ${m.value}${m.unit} > ${m.thresholdAlert}${m.unit}`,
    }));
}