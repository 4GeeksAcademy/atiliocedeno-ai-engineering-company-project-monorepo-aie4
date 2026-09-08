Actúa como un Senior TypeScript Engineer encargado de implementar COMPLETAMENTE el Hito de Coding Fundamentals de HealthCore dentro del repositorio actual.

IMPORTANTE:

* Trabaja sobre el repositorio EXISTENTE. NO crees un repositorio nuevo.
* Antes de modificar archivos, inspecciona la estructura actual del proyecto, package.json, tsconfig.json, archivos src existentes y cualquier código ya implementado.
* NO inventes entidades, campos, nombres de funciones, tipos ni reglas de negocio.
* Debes respetar EXACTAMENTE los nombres definidos en el CONTEXT de HealthCore.
* Si ya existe código relacionado, refactorízalo o complétalo para alinearlo con este requisito en lugar de duplicarlo.
* NO cambies innecesariamente la arquitectura existente.
* No uses `any`.
* Usa TypeScript estricto y tipos explícitos en parámetros y valores de retorno.
* Las funciones deben ser puras y no deben depender de estado global.
* Las funciones de ordenamiento y filtrado NO deben mutar los arrays originales.
* Maneja correctamente arrays vacíos, elementos no encontrados, división por cero y campos opcionales.
* El frontend es opcional: prioriza COMPLETAMENTE la lógica TypeScript.

==================================================

1. ENTIDADES EXACTAS DEL DOMINIO
   ==================================================

Implementa exactamente estas entidades e interfaces:

### Claim

```ts
interface Claim {
  claimId: string;
  patientId: string;
  locationId: string;
  serviceType: ServiceType;
  payerName: string;
  payerId: string;
  submissionDate: string;
  claimAmount: number;
  status: ClaimStatus;
  denialReason?: DenialReason;
  resubmitted: boolean;
}
```

### ClaimStatus

```ts
type ClaimStatus =
  | "submitted"
  | "approved"
  | "denied"
  | "pending"
  | "appealed";
```

### DenialReason

```ts
type DenialReason =
  | "missing_authorisation"
  | "coding_error"
  | "duplicate_claim"
  | "patient_not_covered"
  | "service_not_covered"
  | "incomplete_documentation";
```

### ServiceType

```ts
type ServiceType =
  | "primary_care"
  | "chronic_disease"
  | "preventive"
  | "specialist"
  | "womens_health"
  | "paediatric"
  | "mental_health";
```

### Appointment

```ts
interface Appointment {
  appointmentId: string;
  patientId: string;
  locationId: string;
  serviceType: ServiceType;
  scheduledDate: string;
  scheduledTime: string;
  status: AppointmentStatus;
  noShowReason?: string;
  confirmedAt?: string;
}
```

### AppointmentStatus

```ts
type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";
```

### Clinician

```ts
interface Clinician {
  clinicianId: string;
  firstName: string;
  lastName: string;
  role: ClinicianRole;
  locationId: string;
  licenceState: string;
  licenceExpiryDate: string;
  cmeHoursRequired: number;
  cmeHoursLogged: number;
  cmeYearStartDate: string;
}
```

### ClinicianRole

```ts
type ClinicianRole =
  | "physician"
  | "nurse_practitioner"
  | "nurse"
  | "medical_assistant";
```

### Location

```ts
interface Location {
  locationId: string;
  name: string;
  city: string;
  stateOrCountry: string;
  country: "US" | "UK";
  phone: string;
  averageConsultationFee: Record<ServiceType, number>;
}
```

### CMEReport

```ts
interface CMEReport {
  clinicianId: string;
  fullName: string;
  role: ClinicianRole;
  locationId: string;
  hoursRequired: number;
  hoursLogged: number;
  hoursRemaining: number;
  percentComplete: number;
  daysRemainingInCycle: number;
  complianceStatus: CMEStatus;
  licenceExpiryDate: string;
  licenceDaysRemaining: number;
}
```

### CMEStatus

```ts
type CMEStatus =
  | "on_track"
  | "at_risk"
  | "overdue"
  | "complete";
```

==================================================
2. ESTRUCTURA DE ARCHIVOS
=========================

Asegúrate de tener esta separación por responsabilidad:

src/
├── types/
│   └── models.ts
└── utils/
├── collections.ts
├── search.ts
├── transformations.ts
└── validations.ts

No mezcles las responsabilidades entre archivos.

