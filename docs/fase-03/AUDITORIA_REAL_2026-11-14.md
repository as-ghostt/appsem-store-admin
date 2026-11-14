# Fase 3 — Auditoría de producción de Appsem Store

**Fecha de verificación:** 14/11/2026 · **Origen:** Firestore `webs-8b1bf` · **Modo:** solo lectura, sin cambios

## Evidencia confirmada
La lectura se ejecutó desde la compilación de Cloudflare Pages de `as-ghostt/appsem-store-admin`, commit `66beefda161240b6d0427f625f077db22e745cb3`. Las credenciales de servicio se usaron exclusivamente en el entorno privado del build. El informe público solo muestra agregados, no IDs, nombres, comentarios ni registros de usuarios.

| Control | Resultado |
| --- | ---: |
| Referencias de apps inspeccionadas | 5 |
| Apps existentes | 5 |
| Apps publicadas | 5 |
| Padres huérfanos | 0 |
| Errores de integridad confirmados | 0 |
| Hallazgos para revisión histórica | 2 |
| `RATING_SUM_DIFFERS_FROM_EVENTS` | 2 |

La conciliación no halló discrepancias comprobables de `commentsCount`, ni estados inválidos, ni padres huérfanos. Dos apps presentan diferencias entre `ratingSum` y la suma de los eventos de valoración observables. **No sustituir `ratingSum` por esa suma sin copia reciente verificable y revisión del historial:** los documentos conservados no certifican el historial completo. El código de backend puede usar promedios históricos como alternativa cuando `ratingSum` no es válido.

## Protecciones y límites
- Auditoría real acotada a 50 referencias y 1.000 documentos por subcolección; si excede el límite, no produce un reporte parcial engañoso.
- No se publicaron reglas, alteraron campos, borraron comentarios, modificaron estadísticas ni se ejecutaron escrituras de prueba.
- La ejecución temporal se retiró del comando de compilación Cloudflare al finalizar; la compilación habitual sigue siendo `npm run test:baseline && npm run build`.
- Se incorpora planificador de conciliación `scripts/phase3/reconciliation-plan.mjs` en **modo dry-run exclusivamente**. Identifica propuestas para discrepancias exactas de comentarios y obliga a verificar copia reciente, releer dentro de transacción y obtener autorización. Nunca propone reconciliar automáticamente valoraciones históricas.
- El respaldo cifrado de octubre es evidencia histórica; **no hay aún una copia actual, persistente y restaurada de noviembre**.

## Pendientes para cerrar Fase 3
1. Generar una copia de seguridad **actual**, cifrada, almacenada fuera del repositorio público y restaurada en Emulator.
2. Revisar los dos casos de diferencia de `ratingSum` con historial autorizado y decidir si son errores reales de datos heredados; no realizar cambios ciegos.
3. Probar archivado/restauración y moderación transaccional en un ambiente de pruebas contra reglas compatibles con los dos clientes (el código está cubierto por pruebas en Emulator, pendiente de verificación operativa completa).
4. Ejecutar el plan de reconciliación únicamente sobre datos sintéticos hasta disponer de respaldo actual y revisión del informe por aplicación.

**Dictamen:** integridad pública sin errores confirmados en este muestreo completo de las 5 referencias actuales; Fase 3 sigue ABIERTA por respaldo y dos revisiones históricas. Las fases 4–8 del plan maestro no se consideran automáticamente certificadas.
