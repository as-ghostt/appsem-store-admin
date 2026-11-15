/**
 * La vista pública solo existe para una ficha ya publicada en Firebase.
 * El slug que se edita localmente no tiene una ruta pública hasta guardarse.
 */
export function publishedCatalogPreviewSlug(isEdit, originalApp, draftSlug) {
  if (!isEdit || !originalApp || originalApp.status !== 'published') return '';
  const savedSlug = typeof originalApp.slug === 'string' ? originalApp.slug : '';
  return savedSlug && savedSlug === draftSlug ? savedSlug : '';
}
