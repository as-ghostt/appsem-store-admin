# Auditoría fase 4 — gestión del catálogo Appsem

**Fecha:** 14 de noviembre de 2026
**Alcance:** Appsem Store (`as-ghostt/appsem-store`) y Admin (`as-ghostt/appsem-store-admin`)
**Firebase:** `webs-8b1bf`
**Rama:** `main`
**Estado:** implementación y validación parcial; pendiente de cierre E2E.

## Cambios implementados

### Tienda pública
- Se evita el icono roto si el recurso remoto de una ficha o tarjeta no carga; el fallback se aplica también cuando la URL existe pero la petición falla.
- Helper: `src/utils/appIconFallback.js`; prueba de cambio de icono y prevención de bucle de fallos.
- Commit de referencia: `7afeff7` (Cloudflare Production `success`, 41 pruebas aprobadas y 0 fallos).

### Panel administrativo
- Validación de slug canónico: minúsculas, números y guiones, hasta 80 caracteres; el generador elimina guiones de borde.
- Se consulta el catálogo para impedir un slug ocupado por una ficha antigua; las nuevas fichas usan `apps/{slug}` con creación en transacción, de modo que dos altas concurrentes con el mismo slug no se duplican.
- Las ediciones comprueban el slug contra fichas existentes y el ID canónico dentro de la transacción.
- Se limita la introducción de URLs opcionales a HTTPS públicas para iconos, banners, capturas y enlaces legales. **Los enlaces de Play Store, APK y documentos legales permanecen opcionales**.
- Se bloquearon los envíos repetidos del formulario con un guard síncrono y se diferenciaron visualmente los fallos de guardado de las confirmaciones exitosas.
- Se incorporaron pruebas unitarias y con Firebase Emulator para duplicados y altas concurrentes. GitHub Actions [#43628517568](https://github.com/as-ghostt/appsem-store-admin/actions/runs/43628517568) terminó `success`.
- Commits de referencia: `a2270f7`, `ac53077`, `c771d8a`.

**Nota de concurrencia:** el ID basado en slug garantiza exclusividad para las **altas nuevas**. Para dos ediciones simultáneas de fichas históricas con IDs aleatorios, la comprobación de disponibilidad no constituye una reserva transaccional global. Cerrar esa garantía requeriría índice/registro coordinado y revisión conjunta de reglas; no se modificaron reglas ni datos productivos.

## Auditoría de producción solo lectura

Ejecutada una vez desde el entorno privado de compilación Cloudflare, con la credencial Firebase en Secret y guardia explícita de solo lectura. Script: `scripts/phase4/cloudflare-catalog-audit.mjs`; núcleo verificable: `scripts/phase4/catalog-quality.mjs`. No publica nombres, enlaces, IDs ni información personal; emite solo recuentos. Comando normal de build restaurado al terminar.

| Control | Resultado |
| --- | ---: |
| Apps inspeccionadas | 5 |
| Apps publicadas | 5 |
| Slugs vacíos / incorrectos | 0 |
| Slugs duplicados | 0 |
| Iconos ausentes | 0 |
| URLs mal formadas de iconos | 0 |
| URLs mal formadas de banners | 0 |
| URLs mal formadas de capturas | 0 |
| URLs mal formadas de APK | 0 |
| URLs mal formadas de Google Play | **1** |
| URLs legales mal formadas | 0 |
| Apps publicadas sin Play ni APK | 0 |
| Escrituras realizadas | **0** |

**Dictamen:** se confirmó una URL histórica de Google Play no válida. La tienda pública ya filtra destinos de descarga no reconocidos, de modo que este campo no debe activar un enlace; la limpieza del documento productivo se reservará para una corrección autorizada y con respaldo. **La verificación sintáctica de enlaces no garantiza que las imágenes se puedan descargar.** Por tanto, la captura previa del icono roto puede deberse a un servidor externo inaccesible, aun con una URL formalmente válida. El fallback mantiene la presentación.

**Resultado técnico:** la ejecución puntual de Cloudflare terminó `success` y aprobó 42 pruebas del panel Admin. La tienda aprobó 41 pruebas y continúa con despliegue `success`.

## Criterios pendientes de cierre de fase 4
1. Prueba E2E real de crear, editar, ocultar y publicar con el formulario nuevo, y revisión en móvil/desktop (sin alterar fichas reales no autorizadas).
2. Verificar accesibilidad efectiva de las imágenes externas desde navegadores y corregir URLs de origen incorrectas sin sustituir imágenes por inventadas.
3. Resolver la única URL histórica de Play Store inválida tras respaldo verificable.
4. Resolver exclusividad fuerte en edición simultánea de fichas históricas, si se necesita soporte multiadministrador.
5. Mantener fase 3 abierta hasta disponer de respaldo productivo privado/restaurable y resolver los dos `ratingSum` heredados. No confundir pruebas con Firebase Emulator con modificaciones reales.

**No se alteraron Firestore Rules, datos del catálogo ni contadores reales.**
