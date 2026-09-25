# Tech Context

> Este documento describe la arquitectura y las tecnologías identificadas en el repositorio. El contexto empresarial canónico para los agentes es [`CONTEXT.md`](../CONTEXT.md); [`CONTEXT.es.md`](../CONTEXT.es.md) se mantiene como versión/origen en español.

## Implementación frontend previa: Hito 1 estático

- `index.html` / `index.en.html`: landing corporativa de HealthCore (HTML5 + Tailwind CSS v4 vía CDN `@tailwindcss/browser@4`).
- `aplication.html` / `aplication.en.html`: formulario de solicitud de atención médica.
- `style.css`: hoja de estilos propia complementaria a Tailwind.
- `validation.js`: validación de formulario en JavaScript vainilla, sin dependencias externas.
- Brief original en [`promt.md`](../promt.md) ("HITO 1 -- ENTREGA 27/06").

## Implementación frontend identificada

El repositorio contiene un Hito 1 estático en la raíz y una implementación previa de Talent Pipeline Tracker basada en Next.js. Esta última define la estructura técnica descrita abajo, pero su estado de integración se mantiene en [`progress.md`](./progress.md).

### Stack tecnológico

- **Framework**: Next.js (`^16.3.5`), usando el App Router (carpeta `app/`).
- **Lenguaje**: TypeScript (`^7.0.2`), `strict: true` en `tsconfig.json`.
- **UI**: React `^19.3.0` / `react-dom` `^19.3.0`, iconos con `lucide-react`.
- **Estilos**: Tailwind CSS cargado vía CDN (`@tailwindcss/browser@4`) en `app/layout.tsx`, más un módulo CSS propio (`app/talents/pipeline.module.css`) y una hoja de estilos estática (`public/style.css`) para la landing.
- **Tipos**: `@types/node`, `@types/react`, `@types/react-dom` como devDependencies.
- No hay backend propio: la app es un frontend Next.js puro que consume una API HTTP externa.

### Estructura relevante del monorepo

```text
uis/talent-pipeline-tracker/     # Aplicación previa de gestión de talento
├── app/
│   ├── layout.tsx               # Root layout, carga Tailwind por CDN y LanguageProvider
│   ├── page.tsx                 # "/" redirige a /index.html (landing estática)
│   ├── components/
│   │   ├── global-navbar.tsx    # Navbar compartida entre vistas de talentos
│   │   └── language-context.tsx # Contexto de idioma (ES/EN)
│   └── talents/
│       ├── page.tsx / talent-pipeline.tsx   # Listado del pipeline (ES)
│       ├── new/page.tsx / new-talent.tsx    # Alta de candidato (ES)
│       ├── [id]/page.tsx / talent-detail.tsx# Detalle de candidato (ES)
│       ├── en/page.tsx, en/new/page.tsx, en/[id]/page.tsx  # Variantes en inglés
│       ├── types.ts             # TalentRecord, TalentNote, TalentStatus, TalentStage
│       ├── labels.ts            # Etiquetas ES/EN para status y stage
│       └── pipeline.module.css
├── public/                      # Landing estática de HealthCore (HTML/CSS servidos por Next.js)
│   ├── index.html / index.en.html
│   ├── aplication.html / aplication.en.html
│   └── style.css
├── .env.example                 # NEXT_PUBLIC_API_URL
├── package.json / package-lock.json
└── tsconfig.json

packages/shared/                 # @repo/shared-types — paquete de tipos compartidos (aún placeholder)
├── package.json
└── types/index.ts               # Solo tipos de ejemplo: Id, BaseEntity

services/                        # Solo README de plantilla; cualquier backend debe ubicarse aquí
uis/                              # Según su README, debería contener website/ y backoffice/ (aún no existen como carpetas separadas)
```

### Arquitectura del Hito 4

Según el `README.md` raíz y `uis/README.md`, la estructura hacia la que debe evolucionar el proyecto es:

```text
/uis/website        # Presencia pública de HealthCore (hoy: Hito 1 estático en la raíz)
/uis/backoffice     # Herramientas internas (relacionadas con el Talent Pipeline Tracker previo)
/services           # Ubicación de cualquier servicio backend de HealthCore (hoy: no existe, se usa API externa de práctica)
```

Estas rutas representan las responsabilidades del Hito 4. El estado de implementación de cada una se documenta en `progress.md`; no se declara aquí como implementado ningún componente que no exista en el repositorio. El README de la plantilla recomienda una API centralizada con FastAPI para `services/`, pero esa tecnología solo debe adoptarse si el enunciado del hito la exige.

### Arquitectura identificada actualmente

