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


## Simulación de conciliación ejecutada — 14/11/2026

Se repitió el auditor contra Firebase productivo y se ejecutó `buildReconciliationDryRun` sobre los resultados, usando el módulo puro `scripts/phase3/reconciliation-plan.mjs`.

| Resultado | Valor |
| --- | ---: |
| Apps inspeccionadas | 5 |
| Propuestas de revisión histórica | 2 |
| Propuestas de modificación automática de `ratingSum` | 0 |
| Escrituras aplicadas | 0 |
| Pruebas automatizadas aprobadas en Cloudflare | 30 |
| Resultado de despliegue | `success` |

Ambas propuestas son `rating-history-manual-review`; no se ejecutó ningún ajuste de comentarios, contadores o valoraciones. El entorno de compilación se devolvió a `npm run test:baseline && npm run build` al finalizar.

**Alcance:** este dry-run confirma que la herramienta genera un plan no destructivo sobre la lectura real. No equivale a una restauración probada de la base de datos ni a una autorización para reescribir agregados.


## Diagnóstico exacto de valoraciones — 14/11/2026

Se ejecutó el analizador `scripts/phase3/rating-forensics.mjs` sobre una **nueva lectura productiva de solo lectura** (mismo proyecto, sin IDs de aplicaciones ni visitantes en el registro).

| Campo | Caso 1 | Caso 2 |
| --- | ---: | ---: |
| `ratingCount` | 1 | 1 |
| Documentos de valoración observados | 1 | 1 |
| `ratingSum` actual | 0 | 0 |
| Suma observada de valoraciones | 5 | 5 |
| Diferencia actual − observada | −5 | −5 |
| `ratingAverage` actual | 5 | 5 |

**Conclusión precisa:** ambas discrepancias corresponden a un agregado `ratingSum` almacenado en cero mientras la valoración conservada, `ratingCount` y el promedio público son consistentes con una puntuación de cinco estrellas. Es compatible con un dato heredado sin inicialización, pero esta lectura no demuestra cuándo ni por qué quedó en cero.

**Corrección productiva:** no ejecutada. El plan mantiene `0` escrituras hasta verificar copia de seguridad actual y una transacción con comprobación del estado vigente. El código de la tienda ya calcula nuevas valoraciones usando el promedio histórico cuando `ratingSum` está fuera de rango; se añadió una prueba específica de este caso en `as-ghostt/appsem-store`, `tests/metrics-core.test.mjs`, commit `09def06b`.

## Protección de copia y archivado

Se agregó una prueba integral de recuperación aislada `tests/phase3/archive-encrypted-recovery-emulator.test.mjs` al repositorio Admin. Usa exclusivamente datos inventados en Firebase Emulator: app publicada con métricas y subcolecciones → archivado reversible → backup comprimido con SHA-256 → cifrado AES-256-GCM → descifrado y verificación → restauración → borrador → nueva publicación → moderación de comentarios idempotente. Su ejecución depende de la suite de Emulator de GitHub Actions y **no se debe confundir con la validación de una copia nueva de producción**.

La copia de datos **actual y persistente** todavía no se ha generado ni restaurado: el entorno de ejecución de Cloudflare no es un destino seguro de almacenamiento permanente, el repositorio es público y no se configuró una clave de cifrado del propietario ni un destino privado persistente. La prueba usa una frase sintética que nunca debe emplearse para información real.

**Estado de cierre:** confirmada la naturaleza de los dos hallazgos y preparado el control de recuperación. Permanecen abiertas la copia privada recuperable de noviembre y cualquier ajuste productivo de `ratingSum` condicionado a ella. No hubo escrituras de auditoría en Firestore.