`models.ts`

* Interfaces
* Type aliases
* Tipos del dominio

`collections.ts`

* Filtrado
* Ordenamiento
* Agrupación

`search.ts`

* Búsqueda lineal
* Búsqueda binaria

`transformations.ts`

* Tasas
* Totales
* Promedios
* Cálculos de no-show
* Reportes CME
* Agregaciones

`validations.ts`

* Validaciones de negocio
* Validaciones de thresholds

==================================================
3. COLLECTIONS — src/utils/collections.ts
=========================================

Implementa EXACTAMENTE estas funciones:

### filterClaims

```ts
filterClaims(
  claims: Claim[],
  filters: Partial<
    Pick<Claim, "locationId" | "status" | "payerName" | "serviceType">
  >
): Claim[]
```

Requisitos:

* Debe devolver solamente claims que cumplan TODOS los filtros proporcionados.
* Ignorar criterios que no estén presentes.
* No mutar `claims`.
* Array vacío debe funcionar correctamente.

### filterAppointmentsByStatus

```ts
filterAppointmentsByStatus(
  appointments: Appointment[],
  status: AppointmentStatus[]
): Appointment[]
```

Requisitos:

* Devuelve citas cuyo estado coincida con cualquiera de los estados recibidos.
* Si `status` está vacío, devuelve un array vacío.
* No mutar el array original.

### sortClaimsById

```ts
sortClaimsById(
  claims: Claim[],
  direction: "asc" | "desc"
): Claim[]
```

Requisitos:

* Orden alfanumérico por `claimId`.
* Ascendente o descendente.
* NO mutar el array original.
* Utilizar una copia antes de ordenar.

### sortAppointmentsByDate

```ts
sortAppointmentsByDate(
  appointments: Appointment[],
  direction: "asc" | "desc"
): Appointment[]
```

Requisitos:

* Ordenar por `scheduledDate`.
* Ascendente o descendente.
* No mutar el array original.

### groupClaimsBy

```ts
groupClaimsBy(
  claims: Claim[],
  key: "locationId" | "payerName" | "status" | "serviceType"
): Record<string, Claim[]>
```

Requisitos:

* Agrupar utilizando exactamente la propiedad indicada.
* Cada clave debe contener un array con los claims correspondientes.
* Array vacío debe devolver `{}`.

==================================================
4. SEARCH — src/utils/search.ts
===============================

### findClaimById

```ts
findClaimById(
  claims: Claim[],
  claimId: string
): Claim | null
```

Requisitos:

* DEBE utilizar búsqueda lineal.
* No utilizar `find`, `indexOf` ni búsqueda binaria como reemplazo.
* Recorrer secuencialmente el array.
* Devolver el claim si existe.
* Devolver `null` si no existe.

### findClinicianById

```ts
findClinicianById(
  clinicians: Clinician[],
  clinicianId: string
): Clinician | null
```

Requisitos:

* DEBE utilizar búsqueda lineal.
* Devolver `null` si no existe.

### binarySearchClaimById

```ts
binarySearchClaimById(
  sortedClaims: Claim[],
  targetId: string
): number
```

Requisitos:

* Implementar búsqueda binaria REAL.
* Asumir que el array ya está ordenado por `claimId` ascendente.
* No ordenar internamente.
* Utilizar índices `left`, `right` y `mid` o equivalente.
* Devolver el índice correcto.
* Devolver `-1` cuando no existe.
* Manejar correctamente array vacío.

==================================================
5. TRANSFORMATIONS — BILLING DENIALS
====================================

Implementa:

### calculateDenialRate

```ts
calculateDenialRate(claims: Claim[]): number
```

Requisitos:

* Porcentaje = claims denied / total claims * 100.
* Solo `status === "denied"` cuenta como denegado.
* Redondear a 2 decimales.
* Si el array está vacío, lanzar un `Error`.
* Nunca producir `NaN`.

### denialRateByPayer

```ts
denialRateByPayer(claims: Claim[]): Record<string, number>
```

Requisitos:

* Agrupar por `payerName`.
* Calcular tasa de denegación para cada payer.
* Redondear a 2 decimales.
* Solo incluir payers presentes.
* Manejar correctamente el caso sin datos.

### denialRateByLocation

```ts
denialRateByLocation(claims: Claim[]): Record<string, number>
```

Requisitos:

