# HealthCore · Sitio público

Aplicación Next.js bilingüe para pacientes. La landing está en `/` y `/en`. El formulario está en `/care-request` y `/en/care-request`. El formulario valida los datos localmente y muestra una confirmación de demostración. No envía ni guarda solicitudes.

Desde la raíz del repositorio:

    npm --prefix uis/website ci
    npm run serve:website

La aplicación escucha en el puerto 4173. Para mostrar el enlace de acceso del personal en el pie de la landing, define `HEALTHCORE_PORTAL_URL` con el origen absoluto del portal (por ejemplo, `http://localhost:3000`). Sin ese valor, la landing solo ofrece la navegación pública. Esta aplicación no necesita credenciales de FastAPI.

Las URL históricas de la landing y del formulario redirigen a sus rutas bilingües. Desde esta carpeta, ejecuta `npm test`, `npm run typecheck` y `npm run build`. Para iniciar la compilación desde la raíz, usa `npm run start:website`.
