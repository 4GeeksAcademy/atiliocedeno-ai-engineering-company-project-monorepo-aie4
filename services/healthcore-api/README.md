# HealthCore API y portal

Este servicio es el backend propio de HealthCore: FastAPI, autenticación JWT y persistencia local con TinyDB. El portal web está en `uis/talent-pipeline-tracker` y también contiene el Talent Tracker, que consume una API externa. **La API externa y la API de HealthCore son distintas; configura sus URLs por separado.**

## Requisitos

- Git.
- Python 3.11 o superior.
- Node.js 20.9 o superior y npm (requeridos por Next.js 16).
- Una terminal. Los comandos siguientes son para Linux/macOS, incluido Codespaces.

## Clonar el monorepo

Reemplaza `<URL_DEL_REPOSITORIO>` con la URL de tu repositorio (HTTPS o SSH):

```bash
git clone <URL_DEL_REPOSITORIO>
cd <nombre-de-la-carpeta-clonada>
```

El backend y el frontend se instalan por separado; no hay un comando `npm` global para ejecutar todo el monorepo.

## Configurar y arrancar

### 1. Preparar la API

En la primera terminal, desde la raíz del repositorio:

```bash
cd services/healthcore-api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Crea `services/healthcore-api/.env` (junto a `requirements.txt`) y añade la configuración indicada en [Variables de entorno](#variables-de-entorno). El archivo `.env` contiene secretos: no lo subas al repositorio ni compartas su contenido.

Inicia la API:

```bash
uvicorn app.main:app --reload
```

Déjala ejecutándose en esta terminal. La API queda en <http://127.0.0.1:8000>, la documentación interactiva en <http://127.0.0.1:8000/docs> y ReDoc en <http://127.0.0.1:8000/redoc>.

### 2. Configurar y arrancar el portal

Abre una segunda terminal desde la raíz del repositorio:

```bash
cd uis/talent-pipeline-tracker
npm ci
```

Crea `uis/talent-pipeline-tracker/.env.local` y añade las variables del frontend indicadas abajo. Después ejecuta:

```bash
npm run dev
```

Abre <http://localhost:3000>. La página inicial redirige a la landing de HealthCore (`/index.html`). El botón **“Ingresar”** está en el **footer**, junto a los iconos de redes sociales; en inglés aparece como **“Sign in”**. Ese botón lleva a `/login`. También se puede abrir directamente <http://localhost:3000/login>. El formulario permite registrarse desde el enlace “Regístrate”/“Sign up” y luego iniciar sesión.

### 3. Crear la cuenta administradora inicial

La forma recomendada es la herramienta de terminal. Con el entorno virtual del backend activado, detén temporalmente el servidor API (Ctrl+C) para evitar que dos procesos locales escriban TinyDB a la vez y, desde `services/healthcore-api`, ejecuta:

```bash
python -m scripts.manage_admin
```

La herramienta muestra primero las cuentas y perfiles existentes, sin revelar hashes ni contraseñas. Si aún no hay admin, pide el correo y solicita la contraseña de forma oculta (mínimo 12 caracteres). Si el correo ya pertenece a una cuenta, pide confirmación antes de promoverla y cambiar la contraseña. Si ya existe cualquier administrador, termina sin modificar cuentas ni credenciales. Al terminar, vuelve a iniciar la API con `uvicorn app.main:app --reload` y entra al portal con esa cuenta.

El registro público siempre crea usuarios regulares. Los usuarios regulares solo pueden gestionar su propio perfil; únicamente un administrador puede consultar y administrar las cuentas y perfiles de otras personas. También existe un bootstrap opcional al iniciar la API mediante variables de entorno; no lo combines con secretos guardados en el repositorio.

## Variables de entorno

Hay **dos archivos diferentes**. Las variables del backend van en `services/healthcore-api/.env`; las que comienzan con `NEXT_PUBLIC_` van en `uis/talent-pipeline-tracker/.env.local`. En los ejemplos, reemplaza los valores de muestra en tu propia máquina. No uses secretos de ejemplo en producción.

### Backend: `services/healthcore-api/.env`

```dotenv
HEALTHCORE_JWT_SECRET=REEMPLAZA_POR_UN_SECRETO_ALEATORIO_LARGO
ACCESS_TOKEN_EXPIRE_MINUTES=30
HEALTHCORE_FRONTEND_URL=http://localhost:3000

