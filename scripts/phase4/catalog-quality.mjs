/**
 * Fase 4: evaluación estática del catálogo productivo sin identificadores.
 * No importa Firebase, no consulta enlaces y nunca altera documentos.
 */
import { isPublicHttpsUrl } from '../../src/utils/publicLinks.js';
import { isOfficialPlayStoreUrl, isGithubReleasesApkUrl } from '../../src/utils/downloadLinks.js';
import { isValidCatalogSlug } from '../../src/utils/catalogSlug.js';

const LEGAL_FIELDS = [
  'privacyPolicyUrl', 'termsUrl', 'legalNoticeUrl',
  'accountDeletionUrl', 'securityReportUrl'
];

export function summarizeCatalogQuality(apps) {
  if (!Array.isArray(apps) || apps.length > 50) throw Error('Inventario inválido o demasiado grande.');
  const summary = {
    appReferences: apps.length, published: 0, drafts: 0, archived: 0,
    missingSlug: 0, invalidSlug: 0, duplicatedSlugs: 0,
    iconsMissing: 0, iconsInvalidUrl: 0,
    bannersInvalidUrl: 0, screenshotsInvalidUrl: 0,
    playStoreLinksInvalid: 0, apkLinksInvalid: 0, legalLinksInvalid: 0,
    publishedWithoutDownload: 0
  };
  const slugs = new Map();
  for (const app of apps) {
    const a = app && typeof app === 'object' ? app : {};
    if (a.status === 'published') summary.published++;
    else if (a.status === 'archived') summary.archived++;
    else if (a.status === 'draft') summary.drafts++;

    const slug = a.slug;
    if (typeof slug !== 'string' || !slug.trim()) summary.missingSlug++;
    else if (!isValidCatalogSlug(slug)) summary.invalidSlug++;
    else slugs.set(slug, (slugs.get(slug) || 0) + 1);

    if (!a.iconUrl) summary.iconsMissing++;
    else if (!isPublicHttpsUrl(a.iconUrl)) summary.iconsInvalidUrl++;
    if (a.bannerUrl && !isPublicHttpsUrl(a.bannerUrl)) summary.bannersInvalidUrl++;
    const images = Array.isArray(a.screenshots) ? a.screenshots : [];
    summary.screenshotsInvalidUrl += images.filter(src => !isPublicHttpsUrl(src)).length;

    if (a.playStoreUrl && !isOfficialPlayStoreUrl(a.playStoreUrl)) summary.playStoreLinksInvalid++;
    if (a.apkUrl && !isGithubReleasesApkUrl(a.apkUrl)) summary.apkLinksInvalid++;
    for (const field of LEGAL_FIELDS) {
      if (a[field] && !isPublicHttpsUrl(a[field])) summary.legalLinksInvalid++;
    }
    // Los enlaces de distribución SON opcionales: inventario, no error.
    if (a.status === 'published' && !a.playStoreUrl && !a.apkUrl) summary.publishedWithoutDownload++;
  }
  summary.duplicatedSlugs = [...slugs.values()].reduce((n, count) => n + Math.max(0, count - 1), 0);
  return {
    schemaVersion: 'appsem-catalog-quality-v1',
    mode: 'production-read-only',
    report: summary,
    notes: 'La validación HTTPS no comprueba que un recurso remoto cargue; los enlaces de distribución y los enlaces legales son opcionales.',
    appliedWrites: 0
  };
}
