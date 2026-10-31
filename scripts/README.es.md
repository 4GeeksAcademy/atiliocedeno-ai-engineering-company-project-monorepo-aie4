# Carpeta `scripts`

Esta carpeta contiene **scripts auxiliares** del monorepo: automatizaciones de desarrollo, utilidades de mantenimiento, tareas repetitivas (setup, lint, migraciones, generación de datos, etc.) y tooling interno.

- **Propósito principal**: agrupar herramientas de soporte que no pertenecen a una app/agente/pipeline específico, pero facilitan el trabajo del equipo.
- **Recomendación**: documenta cada script (qué hace, parámetros, requisitos, ejemplos de uso) y procura que sean reproducibles (y seguros) en distintos entornos.

## CLI de análisis de incidentes

Desde la raíz: `python scripts/analyze.py incidents-healthcore.csv`, con las dependencias del backend instaladas. El CSV raíz es un enlace relativo al dataset existente en `scripts/`, sin alterar su contenido. Acepta cualquier ruta CSV. `--no-prompt` evita preguntas; `--json` muestra agregados JSON; `--export /ruta/nueva/results.csv` exporta agregados sin sobrescribir archivos. En terminal interactiva ofrece guardar `results.csv`. Código 0: análisis completado, incluso con filas inválidas; código 2: error operativo. Reglas y límites de privacidad en el README del backend.
