# Reglas para agentes de código

Este archivo define cómo debe trabajar cualquier agente de código dentro del monorepo de HealthCore. Las reglas específicas de una aplicación, servicio, agente, skill o herramienta pueden complementar este documento, pero no deben contradecirlo.

## Inicio de cada sesión

Antes de modificar código, documentación o configuración, el agente debe leer estos archivos en este orden:

1. `CONTEXT.md`
2. `memory-bank/projectbrief.md`
3. `memory-bank/techContext.md`
4. `memory-bank/progress.md`
5. El `README.md` de la carpeta o módulo que vaya a modificar

El agente debe entender el contexto empresarial, el propósito del proyecto, la arquitectura conocida y el estado actual antes de comenzar a modificar archivos. Si la tarea afecta una subcarpeta con documentación adicional, también debe leer sus instrucciones locales antes de editarla.

## Flujo obligatorio antes de cada commit

El agente debe completar todos estos pasos, en orden:

1. Revisar los cambios realizados y comprobar que están dentro del alcance solicitado y que no incluyen refactors o archivos ajenos a la tarea.
2. Ejecutar las validaciones disponibles para el proyecto afectado. Debe usar las que realmente existan, como `typecheck`, `build`, `lint`, tests u otras indicadas por el README o el `package.json`. En el estado actual, los scripts raíz verificados son `npm run typecheck` y `npm run build`; `lint` y tests no están verificados como scripts disponibles.
3. Actualizar `memory-bank/` cuando haya cambiado el estado del proyecto, la arquitectura, una decisión técnica relevante o una funcionalidad completada.
4. Revisar `git diff` y `git status` para detectar cambios accidentales, secretos, archivos fuera de alcance o artefactos generados.
5. Solo después de superar las verificaciones, preparar el commit solicitado.

Si una validación falla, el agente debe informar del fallo, investigar y corregirlo cuando corresponda. No debe ocultarlo ni continuar presentando la validación como exitosa. Si la validación no puede ejecutarse, debe dejar constancia de la razón.

## Archivos y carpetas protegidas

El agente no debe modificar sin confirmación explícita del desarrollador:

- `CONTEXT.md`, que es la fuente canónica del contexto empresarial.
- `.env*`, credenciales, tokens, claves, certificados y cualquier secreto.
- Configuración de CI/CD.
- Configuración de infraestructura, despliegue, contenedores o servicios operativos.
- Archivos de dependencias o lockfiles cuando el cambio no sea necesario para la tarea.
- Migraciones, bases de datos, datasets persistentes y otros datos que no puedan regenerarse sin riesgo.
- Configuración global del monorepo.
- Archivos fuera del alcance solicitado.

También deben tratarse con cuidado los archivos generados automáticamente, incluidos los archivos de reglas generados por Next.js dentro de una aplicación. No deben editarse como documentación manual sin confirmar antes su origen y la necesidad del cambio.

El agente debe detenerse y preguntar antes de realizar cambios destructivos, eliminar archivos importantes, sobrescribir datos, cambiar contratos públicos o modificar decisiones arquitectónicas existentes. Nunca debe ejecutar operaciones destructivas para limpiar cambios de otros autores.

## Reglas de alcance y estructura

- Modificar únicamente lo necesario para completar la tarea solicitada.
- Respetar la estructura y la responsabilidad del monorepo: interfaces en `uis/`, servicios backend y workers en `services/`, datos en `data/`, agentes en `agents/`, capacidades reutilizables en `skills/`, servidores MCP en `mcps/`, automatizaciones en `workflows/`, paquetes reutilizables en `packages/`, recursos compartidos en `shared/`, documentación transversal en `docs/`, infraestructura en `infra/`, scripts auxiliares en `scripts/` y herramientas internas estructuradas en `internal/`.
- Leer el README correspondiente antes de crear una carpeta nueva y documentar cada nueva aplicación, servicio, agente, skill, workflow o pipeline según las convenciones de su carpeta.
- Reutilizar componentes, tipos, contratos y utilidades existentes cuando corresponda; evitar duplicar funcionalidad.
- No inventar APIs, contratos, dependencias, variables de entorno, configuraciones o requisitos no respaldados por el contexto, la documentación o la tarea.
- No asumir que todas las necesidades generales de HealthCore descritas en `CONTEXT.md` son requisitos de la tarea actual.
- Mantener las versiones bilingües y las rutas existentes cuando una modificación afecte contenido que ya las utiliza.
- Mantener la tolerancia de los contratos existentes cuando la documentación técnica indique que una API externa tiene respuestas no estandarizadas.

## Memory Bank

Debe actualizarse cuando ocurra cualquiera de estas situaciones:

- Cambio de arquitectura o de la ubicación/responsabilidad de un componente.
- Nueva decisión técnica relevante.
- Funcionalidad completada o integrada.
- Nuevo problema, limitación o restricción detectada.
- Cambio importante en el estado del desarrollo, sus validaciones o sus próximos pasos.

Cada archivo tiene una responsabilidad distinta:

