import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCatalogQuality } from '../../scripts/phase4/catalog-quality.mjs';

test('Auditor detecta slugs duplicados y enlaces mal formados sin exigir Play o APK', () => {
  const original = [
    { slug: 'botshow', status: 'published', iconUrl: 'https://example.com/icon.png',
      title: 'Nombre privado', accountDeletionUrl: '', apkUrl: '', playStoreUrl: '' },
    { slug: 'botshow', status: 'draft', iconUrl: 'http://example.com/unsafe.png',
      privacyPolicyUrl: 'javascript:alert(1)', apkUrl: 'https://github.com/user/repo/releases' },
    { slug: '', status: 'published', iconUrl: '', playStoreUrl: '',
      screenshots: ['https://example.com/a.png', 'http://localhost/private.png'] }
  ];
  const audit = summarizeCatalogQuality(original);
  assert.equal(audit.report.appReferences, 3);
  assert.equal(audit.report.duplicatedSlugs, 1);
  assert.equal(audit.report.missingSlug, 1);
  assert.equal(audit.report.iconsMissing, 1);
  assert.equal(audit.report.iconsInvalidUrl, 1);
  assert.equal(audit.report.screenshotsInvalidUrl, 1);
  assert.equal(audit.report.legalLinksInvalid, 1);
  assert.equal(audit.report.apkLinksInvalid, 1);
  assert.equal(audit.report.publishedWithoutDownload, 2);
  assert.equal(audit.appliedWrites, 0);
  assert.equal(JSON.stringify(audit).includes('Nombre privado'), false);
});

test('Un catálogo bien formado sin Google Play, sin APK y sin legales es válido', () => {
  const result = summarizeCatalogQuality([
    { slug: 'botshow', status: 'published', iconUrl: 'https://example.com/icon.png' }
  ]);
  assert.equal(result.report.playStoreLinksInvalid, 0);
  assert.equal(result.report.apkLinksInvalid, 0);
  assert.equal(result.report.legalLinksInvalid, 0);
  assert.equal(result.report.duplicatedSlugs, 0);
  assert.equal(result.report.publishedWithoutDownload, 1);
  assert.throws(() => summarizeCatalogQuality(new Array(51).fill({})));
});
