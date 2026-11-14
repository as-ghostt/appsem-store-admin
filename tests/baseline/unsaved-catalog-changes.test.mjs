import test from 'node:test';
import assert from 'node:assert/strict';
import { hasUnsavedCatalogChanges, shouldBlockCatalogNavigation } from '../../src/utils/unsavedCatalogChanges.js';

const blank = { title: '', slug: '', currentVersion: '', playStoreUrl: '', apkUrl: '',
  privacyPolicyUrl: '', status: 'draft', categoryKey: 'educacion' };
test('La ficha nueva no advierte antes de editar y sí tras introducir datos', () => {
  assert.equal(hasUnsavedCatalogChanges(blank, blank), false);
  const changed = { ...blank, title: 'BotShow' };
  assert.equal(hasUnsavedCatalogChanges(changed, blank), true);
  assert.equal(hasUnsavedCatalogChanges({ ...changed, title: '' }, blank), false);
});
test('La edición detecta URL de APK subida sin guardar, sin requerir Google Play', () => {
  const saved = { ...blank, title: 'BotShow', slug: 'botshow' };
  const edited = { ...saved, apkUrl: 'https://github.com/example/releases/download/tag/app.apk' };
  assert.equal(hasUnsavedCatalogChanges(edited, saved), true);
  assert.equal(hasUnsavedCatalogChanges(edited, edited), false);
  assert.equal(hasUnsavedCatalogChanges({ ...saved, playStoreUrl: '' }, saved), false);
});
test('Solo bloquea al salir: admite mismo destino y protege cargas en curso', () => {
  assert.equal(shouldBlockCatalogNavigation({ dirty: false, busy: false, currentUrl: '/apps/new', nextUrl: '/apps' }), false);
  assert.equal(shouldBlockCatalogNavigation({ dirty: true, busy: false, currentUrl: '/apps/new', nextUrl: '/apps/new' }), false);
  assert.equal(shouldBlockCatalogNavigation({ dirty: true, busy: false, currentUrl: '/apps/new', nextUrl: '/apps' }), true);
  assert.equal(shouldBlockCatalogNavigation({ dirty: false, busy: true, currentUrl: '/apps/new', nextUrl: '/dashboard' }), true);
  assert.equal(shouldBlockCatalogNavigation({ dirty: true, busy: false, currentUrl: '/apps/new', nextUrl: '/apps/new?q=1' }), true);
});
test('Los campos desconocidos se detectan y no alteran categoría por defecto', () => {
  assert.equal(hasUnsavedCatalogChanges({ ...blank, extra: 'edit' }, blank), true);
  assert.equal(hasUnsavedCatalogChanges({ ...blank, categoryKey: 'herramientas' }, blank), true);
});
