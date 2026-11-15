import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { fetchCommentsPage } from '../../src/services/commentsPagination.js';
import { mergeCommentPages } from '../../src/utils/commentsLoading.js';

const projectId = 'demo-appsem-phase3';
if (!/^(127\.0\.0\.1|localhost):8080$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) {
  throw Error('La prueba de paginación solo puede ejecutarse en Firebase Emulator local.');
}
const rules = readFileSync(new URL('../../docs/fase-02/firestore.hardened.rules', import.meta.url), 'utf8');

test('Firestore Emulator: paginación por cursores reales de 52 comentarios en dos apps', async () => {
  const env = await initializeTestEnvironment({
    projectId, firestore: { host: '127.0.0.1', port: 8080, rules }
  });
  const serverApp = initializeApp({ projectId }, 'phase6-paginated-comments-test');
  const server = getFirestore(serverApp);
  const admin = env.authenticatedContext('admin-cursor', {
    email: 'eler30.mr@gmail.com', email_verified: true
  }).firestore();
  try {
    await env.clearFirestore();
    const batch = server.batch();
    batch.set(server.doc('apps/phase6-a'), { status: 'published', title: 'App A' });
    batch.set(server.doc('apps/phase6-b'), { status: 'published', title: 'App B' });
    for (const [app, total] of [['phase6-a', 45], ['phase6-b', 7]]) {
      for (let i = 0; i < total; i++) {
        batch.set(server.doc(`apps/${app}/comments/comment-${String(i).padStart(3,'0')}`), {
          approved: i % 2 === 0,
          name: 'Usuario sintético',
          comment: 'Comentario de prueba',
          createdAt: Timestamp.fromMillis(1700000000000 + Math.floor(i / 4) * 1000)
        });
      }
    }
    await batch.commit();

    const apps = [{ id: 'phase6-a', title: 'App A' }, { id: 'phase6-b', title: 'App B' }];
    const first = await fetchCommentsPage(admin, apps, {}, 20);
    assert.equal(first.comments.length, 27);
    assert.equal(first.hasMore, true);
    assert.ok(first.cursors['phase6-a']);
    assert.equal(first.cursors['phase6-b'], null);
    assert.equal(first.comments.some(x => x.approved === false), true);
    assert.equal(first.comments.some(x => x.approved === true), true);

    const second = await fetchCommentsPage(admin, apps, first.cursors, 20);
    assert.equal(second.comments.length, 20);
    assert.equal(second.hasMore, true);
    assert.equal(second.cursors['phase6-b'], null);

    const third = await fetchCommentsPage(admin, apps, second.cursors, 20);
    assert.equal(third.comments.length, 5);
    assert.equal(third.hasMore, false);
    assert.equal(third.cursors['phase6-a'], null);

    const combined = mergeCommentPages(
      mergeCommentPages(first.comments, second.comments), third.comments
    );
    assert.equal(combined.length, 52);
    assert.equal(new Set(combined.map(x => x.appId + '/' + x.id)).size, 52);

    // Reiniciar el cursor tras actualizar equivale a «Actualizar» en el panel.
    const before = await fetchCommentsPage(admin, apps, {}, 20);
    assert.equal(before.comments.length, 27);
    const empty = await fetchCommentsPage(admin, [], {}, 20);
    assert.equal(empty.hasMore, false);
    assert.deepEqual(empty.comments, []);
  } finally {
    await env.clearFirestore();
    await env.cleanup();
    await deleteApp(serverApp);
  }
});
