# Interfaces de usuario

Esta carpeta contiene aplicaciones distintas; sus HTML, rutas e historias no son intercambiables.

- [`website/`](./website/README.md) — sitio estático bilingüe de HealthCore conservado como referencia y compatibilidad. Las rutas públicas actuales están implementadas en la aplicación Next.js de `talent-pipeline-tracker/`; el comando raíz `npm run serve:website` sigue disponible para la copia estática.
- [`backoffice/`](./backoffice/README.md) — cliente estático existente para análisis de incidentes con la API de HealthCore.
- [`talent-pipeline-tracker/`](./talent-pipeline-tracker/) — aplicación Next.js con las rutas públicas de HealthCore y un módulo Talent Tracker separado. El servidor HTML estático sigue siendo independiente y no sustituye ni modifica estas rutas.

El backend de HealthCore está documentado en [`../services/healthcore-api/README.md`](../services/healthcore-api/README.md). Consulta [el índice en inglés](./README.md) para el mismo resumen.
