import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { createCatalogApp, updateCatalogApp } from '../../src/services/catalogTransactions.js';
import { archiveAppAtomic, restoreAppAtomic, updatePublicationAtomic } from '../../src/services/phase3Transactions.js';

const projectId = 'demo-appsem-phase3';
const host = /^(127\.0\.0\.1|localhost):8080$/;
if (!host.test(process.env.FIRESTORE_EMULATOR_HOST || '')) {
  throw Error('Las pruebas de catálogo requieren exclusivamente Firebase Emulator.');
}
const rules = readFileSync(new URL('../../docs/fase-02/firestore.hardened.rules', import.meta.url), 'utf8');

test('Fase 4: crear, editar, publicar, archivar y restaurar con Google Play/APK vacíos conserva datos', async () => {
  const env = await initializeTestEnvironment({ projectId, firestore: {
    host: '127.0.0.1', port: 8080, rules
  } });
  const adminApp = initializeApp({ projectId }, 'catalog-phase4-acceptance');
  const server = getFirestore(adminApp);
  const admin = env.authenticatedContext('admin-operator', {
    email: 'eler30.mr@gmail.com', email_verified: true
  }).firestore();
  const publicDb = env.unauthenticatedContext().firestore();
  const metrics = { likesCount: 3, downloadsCount: 8, ratingCount: 1,
    ratingSum: 5, ratingAverage: 5, commentsCount: 1 };
  const payload = {
    title: 'Prueba catálogo fase cuatro', slug: 'phase4-test-app', status: 'draft',
    featured: false, iconUrl: 'https://example.com/icon.png',
    shortDescription: 'Prueba', fullDescription: 'Prueba completa',
    playStoreUrl: '', apkUrl: '', privacyPolicyUrl: '', termsUrl: '',
    ...metrics
  };
  try {
    await env.clearFirestore();
    const created = await createCatalogApp(admin, payload);
    assert.equal(created.id, 'phase4-test-app');
    await server.doc('apps/phase4-test-app/comments/example').set({
      approved: true, comment: 'Comentario de prueba'
    });
    await server.doc('apps/phase4-test-app/ratings/one').set({ rating: 5 });
    await assertFails(getDoc(doc(publicDb, 'apps', created.id)));
    await assert.rejects(
      createCatalogApp(admin, { ...payload, title: 'Duplicado' }),
      /identificador público/
    );
    await updateCatalogApp(admin, created.id, {
      title: 'Nombre editado', slug: payload.slug, status: 'draft',
      shortDescription: 'Nueva descripción', playStoreUrl: '', apkUrl: ''
    });
    let updated = (await server.doc('apps/phase4-test-app').get()).data();
    assert.equal(updated.title, 'Nombre editado');
    for (const [key, value] of Object.entries(metrics)) assert.equal(updated[key], value);
    assert.equal((await updatePublicationAtomic(admin, created.id, 'published')).changed, true);
    assert.equal((await getDoc(doc(publicDb, 'apps', created.id))).data().title, 'Nombre editado');
    const archived = await archiveAppAtomic(admin, created.id);
    assert.equal(archived.changed, true);
    await assertFails(getDoc(doc(publicDb, 'apps', created.id)));
    await assert.rejects(
      updateCatalogApp(admin, created.id, { ...payload, status: 'published' }),
      /Primero restaura/
    );
    assert.equal((await restoreAppAtomic(admin, created.id)).changed, true);
    updated = (await server.doc('apps/phase4-test-app').get()).data();
    assert.equal(updated.status, 'draft');
    assert.equal(updated.featured, false);
    assert.equal(updated.playStoreUrl, '');
    assert.equal(updated.apkUrl, '');
    for (const [key, value] of Object.entries(metrics)) assert.equal(updated[key], value);
    assert.equal((await getDocs(collection(admin, 'apps/phase4-test-app/comments'))).size, 1);
    assert.equal((await getDocs(collection(admin, 'apps/phase4-test-app/ratings'))).size, 1);
  } finally {
    await env.clearFirestore();
    await env.cleanup();
    await deleteApp(adminApp);
  }
});

test('Fase 4: slug histórico con ID automático no puede duplicarse', async () => {
  const env = await initializeTestEnvironment({ projectId, firestore: {
    host: '127.0.0.1', port: 8080, rules
  } });
  const app = initializeApp({ projectId }, 'catalog-phase4-legacy');
  const server = getFirestore(app);
  const admin = env.authenticatedContext('admin-operator', {
    email: 'eler30.mr@gmail.com', email_verified: true
  }).firestore();
  try {
    await env.clearFirestore();
    await server.doc('apps/legacy-auto-id').set({ slug: 'legacy-name', status: 'published' });
    await assert.rejects(
      createCatalogApp(admin, { slug: 'legacy-name', status: 'draft', title: 'Otra app' }),
      /identificador público/
    );
    assert.equal((await server.collection('apps').get()).size, 1);
  } finally {
    await env.clearFirestore();
    await env.cleanup();
    await deleteApp(app);
  }
});

test('Fase 4: una sesión desactualizada no sobrescribe la edición de otra sesión', async () => {
  const env = await initializeTestEnvironment({ projectId, firestore: {
    host: '127.0.0.1', port: 8080, rules
  } });
  const app = initializeApp({ projectId }, 'catalog-phase4-stale-editor');
  const db = getFirestore(app);
  const first = env.authenticatedContext('editor-first', {
    email: 'eler30.mr@gmail.com', email_verified: true
  }).firestore();
  const second = env.authenticatedContext('editor-second', {
    email: 'eler30.mr@gmail.com', email_verified: true
  }).firestore();
  try {
    await env.clearFirestore();
    const original = { title: 'Primera edición', slug: 'stale-editor-test',
      status: 'draft', categoryKey: 'herramientas', apkUrl: '',
      screenshots: ['https://example.com/old.png'], likesCount: 2 };
    await db.doc('apps/stale-editor-test').set(original);
    const firstSnapshot = (await db.doc('apps/stale-editor-test').get()).data();
    const secondSnapshot = (await db.doc('apps/stale-editor-test').get()).data();

    const saved = await updateCatalogApp(first, 'stale-editor-test', {
      title: 'Edición conservada', slug: 'stale-editor-test',
      status: 'draft', categoryKey: 'herramientas',
      apkUrl: 'https://github.com/as-ghostt/appsem-store/releases/download/v1/app.apk'
    }, firstSnapshot);
    assert.equal(saved.title, 'Edición conservada');
    await assert.rejects(
      updateCatalogApp(second, 'stale-editor-test', {
        title: 'Edición obsoleta', slug: 'stale-editor-test',
        status: 'draft', categoryKey: 'herramientas', apkUrl: ''
      }, secondSnapshot),
      /modificada en otra sesión/
    );
    let existing = (await db.doc('apps/stale-editor-test').get()).data();
    assert.equal(existing.title, 'Edición conservada');
    assert.match(existing.apkUrl, /releases\/download/);
    // Los datos de interacción se actualizan con independencia de la ficha.
    await db.doc('apps/stale-editor-test').update({ likesCount: 7 });
    await updateCatalogApp(first, 'stale-editor-test', {
      title: 'Nueva descripción', slug: 'stale-editor-test', status: 'draft',
      categoryKey: 'herramientas', apkUrl: existing.apkUrl
    }, { ...saved, likesCount: 2 });
    existing = (await db.doc('apps/stale-editor-test').get()).data();
    assert.equal(existing.title, 'Nueva descripción');
    assert.equal(existing.likesCount, 7);
  } finally {
    await env.clearFirestore();
    await env.cleanup();
    await deleteApp(app);
  }
});
