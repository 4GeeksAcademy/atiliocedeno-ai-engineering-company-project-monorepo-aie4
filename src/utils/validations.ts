/**
 * HealthCore — Validations
 *
 * Validaciones de negocio para las entidades del dominio de HealthCore.
 * Verifica reglas de integridad, cumplimiento normativo y lógica de negocio.
 */

import type {
  Patient,
  Appointment,
  Claim,
  Staff,
  Clinic,
  ComplianceRecord,
  AppointmentStatus,
  Company,
  ClinicalNote,
  Notification,
  NotificationType,
  NotificationChannel,
  Recruitment,
  TrainingRecord,
  Metric,
  MetricCategory,
  Department,
  Payer,
  PayerType,
  DepartmentInfo,
  LegacySystem,
  ExecutiveReport,
} from '../types/models.js';

// ───────────────────────── FUNCIONES AYUDANTES ─────────────────────────
// Estas funciones se usan como "predicados" en .filter(), .find() y .some()
// para evitar usar arrow functions y hacer el código más legible.

/** Indica si una solicitud de datos (DSAR) está pendiente */
function isDSARPending(r: { status: string }): boolean {
  return r.status === 'pending';
}

/** Indica si una violación no está resuelta */
function isViolationUnresolved(v: { resolved: boolean }): boolean {
  return !v.resolved;
}

/** Indica si una violación es de gravedad crítica */
function isViolationCritical(v: { severity: string }): boolean {
  return v.severity === 'critical';
}

/** Indica si una violación es crítica y no está resuelta */
function isViolationCriticalAndUnresolved(v: { resolved: boolean; severity: string }): boolean {
  return !v.resolved && v.severity === 'critical';
}

/** Indica si una reclamación es duplicada (misma cita y pagador) respecto a una reclamación dada */
function isDuplicateClaim(claim: Claim): (c: Claim) => boolean {
  return function (c: Claim): boolean {
    return (
      c.appointmentId === claim.appointmentId &&
      c.payer === claim.payer &&
      c.id !== claim.id
    );
  };
}

/** Indica si una cita existente entra en conflicto de horario con una cita dada */
function hasScheduleConflict(appointment: Appointment): (a: Appointment) => boolean {
  return function (a: Appointment): boolean {
    return (
      a.providerId === appointment.providerId &&
      a.dateTime === appointment.dateTime &&
      a.status !== 'cancelled' &&
      a.status !== 'no_show' &&
      a.id !== appointment.id
    );
  };
}

// ───────────────────────── CONSTANTES DE VALIDACIÓN ─────────────────────────

const VALID_STATUSES: AppointmentStatus[] = ['scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'];
const MAX_DOCUMENTATION_TIME_MIN = 120;    // 2 horas máximas razonables
const MIN_APPOINTMENT_DURATION_MIN = 15;   // 15 minutos mínimo por cita
const MAX_DAYS_IN_ADVANCE = 365;           // 1 año máximo para agendar
const MIN_PATIENT_AGE = 0;                 // Recién nacido
const MAX_PATIENT_AGE = 150;               // Edad máxima razonable
const MAX_NOTE_CONTENT_LENGTH = 10000;     // 10k caracteres máximo para notas clínicas
const MAX_NOTIFICATION_BODY_LENGTH = 2000; // 2k caracteres máximo para cuerpo de notificación
const VALID_RECRUITMENT_STATUSES = ['open', 'in_progress', 'filled', 'cancelled'] as const;
const VALID_TRAINING_STATUSES = ['completed', 'pending', 'expired'] as const;
const VALID_METRIC_CATEGORIES = ['clinical', 'patient_experience', 'revenue', 'compliance', 'hr', 'technology'] as const;
const VALID_NOTIFICATION_TYPES = ['appointment_reminder', 'follow_up', 'claim_update', 'compliance_alert', 'hr_alert'] as const;
const VALID_NOTIFICATION_CHANNELS = ['sms', 'email', 'app'] as const;
const VALID_PAYER_TYPES = ['commercial_insurance', 'medicare', 'medicaid', 'private_pay', 'nhs'] as const;

