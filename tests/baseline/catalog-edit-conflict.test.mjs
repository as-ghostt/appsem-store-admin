import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG_EDITOR_FIELDS, conflictingCatalogFields } from '../../src/utils/catalogEditConflict.js';

test('Detecta cambios editoriales hechos por otra sesión', () => {
  const opened = { title: 'BotShow', status: 'draft', apkUrl: '',
    screenshots: ['https://example.com/one.jpg'], categoryKey: 'herramientas' };
  const latest = { ...opened, title: 'BotShow Live' };
  assert.deepEqual(conflictingCatalogFields(latest, opened), ['title']);
  assert.deepEqual(conflictingCatalogFields(opened, opened), []);
  assert.ok(CATALOG_EDITOR_FIELDS.includes('slug'));
  assert.ok(CATALOG_EDITOR_FIELDS.includes('apkUrl'));
  assert.ok(CATALOG_EDITOR_FIELDS.includes('status'));
});

test('No bloquea una edición por likes, valoraciones o contadores nuevos', () => {
  const opened = { title: 'BotShow', slug: 'botshow', likesCount: 3, commentsCount: 1,
    ratingAverage: 5, updatedAt: { seconds: 1 } };
  const current = { ...opened, likesCount: 8, commentsCount: 6, ratingAverage: 4.8,
    updatedAt: { seconds: 2 } };
  assert.deepEqual(conflictingCatalogFields(current, opened), []);
});

test('La comparación de capturas es por valor, no por referencia de array', () => {
  const opened = { screenshots: ['https://example.com/1.png'] };
  assert.deepEqual(conflictingCatalogFields({ screenshots: [...opened.screenshots] }, opened), []);
  assert.deepEqual(conflictingCatalogFields({ screenshots: ['https://example.com/2.png'] }, opened), ['screenshots']);
});
