Actúa como un Senior Frontend Engineer especializado en Next.js, React y TypeScript.

Antes de escribir, modificar o eliminar cualquier código, analiza completamente la estructura actual del proyecto.

# Contexto

Estamos trabajando en el Hito 3 — Talent Pipeline Tracker.

La nueva funcionalidad deberá integrarse dentro del sistema existente.

El homepage actual debe conservarse.

Posteriormente agregaremos desde ese homepage un acceso llamado:

**"Nuevos talentos"**

que llevará al módulo de gestión de talentos.

IMPORTANTE: todavía NO implementes esta funcionalidad.

# Tarea actual

Realiza únicamente una auditoría técnica completa del proyecto existente.

Analiza recursivamente todos los archivos y carpetas relevantes del proyecto para comprender cómo está construido antes de proponer cualquier modificación.

# Debes revisar

1. Estructura general del repositorio y del proyecto.
2. Estructura de carpetas dentro de `app/`.
3. Todas las rutas existentes.
4. `app/layout.tsx`.
5. Homepage actual (`app/page.tsx` o equivalente).
6. Componentes reutilizables existentes.
7. Carpeta `components/`.
8. Carpetas `lib/`, `services/`, `hooks/`, `types/`, `utils/` o equivalentes, si existen.
9. Archivos de estilos globales.
10. Configuración de Tailwind.
11. `package.json` y dependencias instaladas.
12. Configuración de TypeScript.
13. Configuración de Next.js.
14. Variables de entorno existentes.
15. Sistema actual de navegación.
16. Navbar, Sidebar, Header, Footer o menú principal existentes.
17. Convenciones de nombres utilizadas.
18. Patrones de diseño de componentes.
19. Manejo actual de estado.
20. Manejo actual de peticiones HTTP o servicios API.
21. Manejo de loading y errores.
22. Componentes de formularios existentes.
23. Componentes UI reutilizables existentes.
24. Diseño visual, colores, tipografía, espaciados y sistema visual usado actualmente.
25. Cualquier código relacionado con HealthCore o el contexto específico de la empresa.
26. `CONTEXT-company.md`, `CONTEXT.md`, `SPECS.md`, README u otros archivos de contexto que definan reglas del proyecto.

# Contexto de empresa

Busca y lee especialmente `CONTEXT-company.md`.

Necesitamos respetar exactamente:

* nombres de campos;
* estados;
* etapas;
* terminología;
* restricciones;
* contexto de HealthCore;
* reglas específicas del dominio.

No inventes valores que no aparezcan en dicho contexto.

# Analiza también la integración futura

Sin modificar código todavía, identifica cuál sería el lugar más adecuado para agregar en el homepage un acceso:

**"Nuevos talentos"**

Determina:

* en qué componente debería agregarse;
* si debe ir en Navbar, Sidebar, dashboard, menú o contenido principal;
* qué patrón de navegación ya utiliza el proyecto;
* qué ruta sería más coherente con la arquitectura existente;
* qué componentes actuales podemos reutilizar;
* qué componentes nuevos probablemente serán necesarios;
* cómo integrar Talent Pipeline Tracker sin romper ni duplicar la arquitectura actual.

# Talent Pipeline Tracker

La funcionalidad que posteriormente tendremos que incorporar deberá consumir esta API:

`NEXT_PUBLIC_API_URL=https://playground.4geeks.com/tracker/api/v1`

Endpoints:

* `GET /records`
* `POST /records`
* `GET /records/:id`
* `PUT /records/:id`
* `PATCH /records/:id`
* `DELETE /records/:id`
* `GET /records/:id/notes`
* `POST /records/:id/notes`
* `DELETE /records/:id/notes/:note_id`

El módulo posteriormente deberá permitir:

* listado de candidatos;
* búsqueda por nombre o email;
* filtro por estado;
* filtro por etapa;
* detalle de candidato;
* creación;
* edición;
* actualización de estado;
* actualización de etapa;
* listado de notas;
* creación de notas;
* eliminación de notas;
* estados de loading;
* manejo de errores;
* actualización de UI sin recargar completamente la página.

