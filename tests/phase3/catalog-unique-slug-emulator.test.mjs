import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { createCatalogApp, updateCatalogApp } from '../../src/services/catalogTransactions.js';

if (!/^(127\.0\.0\.1|localhost):8080$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) {
  throw Error('Prueba de catálogo solo permitida en Firebase Emulator local.');
}
const projectId = 'demo-appsem-phase3';
const rules = readFileSync(new URL('../../docs/fase-02/firestore.hardened.rules', import.meta.url), 'utf8');

test('Catálogo: creación concurrente no duplica slug y edición detecta fichas antiguas', async () => {
  const env = await initializeTestEnvironment({
    projectId, firestore: { host: '127.0.0.1', port: 8080, rules }
  });
  const app = initializeApp({ projectId }, 'phase4-unique-slug');
  const adminDb = getFirestore(app);
  const clientDb = env.authenticatedContext('admin', {
    email: 'eler30.mr@gmail.com', email_verified: true
  }).firestore();
  try {
    await env.clearFirestore();
    const sample = { slug: 'botshow', title: 'BotShow', status: 'draft',
      featured: false, shortDescription: 'Demo', fullDescription: 'Descripción' };
    const concurrent = await Promise.allSettled([
      createCatalogApp(clientDb, sample),
      createCatalogApp(clientDb, sample)
    ]);
    assert.equal(concurrent.filter(x=>x.status==='fulfilled').length, 1);
    assert.equal(concurrent.filter(x=>x.status==='rejected').length, 1);
    assert.equal((await adminDb.collection('apps').get()).size, 1);
    assert.equal((await adminDb.doc('apps/botshow').get()).data().slug, 'botshow');

    // Legado: documento con ID aleatorio distinto del slug.
    await adminDb.doc('apps/historic-id').set({ ...sample, slug: 'biblia-universal' });
    await assert.rejects(createCatalogApp(clientDb, {
      ...sample, title: 'Copia falsa', slug: 'biblia-universal'
    }), /identificador público/);
    assert.equal((await adminDb.collection('apps').get()).size, 2);

    await assert.rejects(updateCatalogApp(clientDb, 'historic-id', {
      ...sample, slug: 'botshow'
    }), /identificador público/);
    assert.equal((await adminDb.doc('apps/historic-id').get()).data().slug, 'biblia-universal');
    await updateCatalogApp(clientDb, 'historic-id', {
      ...sample, slug: 'biblia-universal', title: 'Biblia Universal actualizada'
    });
    assert.equal((await adminDb.doc('apps/historic-id').get()).data().title, 'Biblia Universal actualizada');
  } finally {
    await env.clearFirestore();
    await env.cleanup();
    await deleteApp(app);
  }
});