* Agrupar por `locationId`.
* Calcular tasa de denegación por ubicación.
* Redondear a 2 decimales.

### flagHighDenialPayers

```ts
flagHighDenialPayers(
  claims: Claim[],
  threshold?: number
): string[]
```

Requisitos:

* Threshold por defecto: `8`.
* Devolver nombres de payer cuya tasa de denegación sea MAYOR que el threshold.
* No incluir valores exactamente iguales al threshold.
* Array vacío si no hay resultados.

==================================================
6. TRANSFORMATIONS — NO-SHOW
============================

### calculateNoShowCost

```ts
calculateNoShowCost(
  appointments: Appointment[],
  location: Location,
  weekEndingDate: string
): number
```

Requisitos:

* Considerar únicamente appointments con `status === "no_show"`.
* Considerar los 7 días calendario terminando en `weekEndingDate`, inclusive.
* Usar:
  `location.averageConsultationFee[appointment.serviceType]`
* Sumar el costo estimado de cada no-show.
* Devolver `0` cuando no existan no-shows en el período.
* Redondear a 2 decimales.
* La cita debe corresponder a la misma `location.locationId`.
* Manejar correctamente las fechas.

### noShowRateByLocation

```ts
noShowRateByLocation(
  appointments: Appointment[]
): Record<string, number>
```

Requisitos:

* Calcular no-show rate por ubicación.
* Fórmula:
  no-shows / total appointments * 100
* Redondear a 2 decimales.
* Manejar correctamente ubicaciones sin datos.

### flagHighNoShowLocations

```ts
flagHighNoShowLocations(
  appointments: Appointment[],
  threshold?: number
): string[]
```

Requisitos:

* Threshold por defecto: `20`.
* Devolver IDs de ubicaciones cuyo no-show rate SUPERE el threshold.
* Devolver `[]` si ninguna supera el límite.

==================================================
7. TRANSFORMATIONS — CME
========================

### generateCMEReport

```ts
generateCMEReport(
  clinicians: Clinician[],
  asOfDate: string
): CMEReport[]
```

Debe generar un reporte para CADA clínico.

Campos:

* `clinicianId`
* `fullName = "${firstName} ${lastName}"`
* `role`
* `locationId`
* `hoursRequired`
* `hoursLogged`
* `hoursRemaining = Math.max(0, required - logged)`
* `percentComplete = (logged / required) * 100`
* redondear `percentComplete` a 1 decimal
* `daysRemainingInCycle`
* `complianceStatus`
* `licenceExpiryDate`
* `licenceDaysRemaining`

Lógica EXACTA del status:

`complete`

* si `hoursLogged >= hoursRequired`

`overdue`

* si el ciclo CME terminó Y `hoursLogged < hoursRequired`

`at_risk`

* si el ciclo está activo Y el porcentaje completado está más de 15 puntos porcentuales por detrás del porcentaje del año transcurrido

`on_track`

* si el ciclo está activo y no está en riesgo

Maneja correctamente:

* ciclos terminados
* ciclos activos
* fechas límite
* `cmeHoursRequired === 0`
* división por cero
* fechas exactas de comienzo y fin
* año transcurrido en el ciclo CME

### getCliniciansAtRisk

```ts
getCliniciansAtRisk(
  clinicians: Clinician[],
  asOfDate: string
): Clinician[]
```

Requisitos:

* Utilizar la lógica de `generateCMEReport` o una lógica equivalente reutilizable.
* Devolver clínicos cuyo estado sea:

  * `at_risk`
  * `overdue`

### getCliniciansWithExpiringLicences

```ts
getCliniciansWithExpiringLicences(
  clinicians: Clinician[],
  asOfDate: string,
  daysThreshold: number
): Clinician[]
```

Requisitos:

* Devuelve clínicos cuya licencia venza dentro del umbral indicado.
* Trabajar con días calendario.
* Usar correctamente fechas futuras.
* No considerar arbitrariamente otras reglas no definidas.

Umbrales de referencia:

* 90 días = primera alerta
* 30 días = alerta urgente

==================================================
8. VALIDATIONS — src/utils/validations.ts
=========================================

### validateClaim

```ts
validateClaim(
  claim: Claim,
  knownLocationIds: string[]
): {
  valid: boolean;
  errors: string[];
}
```

Debe validar TODAS estas reglas:

