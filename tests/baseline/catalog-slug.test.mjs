import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidCatalogSlug } from '../../src/utils/catalogSlug.js';
import { createSlug } from '../../src/utils/slug.js';

test('Slug solo acepta formato canónico y hasta 80 caracteres', () => {
  for (const s of ['botshow', 'biblia-universal', 'app-2', 'a'.repeat(80)])
    assert.equal(isValidCatalogSlug(s), true);
  for (const s of ['', 'BotShow', 'con espacios', '-inicio', 'fin-', 'doble--guion',
    'a'.repeat(81), 'apps/admin', '../evil', 'ó', null])
    assert.equal(isValidCatalogSlug(s), false);
});

test('Generador elimina guiones al inicio y al final', () => {
  assert.equal(createSlug('  - Biblia Universal -  '), 'biblia-universal');
  assert.equal(createSlug('BotShow'), 'botshow');
  assert.equal(createSlug('APP  Store'), 'app-store');
});
