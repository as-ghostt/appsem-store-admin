# Subida de APK a GitHub Releases — AppsEM Store Admin

**Código desplegado en Cloudflare Pages; subida real pendiente de una credencial secreta.**

La tienda usa `app.apkUrl` para descargar los APK. El formulario de Admin permite elegir un archivo o introducir manualmente un enlace de Release.

## Arquitectura en la cuenta CEO
- Admin: `https://appsem-store-admin.pages.dev`, repositorio `as-ghostt/appsem-store-admin`.
- Ruta de carga: `functions/api/upload-apk.js` → `worker/github-releases.js`.
- Destino público: Releases de `as-ghostt/appsem-store`.
- Base de datos: Firestore `webs-8b1bf`, sin cambios de reglas ni colecciones.
- El navegador transmite un Firebase ID token; el servidor comprueba firma, audiencia, expiración y correo administrativo verificado.
- La URL directa de descarga se devuelve al formulario; pulsar **Guardar app** la registra en Firestore.

## Única credencial pendiente para la subida automática
1. En la cuenta GitHub `as-ghostt`, generar un Fine-grained personal access token con permiso **Contents: Read and write** limitado exclusivamente al repositorio `appsem-store`.
2. Abrir Cloudflare CEO → Workers & Pages → `appsem-store-admin` → Settings → Variables and Secrets.
3. Añadir `GITHUB_TOKEN` para **Production** con tipo **Secret / Encrypt**, nunca como variable `VITE_*` ni en el repositorio.
4. Implementar un nuevo despliegue de `main` para asegurar que el secreto esté disponible.
5. Subir un APK de prueba desde el panel y verificar que la Release pública y la URL registrada funcionen antes de publicar apps reales.

Las variables no secretas `GITHUB_REPOSITORY`, `ADMIN_EMAIL`, `FIREBASE_PROJECT_ID`, `VITE_APK_UPLOAD_API` y `VITE_PUBLIC_STORE_URL` ya se configuraron en Pages Production.

## Límites y operación
- Upload automático vía Cloudflare: hasta **95 MB** por archivo, por debajo del límite de peticiones del plan Free. Si el navegador omite `Content-Length`, Cloudflare aplica su límite de tamaño de solicitud; el cliente comprueba igualmente 95 MB.
- GitHub Releases acepta hasta 2 GiB por asset. Para archivos mayores de 95 MB, subirlos manualmente a Releases y pegar el enlace.
- No sobrescribir un asset existente bajo la misma versión y nombre; publicar una versión nueva.
- El repositorio destino debe continuar público para permitir descargas anónimas.
- Si un APK se carga y no se guarda el formulario en Firestore, queda una Release sin referencia: revisar versiones no publicadas.
- No existen secretos de GitHub guardados en código; el endpoint responde 503 hasta configurar el secreto.

Integración vinculada a la fase 4 de `docs/auditorias/Auditoria_1_Appsem_Store_Admin.md`; no cerrar las fases de auditoría aún pendientes.