1. `claimAmount > 0`
2. `submissionDate` no puede ser futura
3. `locationId` debe existir en `knownLocationIds`
4. Si `status === "denied"`, `denialReason` debe existir
5. `patientId` debe cumplir exactamente:
   `HC-` + 6 caracteres alfanuméricos

Resultado válido:

```ts
{
  valid: true,
  errors: []
}
```

Resultado inválido:

```ts
{
  valid: false,
  errors: [...]
}
```

Debe incluir un mensaje independiente por cada regla fallida.

### validateClinician

```ts
validateClinician(
  clinician: Clinician
): {
  valid: boolean;
  errors: string[];
}
```

Validar:

1. `cmeHoursRequired >= 0`
2. `cmeHoursLogged >= 0`
3. `licenceExpiryDate` debe ser una fecha válida
4. Fechas de licencia pasadas deben poder identificarse como vencidas
5. `role` debe ser uno de los cuatro valores permitidos

No inventar reglas adicionales.

### isDenialRateAboveThreshold

```ts
isDenialRateAboveThreshold(
  rate: number,
  threshold?: number
): boolean
```

* Default threshold: `8`
* Devolver `true` solamente cuando `rate > threshold`

### isNoShowRateAboveThreshold

```ts
isNoShowRateAboveThreshold(
  rate: number,
  threshold?: number
): boolean
```

* Default threshold: `20`
* Devolver `true` solamente cuando `rate > threshold`

==================================================
9. DATOS DE EJEMPLO
===================

Incluye datos de ejemplo suficientes para ejecutar y comprobar las funciones, utilizando EXACTAMENTE las propiedades del dominio.

Como mínimo utiliza los datos del CONTEXT para:

* `sampleLocations`
* `sampleClaims`
* `sampleAppointments`
* `sampleClinicians`

No cambies nombres de propiedades.

==================================================
10. PRUEBAS Y EDGE CASES
========================

Crea pruebas o un archivo de demostración si el proyecto actual ya tiene una estrategia de testing.

Debes comprobar como mínimo:

* arrays vacíos
* claim inexistente
* clinician inexistente
* binary search sin resultados
* binary search con array de un elemento
* filter sin criterios
* filter con múltiples criterios
* sorting ascendente
* sorting descendente
* verificar que sort NO muta el array original
* agrupación
* tasa de denegación
* tasa de denegación del 0%
* tasa de no-show del 0%
* división por cero
* `claim.status === "denied"` sin `denialReason`
* `no_show` sin `noShowReason`
* `cmeHoursRequired === 0`
* CME completo
* CME en riesgo
* CME overdue
* CME on track
* licencia vencida
* licencia próxima a vencer
* fechas límite exactas

==================================================
11. CALIDAD Y REGLAS DEL CÓDIGO
===============================

Cumple estrictamente:

* TypeScript
* sin `any`
* nombres descriptivos
* camelCase para funciones y variables
* PascalCase para interfaces
* `const` por defecto
* `let` solo cuando sea necesario
* funciones con una única responsabilidad
* funciones puras
* sin variables globales de estado
* no mutar parámetros
* comentarios solamente cuando aporten valor
* evitar duplicación innecesaria
* reutilizar funciones auxiliares cuando mejore claridad
* mantener las funciones pequeñas y fáciles de probar

==================================================
12. TYPECHECK Y VALIDACIÓN FINAL
================================

Asegúrate de que el proyecto tenga un comando claro para validar TypeScript.

Preferentemente:

```bash
npx tsc --noEmit
```

Si `package.json` ya utiliza scripts, agrega:

```json
"scripts": {
  "typecheck": "tsc --noEmit"
}
```

siempre que no destruya ni sobrescriba scripts existentes.

Ejecuta el typecheck y corrige TODOS los errores.

Si existen tests configurados en el proyecto, ejecútalos también.

==================================================
13. NO HAGAS ESTO
=================

NO:

* inventes entidades
* inventes propiedades
* cambies nombres del dominio
* agregues reglas de negocio no especificadas
* uses `any`
* reemplaces búsqueda lineal por `.find()`
* reemplaces búsqueda binaria por `.find()`, `.indexOf()` o `.includes()`
* mutar arrays originales con `.sort()`
* crear una función gigante que haga todo
* esconder errores de TypeScript con casts innecesarios
* introducir dependencias innecesarias
* modificar partes no relacionadas del proyecto
* construir una UI compleja antes de terminar la lógica

==================================================
14. CHECKLIST FINAL
===================