# Opcionales: correo transaccional mediante Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Opcionales: bootstrap automático del primer administrador al arrancar
# HEALTHCORE_BOOTSTRAP_ADMIN_EMAIL=admin@tu-dominio.example
# HEALTHCORE_BOOTSTRAP_ADMIN_PASSWORD=REEMPLAZA_POR_UNA_CONTRASENA_LARGA

# Opcional: ruta personalizada para el archivo de TinyDB
# HEALTHCORE_DB_PATH=/ruta/local/healthcore.json
```

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `HEALTHCORE_JWT_SECRET` | Sí | Secreto fuerte que firma los tokens. Genera uno localmente con `python -c 'import secrets; print(secrets.token_urlsafe(48))'` y pega el resultado como valor. No publiques ni reutilices el valor del ejemplo. El backend también admite `SECRET_KEY` como alternativa heredada, pero si ambas están definidas prevalece `HEALTHCORE_JWT_SECRET`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Duración del token de acceso; por defecto, 30 minutos. También se reconoce `HEALTHCORE_ACCESS_TOKEN_MINUTES` como nombre alternativo heredado. |
| `HEALTHCORE_FRONTEND_URL` | No en desarrollo local | Origen del frontend, sin ruta final; por defecto `http://localhost:3000`. Se usa para CORS y para construir enlaces de restablecimiento de contraseña. En otro host, reemplázalo por el origen real del frontend. |
| `RESEND_API_KEY` | No | Clave privada de Resend. Necesaria para enviar emails de notificación y recuperación de contraseña. |
| `RESEND_FROM_EMAIL` | No | Dirección remitente verificada en Resend. Configúrala junto con la clave anterior. Si falta cualquiera de las dos, el envío se omite. |
| `HEALTHCORE_BOOTSTRAP_ADMIN_EMAIL` | No | Correo para crear automáticamente el primer admin al arrancar la API. Se recomienda usar `scripts.manage_admin` en vez de almacenar credenciales en el `.env`. |
| `HEALTHCORE_BOOTSTRAP_ADMIN_PASSWORD` | No | Contraseña para el bootstrap automático. Debe definirse junto con el email; el bootstrap no altera una instalación que ya tenga admin. Mantén este secreto fuera de Git. |
| `HEALTHCORE_DB_PATH` | No | Ruta alternativa del archivo JSON de TinyDB. Si se omite, se usa `services/healthcore-api/data/healthcore.json`. |

Genera el secreto sin mostrar ni guardar el resultado en documentación:

```bash
python -c 'import secrets; print(secrets.token_urlsafe(48))'
```

Resend es opcional para ejecutar el portal y registrar/iniciar sesión. Sin ambas variables de Resend no se enviarán emails de alta, acceso ni recuperación de contraseña; por ello, para probar el restablecimiento de contraseña por email, configura una cuenta de Resend y un remitente verificado.

### Frontend: `uis/talent-pipeline-tracker/.env.local`

```dotenv
# API propia de HealthCore (no es la API del Talent Tracker)
NEXT_PUBLIC_HEALTHCORE_API_URL=http://localhost:8000

# API externa independiente, usada por la sección Talent Tracker
NEXT_PUBLIC_API_URL=https://playground.4geeks.com/tracker/api/v1
```

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_HEALTHCORE_API_URL` | URL base de la API HealthCore. En local usa `http://localhost:8000`; el código también usa esa URL si se omite. |
| `NEXT_PUBLIC_API_URL` | URL base de la API externa del Talent Tracker. No la cambies para apuntar a HealthCore; ambas aplicaciones tienen datos y endpoints distintos. La URL indicada es la de desarrollo usada por este proyecto. |

Reinicia `npm run dev` después de modificar `.env.local`, porque Next.js carga estas variables al arrancar.

## Rutas principales de la API

Los esquemas y ejemplos completos están disponibles en `/docs` mientras la API esté activa.

