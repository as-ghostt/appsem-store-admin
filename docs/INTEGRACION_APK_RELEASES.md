# Integración APK — GitHub Releases

## Estado
- Código del panel: añadido en main.
- Worker de subida: código añadido, **pendiente de despliegue en Cloudflare**.
- Prueba de carga real: **pendiente** (necesita credenciales y despliegue).
- Tienda pública: ya usa `app.downloadUrl || app.apkUrl || app.playStoreUrl`; no requiere cambios en este paso.
- Reglas de Firestore: sin cambios. No se ha tocado la auditoría de fases 1–3.

## Configuración obligatoria
Desplegar `worker/github-releases.js` como Cloudflare Worker (módulo ES). Configurar:

| Nombre | Tipo | Valor |
|---|---|---|
| `GITHUB_TOKEN` | **Secret** | Token GitHub fine-grained del propietario, con permisos Contents: read/write sobre el repositorio de Releases |
| `GITHUB_REPOSITORY` | Variable | `eler30mr-star/appsem-store` |
| `ADMIN_ORIGIN` | Variable | Origen HTTPS exacto de Vercel del panel administrativo, sin barra final |
| `FIREBASE_PROJECT_ID` | Variable | `webs-8b1bf` |
| `ADMIN_EMAIL` | Variable | Correo administrativo del proyecto (mismo que `src/config.js`) |

El token únicamente vive en los secrets del Worker. **Nunca** introducir un token de GitHub en `VITE_*`, Firestore ni en código React.

En la configuración de Vercel **del panel admin**, añadir:
```env
VITE_APK_UPLOAD_API=https://TU-WORKER.workers.dev
```
Sustituir por el dominio real del Worker, redeploy del panel y probar con una app en borrador.

## Publicación
1. Crear o editar la ficha; añadir `slug` y `currentVersion`.
2. Elegir un APK de hasta **95 MB** desde el formulario; el panel obtiene un ID token Firebase y llama al Worker.
3. Worker valida firma JWT con las claves oficiales Firebase, audiencia, emisor, expiración y administrador verificado.
4. Worker crea o reutiliza la Release con tag `apk/<slug>/v<version>` y carga el asset.
5. El panel recibe `apkUrl`; **pulsar Guardar app** para registrar el enlace en Firestore.
6. La tienda pública muestra la descarga al publicar la aplicación.

Se admite alternativamente pegar manualmente la URL `https://github.com/<owner>/<repo>/releases/download/<tag>/<archivo>.apk`. El enlace de Google Play deja de ser obligatorio si hay APK válido. Los dos enlaces pueden coexistir.

## Límites y cautelas
- El tamaño de cada asset de GitHub Releases admite hasta 2 GiB, **pero el camino de carga con Cloudflare Worker gratuito está limitado aquí a 95 MB por petición** (Cloudflare Free limita el cuerpo entrante a 100 MB). Los APK mayores requieren otro flujo, por ejemplo subir manualmente a Releases y pegar la URL, o una arquitectura distinta.
- Las Releases se publican en un repositorio GitHub **público**; no subir compilaciones privadas ni credenciales.
- Utilizar números de versión nuevos para sustituir APK; no sobrescribir assets ya publicados.
- La Release se crea antes de guardar Firestore. Si no se guarda el formulario, queda un asset sin referencia que debe revisarse.
- No se han ejecutado subidas reales ni configurado cuentas externas.
- Comprobar políticas de uso no comercial del plan Vercel Hobby si la tienda promociona aplicaciones monetizadas.

## Regresión obligatoria
- Probar creación con solo Play Store, solo APK y ambos enlaces.
- Rechazar URL no HTTPS, no GitHub Releases y extensiones incorrectas.
- Rechazar token no autorizado, token expirado, CORS incorrecto y archivo demasiado grande.
- Verificar que se mantiene el estado borrador, los datos previos, la moderación y los contadores.
- Revisar las políticas de GitHub y los límites de Cloudflare antes de subir archivos grandes.

**Relación con Auditoría 1:** esta integración forma parte de la fase 4 (gestión del catálogo). No equivale a cerrar la fase 4 ni las fases anteriores.
