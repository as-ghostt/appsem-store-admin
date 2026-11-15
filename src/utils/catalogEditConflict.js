/**
 * Campos administrativos que pueden reemplazarse durante una edición.
 * Excluye los contadores y marcas de tiempo modificados por el backend.
 */
export const CATALOG_EDITOR_FIELDS = Object.freeze([
  'title', 'slug', 'categoryKey', 'category', 'shortDescription',
  'fullDescription', 'iconUrl', 'bannerUrl', 'screenshots',
  'playStoreUrl', 'apkUrl', 'privacyPolicyUrl', 'termsUrl',
  'legalNoticeUrl', 'accountDeletionUrl', 'securityReportUrl',
  'packageName', 'appSize', 'operatingSystem', 'minAndroidVersion',
  'currentVersion', 'lastUpdate', 'languages', 'offlineUse',
  'containsAds', 'inAppPurchases', 'ageRating', 'price', 'developer',
  'featured', 'status'
]);

function equals(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) &&
      a.length === b.length && a.every((entry, index) => entry === b[index]);
  }
  return a === b;
}

export function conflictingCatalogFields(current, whenOpened) {
  if (!current || !whenOpened) return [];
  return CATALOG_EDITOR_FIELDS.filter(field =>
    !equals(current[field], whenOpened[field])
  );
}
