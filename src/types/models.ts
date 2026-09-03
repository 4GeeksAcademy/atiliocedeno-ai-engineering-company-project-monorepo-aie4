/**
 * HealthCore Domain Models
 *
 * Entidades y campos extraídos del contexto de negocio de HealthCore.
 * Basado en CONTEXT.es.md / CONTEXT.md
 */

// ───────────────────────── UTILITY TYPES ─────────────────────────

export type Id = string;
export type Country = 'US' | 'UK';
export type CurrencyAmount = number; // en USD

// ───────────────────────── 1. EMPRESA ─────────────────────────

export interface Company {
  id: Id;
  name: string;
  foundingYear: number;
  headquarters: string;
  countries: Country[];
  annualRevenue: CurrencyAmount;
  totalEmployees: number;
  totalClinics: number;
  clinicsUS: number;
  clinicsUK: number;
  sameDayAppointments: boolean;
  extendedHours: boolean;
  digitalUnit: string;
}

// ───────────────────────── 2. CLÍNICA / SEDE ─────────────────────────

export type EHRSystem = 'US_EHR' | 'UK_EHR';

export type ClinicService = 'primary_care' | 'specialist' | 'chronic_management' | 'preventive';

export interface Clinic {
  id: Id;
  name: string;
  location: string;
  city: string;           // Ciudad (ej: "Austin")
  state: string;          // Estado (ej: "TX")
  country: Country;
  openingHours: string;   // Horario de atención (ej: "Lun–Vie 7am–8pm · Sáb 9am–3pm")
  ehrSystem: EHRSystem;
  phone: string;
  bilingualStaff: boolean;
  services: ClinicService[];
  // Métricas operacionales
  appointmentVolume?: number;
  noShowRate?: number;
  patientFlow?: number;
  documentationTimeMin?: number;
  claimDenialRate?: number;
  revenue?: CurrencyAmount;
  patientSatisfaction?: number;
}

// ───────────────────────── 3. PACIENTE ─────────────────────────

export type PatientLanguage = 'en' | 'es';
export type ContactMethod = 'sms' | 'email' | 'app';

export interface Patient {
  id: Id;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  language: PatientLanguage;
  preferredContact: ContactMethod[];
  country: Country;
  primaryClinicId: Id;
  // Protección de datos
  hipaaConsent?: boolean;
  gdprConsent?: boolean;
  dataAccessRequests?: DataAccessRequest[];
  createdAt: string;
  updatedAt: string;
}

// ───────────────────────── 3b. CONSULTA DE PACIENTE (FORMULARIO WEB) ─────────────────────────
// Basado en CONTEXT.es.md — Hito 1: formulario de consulta para pacientes

export type PreferredLanguage = 'English' | 'Spanish';
export type PreferredTimeSlot = 'Morning' | 'Afternoon' | 'Evening';

export type ServiceType =
  | 'Primary Care'
  | 'Chronic Disease Management'
  | 'Specialist Consultation'
  | 'Preventive Health'
  | 'Women\'s Health'
  | 'Paediatric Care'
  | 'Mental Health';

export interface PatientInquiry {
  firstName: string;              // first_name — 2-50 chars, solo letras
  lastName: string;               // last_name — 2-50 chars, solo letras
  dateOfBirth: string;            // date_of_birth — no futura, 0-120 años
  email: string;                  // email — formato válido
  phone: string;                  // phone — debe comenzar con + y código de país
  preferredLanguage: PreferredLanguage;  // preferred_language — English | Spanish
  preferredClinic: string;        // preferred_clinic — nombre exacto de la tabla de ubicaciones
  preferredDate: string;          // preferred_date — ≥1 día hábil, ≤60 días
  preferredTime: PreferredTimeSlot;      // preferred_time — Morning | Afternoon | Evening
  serviceType: ServiceType;       // service_type — 7 opciones exactas
  newPatient: boolean;            // new_patient — Yes | No
  hasInsurance: boolean;          // has_insurance — Yes | No
  insuranceProvider?: string;     // insurance_provider — obligatorio si has_insurance=Yes, máx 100 chars
  insuranceMemberId?: string;     // insurance_member_id — obligatorio si has_insurance=Yes, 6-20 alfanumérico
  healthConcern: string;          // health_concern — 20-500 chars
  contactConsent: boolean;        // contact_consent — debe marcarse
  patientId?: string;             // patient_id — solo si new_patient=No, formato HC-XXXXXX
}