- `POST /users`: registro público; acepta un perfil inicial opcional y asigna el rol `user`.
- `GET /users`: lista usuarios, solo para admin. `GET /users/{id}`: propietario o admin.
- `PUT /users/{id}` y `DELETE /users/{id}`: propietario o admin; solo admin puede cambiar roles o estado de otras cuentas. La eliminación también elimina el perfil asociado.
- `POST /auth/login`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password` y `POST /auth/change-password`: inicio de sesión, cuenta y recuperación.
- `POST /auth/reset-password/validate` con `{ "token": "..." }`: comprueba si el enlace sigue vigente sin consumirlo; devuelve 400 si ha caducado o ya se utilizó. El restablecimiento vuelve a validar el token al guardar la contraseña.
- `GET`, `POST` y `PUT /profiles/me`: consultar, crear o actualizar el perfil de la cuenta autenticada.
- `/profiles/{user_id}`: operaciones por usuario protegidas; el propietario gestiona su perfil y admin puede gestionar perfiles de cualquier cuenta. Crear un perfil ajeno requiere admin.
- `GET /health`: verificación básica de disponibilidad.

## Incident Analysis: ejecución local

El briefing suministrado por el usuario define nueve columnas exactas: `incident_id,date,clinic_id,country,category,description,status,patient_id,satisfaction_score`. Se utiliza la tabla de aceptación de **100** filas; la introducción menciona 1.000, pero no corresponde al dataset de aceptación. El archivo de briefing no estaba en este checkout; su contenido fue proporcionado directamente durante la implementación.

El servicio real está en `services/healthcore-api` (no `services/api`). Se reutiliza FastAPI y la autenticación JWT existentes.

### Arquitectura y reglas

`app/schemas/incidents.py` centraliza `IncidentRecord`, `SatisfactionSummary`, `ValidationSummary`, `AnalysisResult`, `AnalysisAPIResponse` y `ExportState`, con Pydantic v2. Valida IDs ASCII de seis dígitos, fecha ISO/calendario, doce clínicas y país compatible, cinco categorías, tres estados, descripción de al menos cinco caracteres y satisfacción entera 1–5 obligatoria en cerrados. Las validaciones cruzadas se ejecutan por campo para recoger errores independientes incluso si otro campo falla.

`app/services/incident_analysis.py` itera CSV UTF-8 (BOM permitido), valida cada fila, detecta duplicados normalizados y suma exclusivamente registros válidos. Una fila inválida se cuenta una vez, pero puede contribuir a varias reglas. Las categorías, estados, países y puntuaciones incluyen los valores con conteo cero. `total_records = valid_records + invalid_records`; promedio y distribución de satisfacción solo usan incidentes válidos CLOSED.

`app/services/incident_reporting.py` comparte el informe de consola y exportación `metric,value,percentage` entre CLI y API. Porcentajes de categoría/estado/país: denominador de registros válidos; satisfacción: cerrados con score. Sin denominador, porcentaje 0; sin scores, promedio null/N/A.

### CLI

Desde la raíz con el entorno Python activo:

```bash
python scripts/analyze.py incidents-healthcore.csv
python scripts/analyze.py scripts/incidents-healthcore.csv --no-prompt
python scripts/analyze.py /ruta/a/archivo.csv --export /ruta/nueva/results.csv
python scripts/analyze.py incidents-healthcore.csv --json --no-prompt
```

El dataset original ya estaba versionado bajo `scripts/`; no existía en la raíz. Se añadió un enlace simbólico relativo `incidents-healthcore.csv -> scripts/incidents-healthcore.csv`, sin cambiar ni duplicar contenido. No se confirmó que el dataset fuera sintético: no redistribuir su contenido ni añadir nuevas copias a Git.

La CLI acepta cualquier ruta. En una terminal interactiva pregunta `¿Deseas exportar los resultados a CSV? [s / n]`; `s` crea `results.csv`. Sin terminal, con `--no-prompt`, `--json` o `--export`, no bloquea esperando entrada. La exportación no sobrescribe archivos existentes. Código 0: análisis completado, aunque incluya registros inválidos; código 2: error operativo. `--max-bytes` permite ajustar el límite de 25.000.000 bytes para procesamiento local de históricos.

### API

| Método y ruta | Comportamiento |
| --- | --- |
| `POST /api/incidents/analyze` | Bearer JWT + multipart `file`; valida CSV, devuelve todos los agregados y guarda el último resultado de la cuenta. |
| `GET /api/incidents/results/export` | Bearer JWT; descarga `results.csv` del último análisis de esa cuenta, sin volver a enviar el CSV. 404 si no existe. |

Los endpoints provisionales `/incidents/analyze` y `/incidents/export` se retiraron; todos los consumidores del repositorio usan las rutas requeridas. Errores: 400 entrada vacía/encoding/CSV/encabezados, 401 autenticación, 404 sin resultados, 413 tamaño excesivo, 415 extensión no CSV, 422 falta archivo o multipart incorrecto, 500 fallo interno sanitizado. Las filas con errores de negocio retornan 200 con sus conteos.

El repositorio TinyDB guarda únicamente un agregado por cuenta, bajo una clave de ID y fecha de creación; esto impide acceder al resultado de otra cuenta o de una cuenta eliminada cuyo ID se reutilice. No hay selector de usuario en el endpoint de exportación. Cargas fallidas conservan el último resultado exitoso.

### Backoffice

```bash
# Terminal backend, desde services/healthcore-api:
HEALTHCORE_FRONTEND_URL=http://localhost:4174 uvicorn app.main:app --reload
# Otra terminal, desde la raíz:
python3 -m http.server 4174 --bind 127.0.0.1 --directory uis/backoffice
```

Abrir `http://localhost:4174/#incident-analysis`, introducir un token obtenido mediante `/auth/login`, seleccionar CSV y analizar. El token permanece en el formulario y no se guarda en web storage. La URL por defecto es `http://localhost:8000`; `window.HEALTHCORE_API_URL` permite cambiarla. CORS conserva el único origen configurable existente: usa 3000 para el portal o 4174 para el backoffice. No se modificaron archivos `.env`.