- Frontend Next.js monolítico (sin servicio backend propio en el monorepo) que llama directamente a una **API REST externa de práctica** de 4Geeks:
  `NEXT_PUBLIC_API_URL=https://playground.4geeks.com/tracker/api/v1` (definida en `.env.example`).
- El componente `talent-pipeline.tsx` implementa paginación manual sobre el endpoint `GET /records` (tamaño de página 1000 registros por request, acumulando hasta que una página viene incompleta), con una caché en memoria (`recordsCache`) invalidable vía evento (`invalidateRecordsCache`).
- La landing corporativa (HTML/CSS estáticos en `public/`) y la app React (`app/talents/**`) coexisten en el mismo proyecto Next.js; la ruta raíz `/` simplemente redirige a la landing estática.
- No hay capa de base de datos, autenticación, ni servicio propio: toda la persistencia depende de la API externa.

### Infraestructura de agentes y skills

- La plantilla organiza agentes en `agents/`, capacidades reutilizables en `skills/` y servidores MCP en `mcps/`.
- En el estado actual existe `skills/_template/SKILL.md` y documentación de plantilla en `agents/` y `mcps/`.
- La estructura específica exigida por el ejercicio (`AGENTS.md`, `.agents/rules/` y `.agents/skills/<skill>/SKILL.md`) se verifica y mantiene en `progress.md`; no se afirma aquí que exista mientras no esté presente en el árbol.

### Estrategia de tipos y contratos de datos

- Los contratos de datos del dominio "talento" se definen localmente en `app/talents/types.ts` (`TalentRecord`, `TalentNote`, `TalentStatus`, `TalentStage`), **no** en `packages/shared/types/index.ts`.
- `packages/shared` (`@repo/shared-types`) existe pero solo contiene tipos de ejemplo genéricos (`Id`, `BaseEntity`) — no hay integración real entre el paquete compartido y la app del tracker todavía.
- `TalentRecord` es deliberadamente permisivo (`Record<string, RecordValue>` con múltiples alias de campo: `name`/`full_name`/`fullName`, `id`/`_id`, etc.), reflejando que la forma exacta de la respuesta de la API externa no está estandarizada.

### APIs / servicios externos relevantes

- API de práctica de 4Geeks: `https://playground.4geeks.com/tracker/api/v1` (endpoint usado: `/records`). Es un servicio de terceros para fines de aprendizaje, no un servicio propio de HealthCore.

### Scripts de desarrollo, build, lint, test, validación

- Raíz del monorepo (`package.json`):
  - `npm run dev` → `npm --prefix uis/talent-pipeline-tracker run dev`
  - `npm run build` → `... run build`
  - `npm run start` → `... run start`
  - `npm run typecheck` → `... run typecheck`
- Dentro de `uis/talent-pipeline-tracker/package.json`:
  - `dev`: `next dev`
  - `build`: `next build`
  - `start`: `next start`
  - `typecheck`: `tsc --noEmit`
  - ❓ No verificado: no hay script de `lint` ni de `test` definido en ese `package.json`.

### Restricciones técnicas conocidas

- `tsconfig.json` usa `strict: true`, `moduleResolution: "Bundler"`, `jsx: "react-jsx"`, `outDir: "dist"` — cualquier cambio de tipos debe respetar modo estricto.
- La app depende de que `NEXT_PUBLIC_API_URL` esté configurada (variable pública, expuesta al cliente); sin ella, las requests a `/records` fallan.
- El README raíz describe una plantilla sin runner de workspace global. El `package.json` raíz disponible delega los scripts al proyecto Next.js.

### Convenciones importantes del proyecto

- Un subfolder por app dentro de `uis/`, cada una con su propia documentación (regla del `README.md` raíz).
- Contenido bilingüe (ES/EN) resuelto con rutas paralelas (`/talents` vs `/talents/en`) en lugar de un sistema i18n de Next.js.
- Comentarios de una sola línea explicando decisiones no evidentes (ver `global-navbar.tsx`, `talent-pipeline.tsx`).
- `AGENTS.md`/`CLAUDE.md` dentro de `uis/talent-pipeline-tracker/` son generados automáticamente por `next dev` (contienen la marca `BEGIN:nextjs-agent-rules` / referencian `node_modules/next/dist/server/lib/generate-agent-files.js`) — no deben tratarse como documentación manual del proyecto.

### Dependencias/configuraciones que un nuevo agente debería conocer antes de modificar código

- El paquete `packages/shared` no está enlazado como workspace de npm (no hay `workspaces` en el `package.json` raíz visto); su reutilización real desde `uis/talent-pipeline-tracker` no está verificada (❓ No verificado).
- Los datos que llegan de la API externa no siguen un esquema fijo (de ahí los múltiples alias opcionales en `TalentRecord`); cualquier cambio en el parsing debe mantener esa tolerancia.
