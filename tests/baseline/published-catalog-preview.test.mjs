import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedCatalogPreviewSlug } from '../../src/utils/publishedCatalogPreview.js';

test('No ofrece vista pública de fichas nuevas ni borradores', () => {
  assert.equal(publishedCatalogPreviewSlug(false, {status:'published',slug:'botshow'},'botshow'), '');
  assert.equal(publishedCatalogPreviewSlug(true, {status:'draft',slug:'botshow'},'botshow'), '');
  assert.equal(publishedCatalogPreviewSlug(true, null, 'botshow'), '');
});
test('Vista pública usa exclusivamente el slug ya publicado sin editar', () => {
  const actual={status:'published',slug:'botshow'};
  assert.equal(publishedCatalogPreviewSlug(true, actual, 'botshow'), 'botshow');
  assert.equal(publishedCatalogPreviewSlug(true, actual, 'botshow-renamed'), '');
  assert.equal(publishedCatalogPreviewSlug(true, {status:'archived',slug:'botshow'},'botshow'), '');
});
