# Carpeta `scripts`

Esta carpeta contiene **scripts auxiliares** del monorepo: automatizaciones de desarrollo, utilidades de mantenimiento, tareas repetitivas (setup, lint, migraciones, generación de datos, etc.) y tooling interno.

- **Propósito principal**: agrupar herramientas de soporte que no pertenecen a una app/agente/pipeline específico, pero facilitan el trabajo del equipo.
- **Recomendación**: documenta cada script (qué hace, parámetros, requisitos, ejemplos de uso) y procura que sean reproducibles (y seguros) en distintos entornos.

## CLI de análisis de incidentes

Desde la raíz: `uv run --locked --project services/healthcore-api python scripts/analyze.py scripts/incidents-healthcore.csv`, con el entorno de dependencias del backend. El dataset versionado tiene una única ruta canónica en `scripts/`. Acepta cualquier ruta CSV. `--no-prompt` evita preguntas; `--json` muestra agregados JSON; `--export /ruta/nueva/results.csv` exporta agregados sin sobrescribir archivos. En terminal interactiva ofrece guardar `results.csv`. Código 0: análisis completado, incluso con filas inválidas; código 2: error operativo. Reglas y límites de privacidad en el README del backend.

## Carga histórica de incidentes

Desde la raíz:

```bash
uv run --locked --project services/healthcore-api python scripts/seed_incidents.py
```

Usa `--csv /ruta/incidentes.csv` para seleccionar otro CSV histórico y `--db /ruta/healthcore.json` para una base temporal. El seed valida cada fila con `IncidentRecord`, transforma las filas válidas y guarda cada ticket generado con una `_import_key` interna en la tabla `incidents`. Las claves existentes se omiten sin actualizar tickets, por lo que se conservan cambios manuales de estado y ID entre ejecuciones.
