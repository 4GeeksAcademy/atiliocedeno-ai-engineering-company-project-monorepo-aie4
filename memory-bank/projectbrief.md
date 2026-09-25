# Project Brief

## Proyecto y fuente de contexto

Este repositorio es el proyecto transversal de AI Engineering de 4Geeks Academy para **HealthCore**. La fuente principal de verdad sobre el negocio es [`CONTEXT.es.md`](../CONTEXT.es.md). El proyecto debe conservar la separación entre contexto empresarial, implementación técnica y evolución por hitos.

## Qué es HealthCore

HealthCore es una empresa sanitaria de atención ambulatoria fundada en 2011 en Austin, Texas. Opera 12 clínicas: 9 en Estados Unidos y 3 en el Reino Unido. Ofrece atención primaria, consultas con especialistas, gestión de enfermedades crónicas y programas de salud preventiva. Cuenta con aproximadamente 200 empleados y una facturación anual cercana a 28 millones de dólares.

La empresa está organizada en Operaciones Clínicas, Experiencia del Paciente y Acceso, Ciclo de Ingresos y Facturación, Cumplimiento y Gobierno del Dato, Personas y Fuerza Laboral, Tecnología y Dirección Ejecutiva. La unidad interna **HealthCore Digital** construye sistemas, flujos de trabajo y herramientas inteligentes para modernizar la operación.

## Problema que resuelve el proyecto

HealthCore opera con sistemas heredados que no se comunican correctamente: dos plataformas EHR, facturación separada por país, reservas telefónicas y ausencia de una capa de datos compartida. Esto dificulta la coordinación entre sedes y países, la visibilidad operativa y la toma de decisiones.

El proyecto busca proporcionar interfaces y servicios que hagan más accesibles y consistentes los procesos de HealthCore, respetando las obligaciones de HIPAA y UK GDPR. Las necesidades de negocio incluyen mejorar el acceso y las citas, las operaciones clínicas, la facturación, el cumplimiento, la gestión de personas y la información ejecutiva.

## Usuarios y áreas

- Pacientes y prospectos que necesitan información y contacto con HealthCore.
- Personal clínico y Operaciones Clínicas, bajo la dirección del Dr. Marcus Reid.
- Experiencia del Paciente y Acceso, bajo Priya Nair.
- Ciclo de Ingresos y Facturación, bajo Tom Callahan.
- Cumplimiento y Gobierno del Dato, bajo Claire Whitfield.
- Personas y Fuerza Laboral, bajo Diane Foster.
- Tecnología, bajo James Osei.
- Dirección Ejecutiva, bajo la Dra. Sandra Okonkwo.

## Objetivos generales

- Construir soluciones digitales seguras y centradas en el paciente.
- Reducir la fragmentación de información entre clínicas, países y áreas.
- Facilitar la operación y la toma de decisiones con información más accesible.
- Evolucionar el monorepo siguiendo responsabilidades separadas para interfaces públicas, herramientas internas y servicios.

## Propósito de la arquitectura del Hito 4

- **`/uis/website`**: presencia web pública de HealthCore para pacientes y prospectos. El Hito 1 previo —landing y formulario estáticos en la raíz— es el antecedente de esta responsabilidad.
- **`/uis/backoffice`**: aplicación interna para capacidades administrativas y operativas. El Talent Pipeline Tracker es una implementación previa relacionada con Personas y Fuerza Laboral, reutilizable como antecedente para esta responsabilidad.
- **`/services`**: espacio para servicios backend que soporten las interfaces y procesos de HealthCore. Su implementación concreta y tecnologías deben basarse en los requisitos del Hito 4; no se declara aquí una implementación que aún no existe.

El Hito 1 y el Talent Pipeline Tracker son antecedentes relevantes, no el foco principal del Hito 4.