Pero NO debes implementar nada todavía.

# Restricciones

* NO crees un proyecto nuevo.
* NO ejecutes `create-next-app`.
* NO reemplaces el homepage.
* NO modifiques ningún archivo.
* NO elimines código.
* NO cambies estilos.
* NO instales dependencias.
* NO refactorices todavía.
* NO generes componentes todavía.
* NO asumas rutas que no existen.
* NO inventes estados ni etapas.
* NO escribas código de implementación.
* NO realices commits.
* NO hagas cambios automáticos.
* NO propongas una arquitectura genérica ignorando la existente.

# Formato obligatorio de la salida

La respuesta debe estar basada exclusivamente en archivos REALES encontrados en el repositorio.

Cada vez que menciones un archivo importante, indica su ruta completa o relativa dentro del proyecto.

Cuando una conclusión dependa de código existente, indica qué archivo respalda esa conclusión.

Distingue claramente entre:

* **Detectado:** existe actualmente en el proyecto.
* **Recomendado:** propuesta para la futura implementación.
* **No encontrado:** buscaste el elemento pero no existe.
* **Pendiente de confirmar:** la evidencia actual no permite determinarlo.

No mezcles hechos existentes con recomendaciones futuras.

# Resultado esperado

## 1. Stack actual

Describe exactamente las tecnologías detectadas.

Incluye versiones cuando puedan obtenerse de `package.json`.

## 2. Árbol relevante del proyecto

Muestra únicamente las carpetas y archivos importantes para la futura integración.

No muestres `node_modules`, builds ni archivos irrelevantes.

## 3. Arquitectura actual

Explica cómo está organizado el sistema.

Indica:

* ubicación principal de la aplicación;
* estructura de layouts;
* páginas;
* componentes;
* servicios;
* tipos;
* utilidades;
* estilos.

## 4. Homepage actual

Explica:

* ruta del archivo;
* componentes utilizados;
* estructura;
* navegación;
* acciones disponibles;
* dónde tendría sentido incorporar "Nuevos talentos".

## 5. Navegación existente

Explica cómo se gestionan actualmente:

* rutas;
* links;
* rutas dinámicas;
* navegación programática;
* menú principal.

## 6. Componentes reutilizables

Lista qué componentes existentes podríamos reutilizar para Talent Pipeline Tracker.

Para cada uno indica:

* archivo;
* propósito actual;
* cómo podría reutilizarse.

## 7. Sistema visual

Describe:

* layout;
* colores;
* tipografía;
* botones;
* formularios;
* cards;
* tablas;
* espaciado;
* responsive.

El nuevo módulo debe mantener este lenguaje visual.

## 8. Acceso a datos

Indica si existe:

* API client;
* helper de `fetch`;
* carpeta de services;
* manejo común de errores;
* variables de entorno;
* patrón async/await.

Explica qué patrón existente deberíamos seguir.

## 9. Manejo de estado

Indica:

* estado local;
* hooks personalizados;
* context;
* cualquier otra solución existente.

No propongas Redux, Zustand u otras librerías externas.

## 10. CONTEXT-company.md

Resume únicamente las reglas que afecten Talent Pipeline Tracker.

Extrae específicamente:

* nombre de la empresa;
* terminología de People/Talent;
* estados permitidos;
* etapas permitidas;
* nombres de campos;
* restricciones relevantes;
* valores específicos del dominio.

No inventes nada que no esté explícitamente definido.

## 11. Integración recomendada

Basándote únicamente en la arquitectura real encontrada, indica:

* dónde colocar "Nuevos talentos";
* archivo que habría que modificar;
* componente en el que debería aparecer;
* ruta recomendada;
* motivo de esa decisión;
* cómo debería integrarse con la navegación existente.

## 12. Rutas futuras recomendadas

Propón las rutas necesarias para Talent Pipeline Tracker respetando la arquitectura actual.

