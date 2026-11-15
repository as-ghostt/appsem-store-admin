import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCatalogSlugs } from '../../scripts/phase3/catalog-slug-audit.mjs';

test('Revisa fichas canónicas, heredadas y slugs duplicados sin exponer identificadores', () => {
  const result = auditCatalogSlugs([
    { id: 'botshow', slug: 'botshow', exists: true },
    { id: 'old-auto-a', slug: 'duplicated-private', exists: true },
    { id: 'old-auto-b', slug: 'duplicated-private', exists: true },
    { id: 'old-auto-c', slug: 'legacy-private', exists: true },
    { id: 'no-slug', exists: true },
    { id: 'bad-slug', slug: 'NOT VALID', exists: true },
    { id: 'ghost-parent', slug: 'ghost-parent', exists: false }
  ]);
  assert.equal(result.existingApps, 6);
  assert.equal(result.canonicalIdApps, 1);
  assert.equal(result.legacyIdApps, 3);
  assert.equal(result.missingSlugApps, 1);
  assert.equal(result.invalidSlugApps, 1);
  assert.equal(result.duplicateSlugGroups, 1);
  assert.equal(result.appsWithDuplicateSlug, 2);
  assert.equal(result.writesApplied, 0);
  const output = JSON.stringify(result);
  for (const secret of ['botshow', 'old-auto', 'duplicated-private', 'legacy-private', 'NOT VALID']) {
    assert.equal(output.includes(secret), false, 'No exponer: ' + secret);
  }
});
test('No confunde mayúsculas inválidas ni docs sin padre con colisiones', () => {
  const result = auditCatalogSlugs([
    { id: 'one', slug: 'UPPER', exists: true },
    { id: 'two', slug: 'upper', exists: true },
    { id: 'three', slug: 'upper', exists: false }
  ]);
  assert.equal(result.duplicateSlugGroups, 0);
  assert.equal(result.invalidSlugApps, 1);
  assert.equal(result.legacyIdApps, 1);
  assert.throws(() => auditCatalogSlugs(null));
  assert.throws(() => auditCatalogSlugs([{ id: 3, exists: true }]));
});