// ───────────────────────── TIPOS DE RESULTADO ─────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
}

const validResult: ValidationResult = { valid: true, errors: [], warnings: [] };
const emptyErrors: ValidationError[] = [];
const emptyWarnings: ValidationWarning[] = [];

// ───────────────────────── VALIDACIONES DE PACIENTE ─────────────────────────

export function validatePatient(patient: Patient): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Nombre
  if (!patient.firstName?.trim()) {
    errors.push({ field: 'firstName', code: 'REQUIRED', message: 'El nombre del paciente es obligatorio' });
  }
  if (!patient.lastName?.trim()) {
    errors.push({ field: 'lastName', code: 'REQUIRED', message: 'El apellido del paciente es obligatorio' });
  }

  // Fecha de nacimiento
  if (!patient.dateOfBirth) {
    errors.push({ field: 'dateOfBirth', code: 'REQUIRED', message: 'La fecha de nacimiento es obligatoria' });
  } else {
    const dob = new Date(patient.dateOfBirth);
    if (isNaN(dob.getTime())) {
      errors.push({ field: 'dateOfBirth', code: 'INVALID_DATE', message: 'La fecha de nacimiento no es válida' });
    } else {
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < MIN_PATIENT_AGE) {
        errors.push({ field: 'dateOfBirth', code: 'FUTURE_DATE', message: 'La fecha de nacimiento no puede ser futura' });
      }
      if (age > MAX_PATIENT_AGE) {
        warnings.push({ field: 'dateOfBirth', code: 'UNUSUAL_AGE', message: `La edad calculada (${Math.round(age)}) supera el máximo esperado` });
      }
    }
  }

  // Clínica primaria
  if (!patient.primaryClinicId) {
    errors.push({ field: 'primaryClinicId', code: 'REQUIRED', message: 'La clínica primaria es obligatoria' });
  }

  // Consentimientos
  if (patient.country === 'US' && patient.hipaaConsent === false) {
    warnings.push({ field: 'hipaaConsent', code: 'MISSING_CONSENT', message: 'El paciente no ha otorgado consentimiento HIPAA' });
  }
  if (patient.country === 'UK' && patient.gdprConsent === false) {
    warnings.push({ field: 'gdprConsent', code: 'MISSING_CONSENT', message: 'El paciente no ha otorgado consentimiento UK GDPR' });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES DE CITA ─────────────────────────

export function validateAppointment(appointment: Appointment): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Campos obligatorios
  if (!appointment.patientId) {
    errors.push({ field: 'patientId', code: 'REQUIRED', message: 'El paciente es obligatorio' });
  }
  if (!appointment.clinicId) {
    errors.push({ field: 'clinicId', code: 'REQUIRED', message: 'La clínica es obligatoria' });
  }
  if (!appointment.providerId) {
    errors.push({ field: 'providerId', code: 'REQUIRED', message: 'El proveedor/clínico es obligatorio' });
  }

  // Estado
  if (!VALID_STATUSES.includes(appointment.status)) {
    errors.push({ field: 'status', code: 'INVALID_STATUS', message: `Estado inválido: ${appointment.status}. Válidos: ${VALID_STATUSES.join(', ')}` });
  }

  // Fecha y hora
  if (!appointment.dateTime) {
    errors.push({ field: 'dateTime', code: 'REQUIRED', message: 'La fecha y hora de la cita son obligatorias' });
  } else {
    const dt = new Date(appointment.dateTime);
    if (isNaN(dt.getTime())) {
      errors.push({ field: 'dateTime', code: 'INVALID_DATE', message: 'La fecha de la cita no es válida' });
    } else {
      const now = Date.now();
      const diffDays = (dt.getTime() - now) / (1000 * 60 * 60 * 24);

      // Citas en el pasado
      if (dt.getTime() < now && appointment.status === 'scheduled') {
        warnings.push({ field: 'dateTime', code: 'PAST_DATE', message: 'La cita está en el pasado pero aún marcada como programada' });
      }

      // Citas muy adelantadas
      if (diffDays > MAX_DAYS_IN_ADVANCE) {
        warnings.push({ field: 'dateTime', code: 'TOO_FAR_IN_ADVANCE', message: `La cita está a más de ${MAX_DAYS_IN_ADVANCE} días en el futuro` });
      }
    }
  }

  // Método de reserva válido
  if (!appointment.bookingMethod) {
    errors.push({ field: 'bookingMethod', code: 'REQUIRED', message: 'El método de reserva es obligatorio' });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES DE RECLAMACIÓN ─────────────────────────

export function validateClaim(claim: Claim): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!claim.patientId) {
    errors.push({ field: 'patientId', code: 'REQUIRED', message: 'El paciente es obligatorio' });
  }
  if (!claim.payer) {
    errors.push({ field: 'payer', code: 'REQUIRED', message: 'El pagador/aseguradora es obligatorio' });
  }
  if (claim.amount <= 0) {
    errors.push({ field: 'amount', code: 'INVALID_AMOUNT', message: 'El monto debe ser mayor a 0' });
  }
  if (!claim.billingCodes || claim.billingCodes.length === 0) {
    warnings.push({ field: 'billingCodes', code: 'MISSING_CODES', message: 'La reclamación no tiene códigos de facturación' });
  }

  // Validación de riesgo: si el score es alto, sugerir revisión
  if (claim.denialRiskScore !== undefined && claim.denialRiskScore > 0.7) {
    warnings.push({
      field: 'denialRiskScore',
      code: 'HIGH_DENIAL_RISK',
      message: `Riesgo de rechazo alto (${(claim.denialRiskScore * 100).toFixed(0)}%). Se recomienda revisión antes de enviar`,
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES DE PERSONAL ─────────────────────────

export function validateStaff(staff: Staff): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!staff.firstName?.trim()) {
    errors.push({ field: 'firstName', code: 'REQUIRED', message: 'El nombre es obligatorio' });
  }
  if (!staff.lastName?.trim()) {
    errors.push({ field: 'lastName', code: 'REQUIRED', message: 'El apellido es obligatorio' });
  }
  if (!staff.licenseNumber?.trim()) {
    errors.push({ field: 'licenseNumber', code: 'REQUIRED', message: 'El número de licencia es obligatorio para personal clínico' });
  }
  if (!staff.clinicId) {
    errors.push({ field: 'clinicId', code: 'REQUIRED', message: 'La clínica de asignación es obligatoria' });
  }

  // Validación de CME (formación médica continua)
  for (const cme of staff.cmeHours) {
    if (cme.status === 'expired') {
      warnings.push({
        field: 'cmeHours',
        code: 'CME_EXPIRED',
        message: `${staff.firstName} ${staff.lastName} tiene CME vencida para el año ${cme.year}`,
      });
    }
    if (cme.status === 'expiring_soon') {
      warnings.push({
        field: 'cmeHours',
        code: 'CME_EXPIRING',
        message: `La CME de ${staff.firstName} ${staff.lastName} vence pronto (${cme.expiryDate})`,
      });
    }
    if (cme.hoursCompleted < cme.hoursRequired) {
      warnings.push({
        field: 'cmeHours',
        code: 'CME_INCOMPLETE',
        message: `${staff.firstName} ${staff.lastName} tiene ${cme.hoursCompleted}/${cme.hoursRequired} horas CME completadas`,
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES DE CLÍNICA ─────────────────────────

export function validateClinic(clinic: Clinic): ValidationResult {
  const errors: ValidationError[] = [];

  if (!clinic.name?.trim()) {
    errors.push({ field: 'name', code: 'REQUIRED', message: 'El nombre de la clínica es obligatorio' });
  }
  if (!clinic.location?.trim()) {
    errors.push({ field: 'location', code: 'REQUIRED', message: 'La ubicación es obligatoria' });
  }
  if (!clinic.ehrSystem) {
    errors.push({ field: 'ehrSystem', code: 'REQUIRED', message: 'El sistema EHR es obligatorio' });
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}

// ───────────────────────── VALIDACIONES DE CUMPLIMIENTO ─────────────────────────

export function validateComplianceRecord(record: ComplianceRecord): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Cada acceso debe tener un motivo/documentación
  for (const log of record.accessLogs) {
    if (!log.reason?.trim()) {
      warnings.push({
        field: 'accessLogs',
        code: 'MISSING_ACCESS_REASON',
        message: `Acceso a datos por ${log.accessedBy} el ${log.accessedAt} no tiene motivo registrado`,
      });
    }
  }

  // Solicitudes de datos de pacientes (DSAR) pendientes
  const pendingDSARs = record.dataSubjectRequests.filter(isDSARPending);
  if (pendingDSARs.length > 0) {
    warnings.push({
      field: 'dataSubjectRequests',
      code: 'PENDING_DSAR',
      message: `Hay ${pendingDSARs.length} solicitudes de datos de pacientes (DSAR) pendientes`,
    });
  }

  // Violaciones sin resolver
  const unresolved = record.potentialViolations.filter(isViolationUnresolved);
  if (unresolved.length > 0) {
    const criticalCount = unresolved.filter(isViolationCritical).length;
    if (criticalCount > 0) {
      errors.push({
        field: 'potentialViolations',
        code: 'CRITICAL_VIOLATIONS',
        message: `Hay ${criticalCount} violación(es) crítica(s) de cumplimiento sin resolver`,
      });
    }
    warnings.push({
      field: 'potentialViolations',
      code: 'UNRESOLVED_VIOLATIONS',
      message: `Hay ${unresolved.length} violación(es) de cumplimiento sin resolver (${criticalCount} crítica(s))`,
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES TRANSVERSALES ─────────────────────────

export interface CrossValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Verifica que una cita no tenga reclamaciones duplicadas (misma cita, mismo pagador)
 */
export function validateNoDuplicateClaims(
  claim: Claim,
  existingClaims: Claim[],
): CrossValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const duplicate = existingClaims.find(isDuplicateClaim(claim));

  if (duplicate) {
    errors.push(
      `Ya existe una reclamación (${duplicate.id}) para la cita ${claim.appointmentId} con el pagador ${claim.payer}`,
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Verifica que el paciente asignado a una cita pertenezca a la misma clínica (o al menos al mismo país)
 */
export function validatePatientClinicMatch(
  patient: Patient,
  clinic: Clinic,
): CrossValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (patient.primaryClinicId !== clinic.id) {
    warnings.push(
      `El paciente ${patient.firstName} ${patient.lastName} pertenece a otra clínica (${patient.primaryClinicId}), no a ${clinic.id}`,
    );
  }
  if (patient.country !== clinic.country) {
    errors.push(
      `El paciente está en ${patient.country} pero la clínica está en ${clinic.country}. No se puede agendar`,
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Verifica disponibilidad del clínico en el horario de la cita
 */
export function validateProviderAvailability(
  appointment: Appointment,
  existingAppointments: Appointment[],
): CrossValidationResult {
  const errors: string[] = [];

  const conflicting = existingAppointments.find(hasScheduleConflict(appointment));

  if (conflicting) {
    errors.push(
      `El proveedor ${appointment.providerId} ya tiene una cita (${conflicting.id}) en el mismo horario`,
    );
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}

// ───────────────────────── HELPERS ─────────────────────────

export function isValidStatus(status: string): status is AppointmentStatus {
  return (VALID_STATUSES as string[]).includes(status);
}

// ───────────────────────── VALIDACIONES DE EMPRESA ─────────────────────────

export function validateCompany(company: Company): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!company.name?.trim()) {
    errors.push({ field: 'name', code: 'REQUIRED', message: 'El nombre de la empresa es obligatorio' });
  }
  if (!company.headquarters?.trim()) {
    errors.push({ field: 'headquarters', code: 'REQUIRED', message: 'La sede central es obligatoria' });
  }
  if (company.foundingYear > new Date().getFullYear()) {
    errors.push({ field: 'foundingYear', code: 'FUTURE_DATE', message: 'El año de fundación no puede ser futuro' });
  }
  if (company.foundingYear < 1800) {
    warnings.push({ field: 'foundingYear', code: 'UNUSUAL_YEAR', message: 'El año de fundación parece inusualmente antiguo' });
  }
  if (!company.countries || company.countries.length === 0) {
    errors.push({ field: 'countries', code: 'REQUIRED', message: 'Al menos un país de operación es obligatorio' });
  }
  if (company.annualRevenue <= 0) {
    warnings.push({ field: 'annualRevenue', code: 'INVALID_REVENUE', message: 'Los ingresos anuales deberían ser mayores a 0' });
  }
  if (company.totalEmployees <= 0) {
    warnings.push({ field: 'totalEmployees', code: 'INVALID_COUNT', message: 'El número de empleados debería ser mayor a 0' });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES DE NOTA CLÍNICA ─────────────────────────

export function validateClinicalNote(note: ClinicalNote): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!note.patientId) {
    errors.push({ field: 'patientId', code: 'REQUIRED', message: 'El paciente es obligatorio' });
  }
  if (!note.providerId) {
    errors.push({ field: 'providerId', code: 'REQUIRED', message: 'El proveedor es obligatorio' });
  }
  if (!note.clinicId) {
    errors.push({ field: 'clinicId', code: 'REQUIRED', message: 'La clínica es obligatoria' });
  }
  if (!note.ehrSystem) {
    errors.push({ field: 'ehrSystem', code: 'REQUIRED', message: 'El sistema EHR es obligatorio' });
  }
  if (!note.content?.trim()) {
    errors.push({ field: 'content', code: 'REQUIRED', message: 'El contenido de la nota clínica es obligatorio' });
  } else if (note.content.length > MAX_NOTE_CONTENT_LENGTH) {
    warnings.push({ field: 'content', code: 'TOO_LONG', message: `La nota clínica excede los ${MAX_NOTE_CONTENT_LENGTH} caracteres` });
  }
  if (!note.date) {
    errors.push({ field: 'date', code: 'REQUIRED', message: 'La fecha de la nota es obligatoria' });
  } else {
    const d = new Date(note.date);
    if (isNaN(d.getTime())) {
      errors.push({ field: 'date', code: 'INVALID_DATE', message: 'La fecha de la nota no es válida' });
    }
  }
  if (note.documentationTimeMin < 0) {
    errors.push({ field: 'documentationTimeMin', code: 'INVALID_VALUE', message: 'El tiempo de documentación no puede ser negativo' });
  } else if (note.documentationTimeMin > MAX_DOCUMENTATION_TIME_MIN) {
    warnings.push({ field: 'documentationTimeMin', code: 'HIGH_DOC_TIME', message: `El tiempo de documentación (${note.documentationTimeMin} min) supera el máximo recomendado` });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES DE NOTIFICACIÓN ─────────────────────────

export function validateNotification(notification: Notification): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!VALID_NOTIFICATION_TYPES.includes(notification.type as typeof VALID_NOTIFICATION_TYPES[number])) {
    errors.push({ field: 'type', code: 'INVALID_TYPE', message: `Tipo de notificación inválido: ${notification.type}` });
  }
  if (!VALID_NOTIFICATION_CHANNELS.includes(notification.channel as typeof VALID_NOTIFICATION_CHANNELS[number])) {
    errors.push({ field: 'channel', code: 'INVALID_CHANNEL', message: `Canal de notificación inválido: ${notification.channel}` });
  }
  if (!notification.recipientId) {
    errors.push({ field: 'recipientId', code: 'REQUIRED', message: 'El destinatario es obligatorio' });
  }
  if (!notification.recipientContact?.trim()) {
    errors.push({ field: 'recipientContact', code: 'REQUIRED', message: 'El contacto del destinatario es obligatorio' });
  }
  if (!notification.subject?.trim()) {
    errors.push({ field: 'subject', code: 'REQUIRED', message: 'El asunto es obligatorio' });
  }
  if (!notification.body?.trim()) {
    errors.push({ field: 'body', code: 'REQUIRED', message: 'El cuerpo de la notificación es obligatorio' });
  } else if (notification.body.length > MAX_NOTIFICATION_BODY_LENGTH) {
    warnings.push({ field: 'body', code: 'TOO_LONG', message: `El cuerpo de la notificación excede los ${MAX_NOTIFICATION_BODY_LENGTH} caracteres` });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES DE RECLUTAMIENTO ─────────────────────────

export function validateRecruitment(recruitment: Recruitment): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!recruitment.positionTitle?.trim()) {
    errors.push({ field: 'positionTitle', code: 'REQUIRED', message: 'El título del puesto es obligatorio' });
  }
  if (!recruitment.clinicId) {
    errors.push({ field: 'clinicId', code: 'REQUIRED', message: 'La clínica es obligatoria' });
  }
  if (!VALID_RECRUITMENT_STATUSES.includes(recruitment.status as typeof VALID_RECRUITMENT_STATUSES[number])) {
    errors.push({ field: 'status', code: 'INVALID_STATUS', message: `Estado de reclutamiento inválido: ${recruitment.status}` });
  }
  if (recruitment.daysToFill < 0) {
    errors.push({ field: 'daysToFill', code: 'INVALID_VALUE', message: 'Los días para cubrir no pueden ser negativos' });
  }
  if (recruitment.daysToFill > 90 && recruitment.status !== 'cancelled') {
    warnings.push({ field: 'daysToFill', code: 'LONG_TIME_TO_FILL', message: `El puesto "${recruitment.positionTitle}" lleva ${recruitment.daysToFill} días sin cubrir` });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES DE REGISTRO DE FORMACIÓN ─────────────────────────

export function validateTrainingRecord(record: TrainingRecord): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!record.staffId) {
    errors.push({ field: 'staffId', code: 'REQUIRED', message: 'El empleado es obligatorio' });
  }
  if (!record.trainingType?.trim()) {
    errors.push({ field: 'trainingType', code: 'REQUIRED', message: 'El tipo de formación es obligatorio' });
  }
  if (!VALID_TRAINING_STATUSES.includes(record.status as typeof VALID_TRAINING_STATUSES[number])) {
    errors.push({ field: 'status', code: 'INVALID_STATUS', message: `Estado de formación inválido: ${record.status}` });
  }
  if (record.expiryDate) {
    const expiry = new Date(record.expiryDate);
    if (!isNaN(expiry.getTime()) && expiry < new Date()) {
      warnings.push({ field: 'expiryDate', code: 'EXPIRY_PAST', message: `La formación "${record.trainingType}" está vencida desde ${record.expiryDate}` });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES DE PAGADOR ─────────────────────────

export function validatePayer(payer: Payer): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!payer.name?.trim()) {
    errors.push({ field: 'name', code: 'REQUIRED', message: 'El nombre del pagador es obligatorio' });
  }
  if (!VALID_PAYER_TYPES.includes(payer.type as typeof VALID_PAYER_TYPES[number])) {
    errors.push({ field: 'type', code: 'INVALID_TYPE', message: `Tipo de pagador inválido: ${payer.type}` });
  }
  if (!payer.country) {
    errors.push({ field: 'country', code: 'REQUIRED', message: 'El país del pagador es obligatorio' });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES DE DEPARTAMENTO ─────────────────────────

export function validateDepartmentInfo(dept: DepartmentInfo): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!dept.name?.trim()) {
    errors.push({ field: 'name', code: 'REQUIRED', message: 'El nombre del departamento es obligatorio' });
  }
  if (!dept.headName?.trim()) {
    errors.push({ field: 'headName', code: 'REQUIRED', message: 'El nombre del responsable es obligatorio' });
  }
  if (!dept.description?.trim()) {
    errors.push({ field: 'description', code: 'REQUIRED', message: 'La descripción del departamento es obligatoria' });
  }
  if (!dept.needs || dept.needs.length === 0) {
    warnings.push({ field: 'needs', code: 'NO_NEEDS', message: `El departamento "${dept.name}" no tiene necesidades registradas` });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES DE MÉTRICA ─────────────────────────

export function validateMetric(metric: Metric): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!metric.name?.trim()) {
    errors.push({ field: 'name', code: 'REQUIRED', message: 'El nombre de la métrica es obligatorio' });
  }
  if (!VALID_METRIC_CATEGORIES.includes(metric.category as typeof VALID_METRIC_CATEGORIES[number])) {
    errors.push({ field: 'category', code: 'INVALID_CATEGORY', message: `Categoría de métrica inválida: ${metric.category}` });
  }
  if (metric.target <= 0) {
    warnings.push({ field: 'target', code: 'INVALID_TARGET', message: 'El objetivo de la métrica debería ser mayor a 0' });
  }
  if (metric.thresholdAlert !== undefined && metric.thresholdAlert <= 0) {
    warnings.push({ field: 'thresholdAlert', code: 'INVALID_THRESHOLD', message: 'El umbral de alerta debería ser mayor a 0' });
  }
  if (metric.alertTriggered && !metric.thresholdAlert) {
    warnings.push({ field: 'alertTriggered', code: 'ALERT_NO_THRESHOLD', message: 'La alerta está activada pero no hay umbral definido' });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES DE SISTEMA LEGADO ─────────────────────────

export function validateLegacySystem(system: LegacySystem): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!system.name?.trim()) {
    errors.push({ field: 'name', code: 'REQUIRED', message: 'El nombre del sistema es obligatorio' });
  }
  if (!system.purpose?.trim()) {
    errors.push({ field: 'purpose', code: 'REQUIRED', message: 'El propósito del sistema es obligatorio' });
  }
  if (!system.country) {
    errors.push({ field: 'country', code: 'REQUIRED', message: 'El país del sistema es obligatorio' });
  }
  if (system.type === 'spreadsheet' || system.type === 'manual') {
    warnings.push({ field: 'type', code: 'MANUAL_SYSTEM', message: `"${system.name}" es un sistema ${system.type}. Se recomienda migrar a una solución digital` });
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ───────────────────────── VALIDACIONES TRANSVERSALES ADICIONALES ─────────────────────────

/**
 * Verifica que el pagador de una reclamación opere en el mismo país que la clínica
 */
export function validateClaimPayerCountryMatch(
  claim: Claim,
  clinic: Clinic,
  payer: Payer,
): CrossValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (clinic.country !== payer.country) {
    errors.push(
      `La clínica "${clinic.name}" está en ${clinic.country} pero el pagador "${payer.name}" opera en ${payer.country}`,
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Verifica que un empleado (staff) tenga la formación en cumplimiento necesaria según su país
 */
export function validateStaffComplianceByCountry(
  staff: Staff,
  complianceRecord?: ComplianceRecord,
): CrossValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!staff.complianceTrainingCompleted) {
    warnings.push(
      `${staff.firstName} ${staff.lastName} (${staff.role}) no ha completado la formación en cumplimiento`,
    );
  }

  if (complianceRecord && complianceRecord.potentialViolations.some(isViolationCriticalAndUnresolved)) {
    warnings.push(
      `${staff.firstName} ${staff.lastName} tiene violaciones críticas de cumplimiento sin resolver`,
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Verifica que una notificación tenga un destinatario válido según el canal
 */
export function validateNotificationRecipient(
  notification: Notification,
  patient?: Patient,
  staff?: Staff,
): CrossValidationResult {
  const errors: string[] = [];

  if (notification.type === 'appointment_reminder' && !patient) {
    errors.push('Las notificaciones de recordatorio de cita requieren un paciente válido');
  }
  if (notification.type === 'hr_alert' && !staff) {
    errors.push('Las notificaciones de RR.HH. requieren un empleado válido');
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}