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


## Alcance mínimo recomendado para GITHUB_TOKEN (revisión 16/11/2026)

El flujo chunked consulta y modifica únicamente Releases y sus assets del repositorio destino, y envía `repository_dispatch` al mismo repositorio.

Para un **Fine-grained personal access token**, la documentación oficial de GitHub indica que estas operaciones requieren `Contents: write`. Restringir el token a **Only select repositories → as-ghostt/appsem-store** y conceder únicamente **Repository permissions → Contents: Read and write**. No habilitar `Actions`, `Administration` ni `Workflows` para este flujo, salvo que una operación futura lo requiera y se justifique por separado.

Referencias oficiales:
- Create a repository dispatch event: https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event
- REST API endpoints for releases: https://docs.github.com/en/rest/releases/releases
- Fine-grained PAT permissions: https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens

**Importante:** el token está configurado como secreto en Cloudflare Production según el registro de despliegue, pero no se ha podido leer su configuración de permisos. Este apartado es una recomendación verificada contra la documentación de GitHub, no una afirmación de que el token existente ya tenga ese alcance.


## Verificación criptográfica del APK antes de publicar — 16/11/2026

El workflow `.github/workflows/appsem-apk-assemble.yml` ejecuta ahora `apksigner verify --verbose` sobre el APK ensamblado antes de subirlo a la Release. También descarga y vuelve a verificar el APK final cuando retoma una ejecución interrumpida después de la subida. Si `apksigner` no está disponible en el runner, el flujo falla cerrado y no publica.

**Alcance exacto:** `apksigner verify` comprueba la validez criptográfica de la firma APK y los esquemas de firma que reconoce. Por sí solo no identifica al desarrollador legítimo: no se ha configurado todavía un pin de certificado SHA-256 por aplicación/slug. El único fingerprint presente en `assetlinks.json` corresponde a AuthPro (`com.appsmarttechnology.authpro`) y no debe reutilizarse para BotShow ni otras aplicaciones. Para activar pinning hace falta obtener la huella SHA-256 de cada certificado de firma legítimo desde su keystore/Play App Signing o desde un APK oficial de referencia confiable.

La verificación de firma se realiza antes del paso `gh release upload`; el test estático comprueba este orden. El CI debe confirmar la ejecución real del runner y la disponibilidad de Android SDK Build Tools. No se publicó ninguna Release real ni se desplegó Cloudflare.
