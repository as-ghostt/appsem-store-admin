# Subida de APK a GitHub Releases — Appsem Admin

**Código desplegado en Cloudflare Pages; token configurado y capacidad de carga verificada desde Cloudflare.**

La tienda usa `app.apkUrl` para descargar los APK. El formulario de Admin permite elegir un archivo o introducir manualmente un enlace de Release.

## Arquitectura en la cuenta CEO
- Admin: `https://appsem-store-admin.pages.dev`, repositorio `as-ghostt/appsem-store-admin`.
- Ruta de carga: `functions/api/upload-apk.js` → `worker/github-releases.js`.
- Destino público: Releases de `as-ghostt/appsem-store`.
- Base de datos: Firestore `webs-8b1bf`, sin cambios de reglas ni colecciones.
- El navegador transmite un Firebase ID token; el servidor comprueba firma, audiencia, expiración y correo administrativo verificado.
- La URL directa de descarga se devuelve al formulario; pulsar **Guardar app** la registra en Firestore.

## Credencial configurada y comprobada
- `GITHUB_TOKEN` está guardado como **Secret / Encrypt** en Cloudflare Production y nunca llega al navegador.
- El 12/11/2026 Cloudflare Pages comprobó con ese token acceso al repositorio, **creación de una Release privada en borrador, subida de un asset sintético y eliminación del borrador**. El asset no era un APK válido y nunca fue publicado.
- El test automatizado de la ruta Cloudflare ahora verifica una identidad Firebase firmada, consulta y creación de versión y respuesta de subida con una API GitHub simulada, sin datos ni credenciales reales.
- **Pendiente de aceptación funcional:** abrir Admin con el administrador autorizado, cargar un APK legítimo y comprobar que el enlace público y el guardado en Firestore funcionan. No confundir el test técnico de GitHub con esa verificación de interfaz.

Las variables no secretas `GITHUB_REPOSITORY`, `ADMIN_EMAIL`, `FIREBASE_PROJECT_ID`, `VITE_APK_UPLOAD_API` y `VITE_PUBLIC_STORE_URL` ya se configuraron en Pages Production.

## Límites y operación
- Upload automático vía Cloudflare: hasta **95 MB** por archivo, por debajo del límite de peticiones del plan Free. Si el navegador omite `Content-Length`, Cloudflare aplica su límite de tamaño de solicitud; el cliente comprueba igualmente 95 MB.
- GitHub Releases acepta hasta 2 GiB por asset. Para archivos mayores de 95 MB, subirlos manualmente a Releases y pegar el enlace.
- No sobrescribir un asset existente bajo la misma versión y nombre; publicar una versión nueva.
- El repositorio destino debe continuar público para permitir descargas anónimas.
- Si un APK se carga y no se guarda el formulario en Firestore, queda una Release sin referencia: revisar versiones no publicadas.
- No existen secretos de GitHub guardados en código. El endpoint responde 503 si falta el secreto; en el despliegue actual está configurado.

Integración vinculada a la fase 4 de `docs/auditorias/Auditoria_1_Appsem_Store_Admin.md`; no cerrar las fases de auditoría aún pendientes.