// ───────────────────────── 4. CITA ─────────────────────────

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';
export type AppointmentType = 'primary_care' | 'specialist' | 'chronic_management' | 'preventive';
export type BookingMethod = 'phone' | 'online' | 'reception';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Appointment {
  id: Id;
  patientId: Id;
  clinicId: Id;
  providerId: Id;
  dateTime: string;
  status: AppointmentStatus;
  type: AppointmentType;
  bookingMethod: BookingMethod;
  // Recordatorios
  reminderSent: boolean;
  reminderChannel?: NotificationChannel;
  reminderSentAt?: string;
  // Predicción de no-show
  noShowRiskScore?: number;
  noShowRiskLevel?: RiskLevel;
  // Seguimiento
  followUpRequired?: boolean;
  followUpCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ───────────────────────── 5. PERSONAL / EMPLEADO ─────────────────────────

export type StaffRole = 'physician' | 'advanced_practice_nurse' | 'nurse' | 'assistant' | 'admin';
export type EmploymentStatus = 'active' | 'on_leave' | 'terminated';

export interface Staff {
  id: Id;
  firstName: string;
  lastName: string;
  role: StaffRole;
  clinicId: Id;
  country: Country;
  licenseNumber: string;
  complianceTrainingCompleted: boolean;
  complianceTrainingDate?: string;
  // Contratación y onboarding
  hireDate: string;
  daysToHire: number;
  onboardingStatus: OnboardingStage;
  // Formación médica continua (CME)
  cmeHours: CMEHours[];
  // Ausencias
  vacations: Absence[];
  sickLeave: Absence[];
  employmentStatus: EmploymentStatus;
  createdAt: string;
  updatedAt: string;
}

export type OnboardingStage = 'pending' | 'credentials_check' | 'training' | 'completed';

export interface CMEHours {
  year: number;
  hoursRequired: number;
  hoursCompleted: number;
  expiryDate: string;
  status: 'current' | 'expiring_soon' | 'expired';
}

export interface Absence {
  startDate: string;
  endDate: string;
  type: 'vacation' | 'sick_leave' | 'other';
  approved: boolean;
}

// ───────────────────────── 6. HISTORIA CLÍNICA ELECTRÓNICA (EHR) ─────────────────────────

export interface ClinicalNote {
  id: Id;
  patientId: Id;
  providerId: Id;
  clinicId: Id;
  ehrSystem: EHRSystem;
  date: string;
  content: string;
  diagnosisCodes: string[];
  billingCodes: string[];
  documentationTimeMin: number;
  accessLog: AccessLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AccessLogEntry {
  accessedBy: Id;
  accessedAt: string;
  action: 'read' | 'write' | 'update' | 'delete';
  reason: string;
}

// ───────────────────────── 7. RECLAMACIÓN / FACTURACIÓN ─────────────────────────

export type PayerType = 'commercial_insurance' | 'medicare' | 'medicaid' | 'private_pay' | 'nhs';
export type ClaimStatus = 'draft' | 'submitted' | 'accepted' | 'denied' | 'paid' | 'unpaid';

export interface Claim {
  id: Id;
  patientId: Id;
  clinicId: Id;
  appointmentId: Id;
  payer: PayerType;
  payerName: string;
  billingCodes: string[];
  amount: CurrencyAmount;
  submittedAt: string;
  status: ClaimStatus;
  denialReason?: string;
  denialCategory?: string;
  // IA: riesgo y revisión
  denialRiskScore?: number;
  denialRiskLevel?: RiskLevel;
  aiReviewFlagged?: boolean;
  // Seguimiento
  followUpStatus?: 'pending' | 'in_progress' | 'resolved';
  followUpActions?: FollowUpAction[];
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpAction {
  action: string;
  assignedTo: Id;
  dueDate: string;
  completedAt?: string;
  notes?: string;
}

// ───────────────────────── 8. PAGADOR ─────────────────────────

export interface Payer {
  id: Id;
  name: string;
  type: PayerType;
  country: Country;
  contractTerms?: string;
  claimsHistory?: Id[];
}

// ───────────────────────── 9. CUMPLIMIENTO ─────────────────────────

export type Jurisdiction = 'HIPAA' | 'UK_GDPR';

export interface ComplianceRecord {
  id: Id;
  jurisdiction: Jurisdiction;
  patientId: Id;
  clinicId: Id;
  accessLogs: AccessLogEntry[];
  auditTrail: AuditEntry[];
  // Solicitudes de datos del paciente (DSAR)
  dataSubjectRequests: DataAccessRequest[];
  // Puntuación de riesgo
  riskScore: number;
  riskLevel: RiskLevel;
  potentialViolations: PotentialViolation[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  timestamp: string;
  userId: Id;
  action: string;
  resourceType: string;
  resourceId: Id;
  details: string;
}

export interface DataAccessRequest {
  id: Id;
  patientId: Id;
  jurisdiction: Jurisdiction;
  requestDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'denied';
  completedDate?: string;
  compiledData?: string;
}

export interface PotentialViolation {
  detectedAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolved: boolean;
  resolvedAt?: string;
}

// ───────────────────────── 10. RECURSOS HUMANOS ─────────────────────────

export interface Recruitment {
  id: Id;
  positionTitle: string;
  role: StaffRole;
  clinicId: Id;
  country: Country;
  postedDate: string;
  filledDate?: string;
  daysToFill: number;
  status: 'open' | 'in_progress' | 'filled' | 'cancelled';
}

export interface TrainingRecord {
  id: Id;
  staffId: Id;
  trainingType: string;
  completedDate: string;
  expiryDate?: string;
  status: 'completed' | 'pending' | 'expired';
  notes?: string;
}

// ───────────────────────── 11. KPIs Y MÉTRICAS ─────────────────────────

export type MetricCategory = 'clinical' | 'patient_experience' | 'revenue' | 'compliance' | 'hr' | 'technology';

export interface Metric {
  id: Id;
  department: Department;
  category: MetricCategory;
  name: string;
  value: number;
  unit: string;
  target: number;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  timestamp: string;
  thresholdAlert?: number;
  alertTriggered?: boolean;
}

// ───────────────────────── 12. NOTIFICACIONES ─────────────────────────

export type NotificationChannel = 'sms' | 'email' | 'app';

export interface Notification {
  id: Id;
  type: NotificationType;
  channel: NotificationChannel;
  recipientId: Id;
  recipientContact: string;
  subject: string;
  body: string;
  sentAt?: string;
  delivered: boolean;
  readAt?: string;
  relatedEntityId?: Id;
}

export type NotificationType = 'appointment_reminder' | 'follow_up' | 'claim_update' | 'compliance_alert' | 'hr_alert';

// ───────────────────────── 13. DEPARTAMENTOS ─────────────────────────

export type Department =
  | 'clinical_operations'
  | 'patient_experience'
  | 'revenue_cycle'
  | 'compliance'
  | 'people_workforce'
  | 'technology'
  | 'executive';

export interface DepartmentInfo {
  id: Department;
  name: string;
  headName: string;
  headTitle: string;
  headLocation: string;
  staffCount?: number;
  description: string;
  needs: string[];
}

// ───────────────────────── 14. SISTEMAS LEGADO ─────────────────────────

export interface LegacySystem {
  id: Id;
  name: string;
  purpose: string;
  country: Country;
  type: 'ehr' | 'billing' | 'scheduling' | 'spreadsheet' | 'manual';
  description: string;
}

// ───────────────────────── 15. REPORTES EJECUTIVOS ─────────────────────────

export interface ExecutiveReport {
  id: Id;
  weekStart: string;
  generatedAt: string;
  kpis: {
    appointmentVolume: number;
    noShowRate: number;
    claimDenialRate: number;
    totalRevenue: CurrencyAmount;
    revenueByClinic: Record<Id, CurrencyAmount>;
    patientSatisfaction: number;
    avgDocumentationTimeMin: number;
    avgDaysToHire: number;
  };
  thresholdAlerts: MetricAlert[];
}

export interface MetricAlert {
  metricName: string;
  currentValue: number;
  threshold: number;
  severity: 'warning' | 'critical';
  department: Department;
  clinicId?: Id;
  message: string;
}

// ───────────────────────── ENUM CONSTANTS ─────────────────────────

export const DEPARTMENTS: Record<Department, DepartmentInfo> = {
  clinical_operations: {
    id: 'clinical_operations',
    name: 'Operaciones Clínicas',
    headName: 'Dr. Marcus Reid',
    headTitle: 'Director de Operaciones Clínicas',
    headLocation: 'Austin, TX',
    staffCount: 120,
    description: 'Supervisa al personal clínico en las 12 sedes. Cada clínica opera de forma relativamente independiente, con sus propios procesos y su propio sistema de historia clínica electrónica',
    needs: [
      'Una API unificada de historia clínica que exponga datos de ambos sistemas EHR',
      'Documentación clínica asistida por IA para reducir el tiempo administrativo',
      'Visibilidad del historial del paciente entre sedes',
      'Un dashboard de operaciones clínicas que muestre volumen de citas, flujo de pacientes y tiempo de documentación por sede',
    ],
  },
  patient_experience: {
    id: 'patient_experience',
    name: 'Experiencia del Paciente y Acceso',
    headName: 'Priya Nair',
    headTitle: 'Responsable de Experiencia del Paciente',
    headLocation: 'Londres',
    description: 'Gestiona todo lo que ocurre antes y después del encuentro clínico: reservar citas, recordar a los pacientes, hacer seguimiento y garantizar que el paciente tenga una experiencia fluida',
    needs: [
      'Una plataforma de reservas online unificada para ambos mercados',
      'Un sistema inteligente de recordatorios de cita con notificaciones por SMS/email/app',
      'Un modelo de predicción de no-shows que marque citas de alto riesgo para contacto proactivo',
      'Un dashboard de experiencia del paciente que registre tasas de reserva, no-shows y satisfacción del paciente por sede',
    ],
  },
  revenue_cycle: {
    id: 'revenue_cycle',
    name: 'Ciclo de Ingresos y Facturación',
    headName: 'Tom Callahan',
    headTitle: 'Responsable de Facturación',
    headLocation: 'Austin, TX',
    description: 'Responsable de cobrar por la atención que HealthCore presta. En EE.UU. navega por los seguros comerciales, Medicare y Medicaid. En el Reino Unido, la facturación combina pago privado y un pequeño contrato con el NHS',
    needs: [
      'Un sistema de revisión de reclamaciones asistido por IA que marque envíos de alto riesgo antes de salir',
      'Sugerencias automáticas de codificación basadas en notas clínicas',
      'Un dashboard de facturación unificado que muestre las corrientes de ingresos de EE.UU. y Reino Unido en tiempo real',
      'Análisis de patrones de rechazo para identificar problemas sistemáticos',
      'Flujos de seguimiento automatizados para reclamaciones rechazadas o impagadas',
    ],
  },
  compliance: {
    id: 'compliance',
    name: 'Cumplimiento y Gobierno del Dato',
    headName: 'Claire Whitfield',
    headTitle: 'Responsable de Cumplimiento',
    headLocation: 'Londres',
    description: 'Gestiona las obligaciones de la empresa bajo HIPAA en EE.UU. y UK GDPR en el Reino Unido — dos marcos distintos con reglas diferentes sobre cómo se pueden almacenar, acceder y compartir los datos de los pacientes',
    needs: [
      'Un dashboard centralizado de monitorización del cumplimiento que muestre patrones de acceso a datos en ambas jurisdicciones',
      'Consolidación automática de pistas de auditoría',
      'Una herramienta de automatización de solicitudes de datos del paciente que compile registros de todos los sistemas',
      'Un sistema de puntuación de riesgo de cumplimiento que marque posibles violaciones antes de que se conviertan en infracciones',
    ],
  },
  people_workforce: {
    id: 'people_workforce',
    name: 'Personas y Fuerza Laboral',
    headName: 'Diane Foster',
    headTitle: 'Responsable de RR.HH.',
    headLocation: 'Austin, TX',
    description: 'Gestiona las 200 personas distribuidas en 12 sedes de dos países, cada uno con su propio marco de derecho laboral. Se encarga de todo, desde la contratación hasta el onboarding, la formación en cumplimiento normativo y el seguimiento de las horas de formación médica continua',
    needs: [
      'Un portal interno de RR.HH. para solicitudes de vacaciones, gestión de ausencias y consultas de políticas',
      'Un flujo de onboarding clínico automatizado con checklists de verificación de credenciales',
      'Un sistema de seguimiento de CME con alertas automáticas de caducidad',
      'Un dashboard de KPIs de RR.HH. que registre tiempo de contratación, rotación y absentismo por sede y perfil',
      'Un chatbot de RR.HH. que responda preguntas comunes de la plantilla',
    ],
  },
  technology: {
    id: 'technology',
    name: 'Tecnología',
    headName: 'James Osei',
    headTitle: 'CTO',
    headLocation: 'Austin, TX',
    staffCount: 6,
    description: 'Responsable de un mosaico de sistemas heredados que fueron construidos o adquiridos individualmente para resolver un problema concreto y que nunca se han integrado correctamente',
    needs: [
      'Una API central de HealthCore que unifique datos de pacientes, citas, facturación y personal de ambos sistemas EHR',
      'Telemetría y monitorización en tiempo real desde las 12 sedes',
      'Un pipeline de datos que alimente dashboards clínicos, operacionales y financieros',
      'Chequeos de salud automatizados con alertas',
      'Documentación técnica indexada para búsqueda semántica',
    ],
  },
  executive: {
    id: 'executive',
    name: 'Dirección Ejecutiva',
    headName: 'Dra. Sandra Okonkwo',
    headTitle: 'CEO',
    headLocation: 'Austin, TX',
    description: 'Gestiona una red sanitaria de 28 millones de dólares en dos países sin un dashboard unificado. Sus decisiones se basan en informes semanales de cada responsable de área — todos con formatos distintos, a veces contradictorios y siempre con varios días de retraso',
    needs: [
      'Un dashboard ejecutivo unificado con KPIs en tiempo real de todos los departamentos (volumen de citas, tasa de no-shows, tasa de rechazo de reclamaciones, ingresos por sede, satisfacción del paciente)',
      'Un informe semanal generado automáticamente entregado cada lunes a las 7am',
      'Alertas de umbral para métricas críticas',
      'Un asistente de IA en lenguaje natural que pueda consultar directamente',
    ],
  },
};

export const LEGACY_SYSTEMS: LegacySystem[] = [
  { id: 'us_ehr', name: 'EHR Estados Unidos', purpose: 'Historia clínica electrónica', country: 'US', type: 'ehr', description: 'Plataforma EHR para clínicas estadounidenses' },
  { id: 'uk_ehr', name: 'EHR Reino Unido', purpose: 'Historia clínica electrónica', country: 'UK', type: 'ehr', description: 'Plataforma EHR para clínicas británicas' },
  { id: 'us_billing', name: 'Plataforma de facturación US', purpose: 'Facturación y reclamaciones', country: 'US', type: 'billing', description: 'Sistema de facturación para el mercado estadounidense' },
  { id: 'uk_billing_spreadsheet', name: 'Hoja de cálculo facturación UK', purpose: 'Facturación', country: 'UK', type: 'spreadsheet', description: 'Hoja de cálculo para facturación del Reino Unido' },
  { id: 'us_phone_scheduling', name: 'Sistema de programación telefónica US', purpose: 'Reserva de citas', country: 'US', type: 'scheduling', description: 'Reserva de citas por teléfono en EE.UU.' },
  { id: 'uk_manual_agenda', name: 'Agenda manual UK', purpose: 'Reserva de citas', country: 'UK', type: 'manual', description: 'Agenda manual en el Reino Unido' },
];

// ───────────────────────── CLÍNICAS DE EE. UU. (HITO 1) ─────────────────────────
// Extraído de la tabla de Ubicaciones en CONTEXT.es.md
// Las clínicas del Reino Unido atienden un mercado independiente y no se incluyen.

export const US_CLINICS: Clinic[] = [
  { id: 'clinic-austin-central', name: 'HealthCore Austin Central', location: 'Austin', city: 'Austin', state: 'TX', country: 'US', openingHours: 'Lun–Vie 7am–8pm · Sáb 9am–3pm', ehrSystem: 'US_EHR', phone: '(512) 340-8800', bilingualStaff: true, services: ['primary_care', 'specialist', 'chronic_management', 'preventive'] },
  { id: 'clinic-austin-north', name: 'HealthCore Austin North', location: 'Austin', city: 'Austin', state: 'TX', country: 'US', openingHours: 'Lun–Vie 8am–7pm', ehrSystem: 'US_EHR', phone: '(512) 340-8810', bilingualStaff: true, services: ['primary_care', 'chronic_management', 'preventive'] },
  { id: 'clinic-san-antonio', name: 'HealthCore San Antonio', location: 'San Antonio', city: 'San Antonio', state: 'TX', country: 'US', openingHours: 'Lun–Vie 8am–6pm · Sáb 9am–1pm', ehrSystem: 'US_EHR', phone: '(210) 720-4400', bilingualStaff: true, services: ['primary_care', 'specialist', 'chronic_management', 'preventive'] },
  { id: 'clinic-miami', name: 'HealthCore Miami', location: 'Miami', city: 'Miami', state: 'FL', country: 'US', openingHours: 'Lun–Vie 7am–8pm · Sáb 9am–4pm', ehrSystem: 'US_EHR', phone: '(305) 510-7700', bilingualStaff: true, services: ['primary_care', 'specialist', 'chronic_management', 'preventive'] },
  { id: 'clinic-orlando', name: 'HealthCore Orlando', location: 'Orlando', city: 'Orlando', state: 'FL', country: 'US', openingHours: 'Lun–Vie 8am–6pm', ehrSystem: 'US_EHR', phone: '(407) 892-6600', bilingualStaff: true, services: ['primary_care', 'chronic_management', 'preventive'] },
  { id: 'clinic-atlanta', name: 'HealthCore Atlanta', location: 'Atlanta', city: 'Atlanta', state: 'GA', country: 'US', openingHours: 'Lun–Vie 8am–7pm', ehrSystem: 'US_EHR', phone: '(404) 330-9900', bilingualStaff: true, services: ['primary_care', 'specialist', 'chronic_management', 'preventive'] },
];

/** Retorna los nombres de clínicas US para usar como opciones en el formulario */
export function getUSClinicNames(): string[] {
  return US_CLINICS.map(function (c: Clinic): string { return c.name; });
}

/**
 * Determina si una clínica ofrece horario extendido (abre después de las 5pm).
 * Útil para la validación de franja horaria "Evening (5pm–8pm)".
 */
export function hasEveningHours(clinic: Clinic): boolean {
  return clinic.openingHours.includes('8pm');
}

// ───────────────────────── CONSTANTES DEL NEGOCIO ─────────────────────────

export const BUSINESS_CONSTANTS = {
  NO_SHOW_RATE: 0.22,
  NO_SHOW_ANNUAL_LOSS: 1_800_000,
  CLAIM_DENIAL_RATE: 0.14,
  INDUSTRY_DENIAL_RATE: 0.065,
  INDUSTRY_DENIAL_RATE_MIN: 0.05,
  INDUSTRY_DENIAL_RATE_MAX: 0.08,
  CLINIC_DOCUMENTATION_TIME_MIN: 35,
  DAYS_TO_HIRE_CLINICAL: 47,
  INDUSTRY_DAYS_TO_HIRE: 27,
  TOTAL_CLINICS: 12,
  CLINICS_US: 9,
  CLINICS_UK: 3,
  TOTAL_EMPLOYEES: 200,
  ANNUAL_REVENUE: 28_000_000,
  EXECUTIVE_REPORT_DAY: 'Monday',
  EXECUTIVE_REPORT_TIME: '07:00',
} as const;