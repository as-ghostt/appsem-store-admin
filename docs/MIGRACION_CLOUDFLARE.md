# Migración a Cloudflare — AppsEM Admin

Estado: **preparación de código realizada, despliegue NO realizado**.

## Cuenta y bloqueo
- Cuenta Cloudflare inspeccionada: cuenta exclusiva `ceo.developer.appsem@gmail.com`.
- El intento de crear el proyecto Pages conectado a GitHub devolvió HTTP 401 / código `8000011`: "There is an internal issue with your Cloudflare Pages Git installation".
- **Se debe reparar o reinstalar la integración de GitHub en Cloudflare Pages antes de activar despliegues automáticos.**
- Vercel sigue siendo el alojamiento actual, sin cambios de DNS.

## Configuración prevista en Cloudflare Pages
- Proyecto: `appsem-store-admin`.
- Repositorio: `as-ghostt/appsem-store-admin`, rama `main`.
- Framework Vite/React; build `npm run build`, salida `dist`, directorio raíz `/`.
- `public/_redirects` asegura la navegación SPA.
- Variable de build `VITE_PUBLIC_STORE_URL`: URL HTTPS final del sitio público Cloudflare.
- Variable de build `VITE_APK_UPLOAD_API`: URL de Worker seguro de subida a GitHub Releases (cuando esté desplegado).

## Antes de sustituir Vercel
1. Reparar integración GitHub de Cloudflare y crear proyecto.
2. Desplegar `main`; comprobar navegación directa y recarga de `/apps`, login y edición.
3. Añadir el dominio nuevo al apartado **Authorized domains** de Firebase Authentication para Google Sign-In.
4. Validar operaciones de Admin contra reglas Firestore actuales; no publicar reglas de repositorio sin coordinación.
5. Desplegar Worker de GitHub Releases con su secreto en Cloudflare, verificar prueba real de APK.
6. Configurar la URL de tienda Cloudflare y probar enlaces desde el Admin.
7. Mantener Vercel operativo hasta terminar la comprobación funcional.

## Auditoría
Respetar `docs/auditorias/Auditoria_1_Appsem_Store_Admin.md` y `docs/fase-03/README.md`. Las fases 2 y 3 conservan pendientes de producción; esta preparación no las cierra. No se ha alterado Firebase ni el catálogo.

## Verificación de cuenta CEO (10/11/2026)
- GitHub conectado: `as-ghostt`, acceso administrador a ambos repositorios.
- Cloudflare conectado: `ceo.developer.appsem@gmail.com`, cuenta `0bdec89d523124e6346040488c71276a`.
- Intento de crear `appsem-store-admin` con GitHub en esta **cuenta CEO**: Cloudflare devolvió HTTP 401, código `8000011` (problema interno de instalación Git). La creación no se completó.
- La migración no debe utilizar cuentas diferentes de CEO. No mover tráfico ni retirar Vercel hasta validar un despliegue operativo.
