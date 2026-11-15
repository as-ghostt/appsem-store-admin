/**
 * Fase 4: inventario agregado de slugs de catálogo.
 * Entrada temporal en memoria, salida exclusivamente estadística.
 * Nunca devuelve nombres, slugs, IDs, alias ni información personal.
 */
import { isValidCatalogSlug } from '../../src/utils/catalogSlug.js';

export function auditCatalogSlugs(docs) {
  if (!Array.isArray(docs)) throw Error('Inventario de catálogo inválido.');
  let existing = 0;
  let canonical = 0;
  let legacy = 0;
  let missing = 0;
  let invalid = 0;
  let conflictingEntries = 0;
  const counts = new Map();
  for (const item of docs) {
    if (!item || typeof item.id !== 'string' || typeof item.exists !== 'boolean') {
      throw Error('Referencia de catálogo inválida.');
    }
    if (!item.exists) continue;
    existing++;
    const slug = item.slug;
    if (typeof slug !== 'string' || !slug.trim()) {
      missing++;
      continue;
    }
    if (!isValidCatalogSlug(slug)) {
      invalid++;
      continue;
    }
    if (item.id === slug) canonical++;
    else legacy++;
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }
  let duplicateSlugs = 0;
  for (const count of counts.values()) {
    if (count > 1) {
      duplicateSlugs++;
      conflictingEntries += count;
    }
  }
  return {
    schemaVersion: 'appsem-slug-audit-v1',
    mode: 'read-only',
    existingApps: existing,
    canonicalIdApps: canonical,
    legacyIdApps: legacy,
    missingSlugApps: missing,
    invalidSlugApps: invalid,
    duplicateSlugGroups: duplicateSlugs,
    appsWithDuplicateSlug: conflictingEntries,
    writesApplied: 0,
    indexingAction: 'none',
    advisory: 'No se ha creado un índice transaccional ni se han modificado fichas.'
  };
}