- `memory-bank/projectbrief.md`: qué es el proyecto, por qué existe, qué problema resuelve y quién lo utiliza.
- `memory-bank/techContext.md`: cómo está construido, qué stack, arquitectura, contratos y restricciones técnicas se conocen.
- `memory-bank/progress.md`: estado actual del desarrollo, entregables, gaps, validaciones y próximos pasos.

No mezclar estado temporal de ramas, builds o tareas pendientes en `projectbrief.md` o `techContext.md`; esa información pertenece a `progress.md` cuando sea relevante.

## Commits

El agente no debe hacer commits automáticamente. Solo puede preparar o ejecutar un commit cuando el desarrollador lo solicite explícitamente y después de completar todo el flujo previo al commit definido en este archivo.

Esta guía no autoriza merges, eliminación de ramas ni cambios destructivos. Esas operaciones requieren una solicitud explícita independiente.
# Rules for Code Agents

This file defines how any code agent must work within the HealthCore monorepo. Rules specific to an application, service, agent, skill, or tool may supplement this document, but they must not contradict it.

## Start of Each Session

Before modifying code, documentation, or configuration, the agent must read these files in the following order:

1. `CONTEXT.md`
2. `memory-bank/projectbrief.md`
3. `memory-bank/techContext.md`
4. `memory-bank/progress.md`
5. The `README.md` for the folder or module being modified

The agent must understand the business context, project purpose, known architecture, and current state before modifying files. If the task affects a subfolder with additional documentation, the agent must also read its local instructions before editing it.

## Required Workflow Before Each Commit

The agent must complete all of these steps in order:

1. Review the changes made and verify that they are within the requested scope and do not include unrelated refactors or files.
2. Run the validations available for the affected project. The agent must use validations that actually exist, such as `typecheck`, `build`, `lint`, tests, or others specified by the README or `package.json`. In the current state, the verified root scripts are `npm run typecheck` and `npm run build`; `lint` and tests have not been verified as available scripts.
3. Update `memory-bank/` when the project state, architecture, a relevant technical decision, or a completed feature has changed.
4. Review `git diff` and `git status` to detect accidental changes, secrets, out-of-scope files, or generated artifacts.
5. Only after the checks pass, prepare the requested commit.

If a validation fails, the agent must report the failure, investigate it, and fix it when appropriate. It must not hide the failure or present the validation as successful. If a validation cannot be run, the agent must document the reason.

## Protected Files and Folders

The agent must not modify the following without explicit developer confirmation:

- `CONTEXT.md`, which is the canonical source of business context.
- `.env*`, credentials, tokens, keys, certificates, and any other secrets.
- CI/CD configuration.
- Infrastructure, deployment, container, or operational-service configuration.
- Dependency files or lockfiles when the change is not necessary for the task.
- Migrations, databases, persistent datasets, and other data that cannot be safely regenerated.
- Global monorepo configuration.
- Files outside the requested scope.

Automatically generated files must also be treated carefully, including rule files generated by Next.js inside an application. They must not be edited as manual documentation without first confirming their origin and the need for the change.

The agent must stop and ask before making destructive changes, deleting important files, overwriting data, changing public contracts, or modifying existing architectural decisions. It must never perform destructive operations to clean up changes made by other authors.

## Scope and Structure Rules

- Modify only what is necessary to complete the requested task.
- Respect the monorepo structure and responsibilities: interfaces in `uis/`, backend services and workers in `services/`, data in `data/`, agents in `agents/`, reusable capabilities in `skills/`, MCP servers in `mcps/`, automations in `workflows/`, reusable packages in `packages/`, shared resources in `shared/`, cross-cutting documentation in `docs/`, infrastructure in `infra/`, helper scripts in `scripts/`, and structured internal tools in `internal/`.
- Read the relevant README before creating a new folder, and document every new application, service, agent, skill, workflow, or pipeline according to its folder conventions.
- Reuse existing components, types, contracts, and utilities when appropriate; avoid duplicating functionality.
- Do not invent APIs, contracts, dependencies, environment variables, configurations, or requirements that are not supported by the context, documentation, or task.
- Do not assume that every general HealthCore need described in `CONTEXT.md` is a requirement for the current task.
- Preserve bilingual versions and existing routes when modifying content that already uses them.
- Preserve the tolerance of existing contracts when the technical documentation indicates that an external API has non-standardized responses.

## Memory Bank

The Memory Bank must be updated when any of the following occurs:

- A change to the architecture or to the location/responsibility of a component.
- A new relevant technical decision.
- A completed or integrated feature.
- A new problem, limitation, or constraint.
- A significant change to development status, validations, or next steps.

Each file has a distinct responsibility:

- `memory-bank/projectbrief.md`: what the project is, why it exists, what problem it solves, and who uses it.
- `memory-bank/techContext.md`: how it is built, including the known stack, architecture, contracts, and technical constraints.
- `memory-bank/progress.md`: current development status, deliverables, gaps, validations, and next steps.

Do not mix temporary branch, build, or pending-task status into `projectbrief.md` or `techContext.md`; that information belongs in `progress.md` when relevant.

## Commits

The agent must not make commits automatically. It may prepare or execute a commit only when the developer explicitly requests it and after completing the entire pre-commit workflow defined in this file.

This guide does not authorize merges, branch deletion, or destructive changes. Those operations require a separate explicit request.