Por ejemplo, determina si sería más coherente utilizar algo como:

`/talents`

`/talents/[id]`

o alguna alternativa basada en el sistema ya existente.

No asumas estas rutas: dedúcelas de la arquitectura encontrada.

## 13. Archivos existentes que probablemente habrá que modificar

Para cada archivo indica:

* ruta;
* por qué habría que modificarlo;
* tipo de cambio esperado.

No lo modifiques todavía.

## 14. Archivos nuevos que probablemente habrá que crear

Para cada archivo propuesto indica:

* ruta;
* responsabilidad;
* motivo de su existencia.

Evita archivos innecesarios.

## 15. Riesgos o inconsistencias encontradas

Detecta:

* componentes duplicados;
* rutas problemáticas;
* código demasiado acoplado;
* archivos demasiado grandes;
* estilos inconsistentes;
* problemas potenciales;
* deuda técnica que pueda afectar esta integración.

## 16. Plan de implementación

Propón el orden exacto en que debería implementarse Talent Pipeline Tracker.

El plan debe minimizar cambios innecesarios y preservar el sistema existente.

No implementes el plan.

# Contexto de salida para el siguiente agente

Al final del informe genera obligatoriamente una sección llamada:

## 17. CONTEXTO OPERATIVO PARA LA SIGUIENTE IMPLEMENTACIÓN

Esta sección será utilizada directamente como entrada de otro agente, por lo que debe ser breve, precisa y autocontenida.

Debe incluir exactamente:

### Proyecto detectado

* ruta raíz de la aplicación;
* framework;
* versión aproximada;
* estructura principal.

### Homepage

* ruta del archivo;
* componente principal;
* sistema de navegación utilizado;
* lugar recomendado para agregar "Nuevos talentos".

### Ruta recomendada para Talent Pipeline Tracker

Indica la ruta exacta recomendada basada en la arquitectura real.

### Archivos a modificar

Lista únicamente las rutas.

### Archivos a crear

Lista únicamente las rutas.

### Componentes reutilizables

Lista:

`archivo → componente → uso futuro`

### API

Base URL:

`https://playground.4geeks.com/tracker/api/v1`

Endpoints necesarios:

* GET `/records`
* POST `/records`
* GET `/records/:id`
* PUT `/records/:id`
* PATCH `/records/:id`
* DELETE `/records/:id`
* GET `/records/:id/notes`
* POST `/records/:id/notes`
* DELETE `/records/:id/notes/:note_id`

### Dominio HealthCore

Resume los valores exactos detectados para:

* estados;
* etapas;
* campos;
* terminología;
* restricciones.

### Convenciones existentes

Resume:

* naming;
* componentes;
* estilos;
* fetch/API;
* manejo de errores;
* loading;
* formularios;
* navegación.

### Restricciones que el próximo agente debe respetar

Incluye explícitamente:

* no reemplazar homepage;
* no crear otro proyecto;
* no duplicar componentes existentes;
* no inventar estados;
* respetar `CONTEXT-company.md`;
* utilizar Next.js App Router;
* utilizar React;
* utilizar TypeScript;
* no agregar librerías de gestión de estado;
* integrar el módulo al sistema existente;
* preservar el lenguaje visual existente.

### Próximo paso recomendado

Escribe UNA sola instrucción concreta indicando cuál debería ser la primera modificación a realizar en la siguiente fase.

# Regla final

Primero comprende el sistema existente.

No quiero una solución genérica basada en cómo normalmente se estructura un proyecto Next.js.

Todas tus conclusiones deben estar basadas en los archivos REALES encontrados en este repositorio.

Si algo no existe, indícalo explícitamente.

Si algo no está claro, investiga el código relacionado antes de asumirlo.

No cambies ningún archivo.

Al terminar la auditoría y generar el `CONTEXTO OPERATIVO PARA LA SIGUIENTE IMPLEMENTACIÓN`, DETENTE.

No implementes nada hasta recibir una nueva instrucción.