Antes de terminar, verifica uno por uno:

[ ] `models.ts` contiene todas las interfaces y tipos requeridos
[ ] `Claim` implementado correctamente
[ ] `Appointment` implementado correctamente
[ ] `Clinician` implementado correctamente
[ ] `Location` implementado correctamente
[ ] `CMEReport` implementado correctamente
[ ] todos los union types implementados exactamente
[ ] todas las funciones requeridas existen con los nombres exactos
[ ] collections completo
[ ] búsqueda lineal real
[ ] búsqueda binaria real
[ ] agregaciones completas
[ ] cálculo de denial rate correcto
[ ] cálculo de no-show correcto
[ ] CME correcto
[ ] validaciones completas
[ ] edge cases cubiertos
[ ] no se mutan arrays originales
[ ] funciones puras
[ ] sin `any`
[ ] TypeScript compila sin errores
[ ] no se inventaron reglas ni nombres
[ ] estructura de archivos correcta

Al finalizar, dame un resumen técnico de:

1. archivos modificados
2. funciones implementadas
3. validaciones implementadas
4. tests ejecutados
5. resultado del typecheck
6. cualquier problema que no hayas podido resolver


IMPORTANTE: El proyecto YA TIENE un `index.html` funcional. NO debes modificarlo, reemplazarlo, eliminarlo ni convertirlo en página de pruebas.

Para las pruebas manuales del Hito, crea una página independiente llamada exactamente:

`index_test.html`

### Requisitos de `index_test.html`

La página debe servir exclusivamente como panel de pruebas para las funcionalidades TypeScript implementadas en este hito.

NO debe alterar la página pública existente.

Debe:

1. Importar/usar las funciones TypeScript necesarias para probar:

   * filtrado de claims
   * filtrado de appointments
   * ordenamiento de claims
   * ordenamiento de appointments
   * agrupación de claims
   * búsqueda lineal de claims
   * búsqueda lineal de clinicians
   * búsqueda binaria de claims
   * denial rate
   * denial rate por payer
   * denial rate por location
   * detección de payers con alta tasa de denegación
   * cálculo de costo por no-show
   * no-show rate por location
   * detección de locations con alta tasa de no-show
   * generación de reporte CME
   * clinicians at risk
   * licencias próximas a vencer
   * validación de claims
   * validación de clinicians
   * thresholds de denial rate
   * thresholds de no-show rate

2. Utilizar los datos de ejemplo definidos para HealthCore:

   * `sampleLocations`
   * `sampleClaims`
   * `sampleAppointments`
   * `sampleClinicians`

3. Incluir controles simples para ejecutar las operaciones manualmente, por ejemplo:

   * botones
   * selects
   * inputs
   * campos para IDs
   * campos para thresholds
   * campo para `weekEndingDate`
   * campo para `asOfDate`

4. Mostrar los resultados de forma clara y legible.

5. Mostrar también errores de validación cuando corresponda.

6. Indicar visualmente qué función se está ejecutando y cuál fue el resultado.

### Restricción importante

NO conviertas `index_test.html` en una aplicación compleja.

Es solamente una herramienta de demostración/prueba para comprobar que las funciones del hito funcionan correctamente.

### Tecnología

Usa HTML + TypeScript/JavaScript según la estructura existente del proyecto.

Si el proyecto ya tiene Vite u otro sistema de build, integra `index_test.html` correctamente dentro de esa configuración en lugar de introducir una nueva herramienta innecesariamente.

Puedes usar Tailwind CSS para la interfaz, pero el diseño debe ser sencillo y funcional.

### Navegación

Agrega dentro de `index_test.html` un enlace claro para volver al `index.html` existente:

`← Volver al sitio principal`

NO modifiques el `index.html` para agregar este enlace.

### Verificación final

Después de crear `index_test.html`:

* Verifica que `index.html` permanezca sin cambios.
* Verifica que todas las funciones puedan probarse desde `index_test.html`.
* Ejecuta `npx tsc --noEmit`.
* Corrige cualquier error de TypeScript.
* Si el proyecto tiene un servidor de desarrollo existente, asegúrate de que `index_test.html` pueda abrirse correctamente.

Al finalizar, informa explícitamente:

* que `index.html` NO fue modificado;
* que `index_test.html` fue creado;
* qué funcionalidades pueden probarse desde esa página;
* resultado del typecheck.