### Pruebas y resultados

```bash
python -m pip install -r services/healthcore-api/requirements-dev.txt
python -m pytest services/healthcore-api/tests -q
python -m compileall -q services/healthcore-api/app scripts/analyze.py
npm --prefix uis/backoffice ci
npm --prefix uis/backoffice test
npm --prefix uis/backoffice run check
```

Verificados: 59 tests Python y 5 frontend, sin fallos ni omitidos; 100.000 filas sintéticas. La muestra produce 100/94/6, categorías 30/20/14/17/13, estados 28/52/14, países 61/33, scores 3/5/12/23/9, 52 cerrados puntuados y media 3.58. Descarga real desde navegador idéntica byte por byte a la exportación CLI. Tracker: typecheck y build correctos.

### Privacidad y límites

No se imprimen valores de origen, filas, IDs, descripciones ni objetos de error Pydantic. Las pruebas usan sentinelas sintéticos y comprueban API, exportación, consola, almacenamiento y logs. El procesamiento es local; no llama a LLMs. El archivo subido puede usar almacenamiento temporal de Starlette durante multipart; se cierra y descarta al terminar. El límite se comprueba después del parsing multipart y también durante el análisis: no es un límite del tráfico recibido por el servidor.

La detección de duplicados conserva hashes de IDs en memoria O(n); no se promete memoria constante para un millón de filas. TinyDB conserva solo agregados, pero sigue siendo almacenamiento local en un único proceso: no se implementaron TTL ni purga de agregados de cuentas eliminadas. Revisar política de retención, límites de petición y persistencia antes de producción. No hay certificación regulatoria. No se requiere Render ni otro proveedor cloud.

## Estructura y persistencia

- `app/api/routes/`: rutas y adaptación HTTP.
- `app/api/deps.py`: dependencias de autenticación y autorización.
- `app/core/`: seguridad y configuración transversal.
- `app/db/`, `app/repositories/`: inicialización y acceso a TinyDB.
- `app/models/`, `app/schemas/`: entidades y contratos de entrada/salida.
- `app/services/`: lógica de negocio.
- `scripts/manage_admin.py`: utilidad interactiva de administración inicial.

TinyDB crea el archivo configurado en `HEALTHCORE_DB_PATH` o, por defecto, `data/healthcore.json`. Conserva ese archivo si necesitas mantener las cuentas locales; no lo incluyas en una distribución pública si contiene datos reales. Las contraseñas se almacenan con bcrypt y nunca se devuelven en respuestas de la API.

Este proyecto es una base de desarrollo y no está aprobado para almacenar datos reales de pacientes. Antes de cualquier uso con información sanitaria, se requiere revisión de seguridad y cumplimiento HIPAA/UK GDPR.
