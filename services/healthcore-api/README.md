# HealthCore API

Backend centralizado de HealthCore, organizado por capas, con CRUD de usuarios y perfiles, autenticación JWT y persistencia JSON mediante TinyDB.

## Requisitos

- Python 3.11+
- Dependencias listadas en `requirements.txt`

## Ejecutar localmente

Desde esta carpeta:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

La aplicación estará disponible en `http://127.0.0.1:8000`; la documentación interactiva de FastAPI estará en `/docs` y ReDoc en `/redoc`.

### Configuración

Configura `HEALTHCORE_JWT_SECRET` (o `SECRET_KEY`) con un secreto aleatorio robusto en tu `.env` local antes de iniciar la API. El servicio carga `.env` local o desde el directorio de ejecución. `ACCESS_TOKEN_EXPIRE_MINUTES` establece la duración del token (30 minutos por defecto). Opcionalmente, `HEALTHCORE_DB_PATH` permite cambiar la ruta del archivo JSON.

Para notificaciones de creación de cuenta e inicio de sesión, configura `RESEND_API_KEY` y `RESEND_FROM_EMAIL` en `.env`. El remitente debe estar verificado en Resend. Los correos se envían como tarea en segundo plano; si la configuración falta o Resend falla, el registro/login se completa de todos modos.

El primer administrador se puede crear al arranque definiendo ambos valores `HEALTHCORE_BOOTSTRAP_ADMIN_EMAIL` y `HEALTHCORE_BOOTSTRAP_ADMIN_PASSWORD`. El bootstrap no hace nada si ya existe un administrador. No guardes estas credenciales en el repositorio.

```bash
export HEALTHCORE_JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
export ACCESS_TOKEN_EXPIRE_MINUTES=30
export HEALTHCORE_BOOTSTRAP_ADMIN_EMAIL="admin@example.com"
export HEALTHCORE_BOOTSTRAP_ADMIN_PASSWORD="use-a-long-unique-secret"
uvicorn app.main:app --reload
```

### Endpoints

- `POST /users`: registra con `email`, `password` y un `profile` opcional (`name`, `phone`, `address`); el rol asignado es `user`.
- `GET /users` y `GET /users/{id}`: requieren bearer token.
- `PUT /users/{id}`: el usuario puede actualizar su cuenta; un admin también puede modificar `role` (`admin`, `manager`, `user`) y `is_active`.
- `DELETE /users/{id}`: elimina la cuenta y su perfil asociado.
- `POST /auth/login`: acepta JSON `{ "email": "...", "password": "..." }` y devuelve `access_token`.
- `GET /auth/me`: devuelve email, role y el perfil vinculado.
- `GET /profiles/me` y `PUT /profiles/me`: consultan y actualizan el perfil propio (`name`, `phone`, `address`).
- `/profiles/{user_id}`: rutas protegidas para gestionar perfil por usuario; solo el dueño o un admin.
- `GET /health`: liveness.

## Capas

- `api/routes/`: endpoints y adaptación HTTP.
- `api/deps.py`: dependencias FastAPI de autenticación/autorización.
- `core/`: configuración y seguridad transversal.
- `db/`: inicialización y acceso a TinyDB.
- `models/`: entidades del dominio/persistencia (`User`, `Profile`).
- `schemas/`: contratos y validación Pydantic de entrada/salida.
- `repositories/`: acceso a datos, encapsulando TinyDB.
- `services/`: lógica de negocio y coordinación de repositorios.

Las rutas no accederán directamente a TinyDB: delegarán en servicios, que usarán repositorios. Los esquemas de API serán distintos de los modelos persistidos para evitar exponer campos sensibles como `hashed_password`.

TinyDB crea el archivo de datos cuando se abre la conexión e inicializa las tablas `users` y `profiles`. Las contraseñas se almacenan con bcrypt mediante `libpass[bcrypt]`; los esquemas de respuesta nunca retornan los hashes. Mantén el `.env` fuera del control de versiones y no compartas el secreto JWT.

Este proyecto es una base de desarrollo y no está aprobado para almacenar datos reales de pacientes. Antes de cualquier uso con información sanitaria, se requiere revisión de seguridad y cumplimiento HIPAA/UK GDPR.
