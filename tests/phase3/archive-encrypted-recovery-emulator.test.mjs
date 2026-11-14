import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';
import { createArchive, verifyArchive, restoreToEmulator } from '../../scripts/firestore/archive.mjs';
import { encryptBackup, decryptBackup } from '../../scripts/firestore/encrypted.mjs';
import {
  archiveAppAtomic, restoreAppAtomic, updatePublicationAtomic, moderateCommentAtomic
} from '../../src/services/phase3Transactions.js';

const projectId = 'demo-appsem-phase3';
const requiredHost = /^(127\.0\.0\.1|localhost):8080$/;
if (!requiredHost.test(process.env.FIRESTORE_EMULATOR_HOST || '')) {
  throw Error('La restauración de prueba solo puede ejecutarse en Firebase Emulator local.');
}
const rules = readFileSync(new URL('../../docs/fase-02/firestore.hardened.rules', import.meta.url), 'utf8');

test('Archivado + backup cifrado + recuperación en Emulator no pierden apps, métricas o comentarios', async () => {
  const env = await initializeTestEnvironment({
    projectId, firestore: { host: '127.0.0.1', port: 8080, rules }
  });
  const adminApp = initializeApp({ projectId }, 'phase3-backup-recovery');
  const db = getFirestore(adminApp);
  const clientDb = env.authenticatedContext('admin', {
    email: 'eler30.mr@gmail.com', email_verified: true
  }).firestore();
  const anonymousDb = env.unauthenticatedContext().firestore();
  const tmp = await mkdtemp(join(tmpdir(), 'appsem-phase3-recovery-'));
  const pass = 'Synthetic-only-recovery-password-not-for-real-data-2026';
  const appRef = db.doc('apps/phase3-fixture');
  const metric = { likesCount: 12, downloadsCount: 7, ratingCount: 2,
    ratingSum: 9, ratingAverage: 4.5, commentsCount: 1 };
  let decrypted;
  try {
    await env.clearFirestore();
    await appRef.set({ title: 'App de pruebas', slug: 'phase3-fixture',
      status: 'published', featured: true, ...metric });
    await appRef.collection('comments').doc('approved').set({
      approved: true, name: 'Sintético', comment: 'Texto de prueba'
    });
    await appRef.collection('comments').doc('pending').set({
      approved: false, name: 'Sintético', comment: 'Comentario por moderar'
    });
    await appRef.collection('likes').doc('visitor-one').set({ createdAt: new Date() });
    await appRef.collection('ratings').doc('visitor-one').set({ rating: 5 });
    await appRef.collection('ratings').doc('visitor-two').set({ rating: 4 });
    await appRef.collection('downloadClicks').doc('download-one').set({ createdAt: new Date() });

    assert.equal((await archiveAppAtomic(clientDb, 'phase3-fixture')).changed, true);
    assert.equal((await archiveAppAtomic(clientDb, 'phase3-fixture')).changed, false);
    assert.equal((await appRef.get()).data().featured, false);
    await assertFails(getDoc(doc(anonymousDb, 'apps', 'phase3-fixture')));

    const backup = await createArchive(db, { projectId, outputRoot: tmp });
    assert.equal(backup.manifest.documents, 7);
    assert.equal((await verifyArchive(backup.dir)).manifest.documents, 7);
    const encryptedFile = join(tmp, 'phase3-archive.appsem.enc');
    const sealed = await encryptBackup(backup.dir, encryptedFile, pass);
    assert.ok(sealed.bytes > 100);
    decrypted = await decryptBackup(encryptedFile, tmp, pass);
    assert.equal((await verifyArchive(decrypted.dir)).manifest.archiveSha256,
      backup.manifest.archiveSha256);
    await env.clearFirestore();
    assert.equal((await appRef.get()).exists, false);
    const restored = await restoreToEmulator(db, decrypted.dir);
    assert.equal(restored.count, 7);
    let data = (await appRef.get()).data();
    assert.equal(data.status, 'archived');
    assert.equal(data.featured, false);
    for (const [key, value] of Object.entries(metric)) assert.equal(data[key], value);
    assert.equal((await appRef.collection('likes').get()).size, 1);
    assert.equal((await appRef.collection('ratings').get()).size, 2);
    assert.equal((await appRef.collection('downloadClicks').get()).size, 1);
    assert.equal((await appRef.collection('comments').get()).size, 2);
    await assertFails(getDoc(doc(anonymousDb, 'apps', 'phase3-fixture')));

    assert.equal((await restoreAppAtomic(clientDb, 'phase3-fixture')).changed, true);
    data = (await appRef.get()).data();
    assert.equal(data.status, 'draft');
    assert.equal(data.featured, false);
    await assertFails(getDoc(doc(anonymousDb, 'apps', 'phase3-fixture')));
    await updatePublicationAtomic(clientDb, 'phase3-fixture', 'published');
    assert.equal((await getDoc(doc(anonymousDb, 'apps', 'phase3-fixture'))).data().status, 'published');
    assert.equal((await moderateCommentAtomic(clientDb, { appId:'phase3-fixture', id:'pending' }, 'approve')).changed, true);
    assert.equal((await moderateCommentAtomic(clientDb, { appId:'phase3-fixture', id:'pending' }, 'approve')).changed, false);
    assert.equal((await appRef.get()).data().commentsCount, 2);
    assert.equal((await appRef.collection('comments').get()).size, 2);
    assert.equal((await appRef.collection('ratings').get()).size, 2);
  } finally {
    await env.clearFirestore();
    await env.cleanup();
    await deleteApp(adminApp);
    await rm(tmp, { recursive: true, force: true });
  }
});
