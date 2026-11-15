import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeCommentPages, newestCommentsFirst } from '../../src/utils/commentsLoading.js';
import { fetchCommentsPage, COMMENTS_PAGE_SIZE } from '../../src/services/commentsPagination.js';

test('El tamaño máximo predeterminado se mantiene en 20 por app', async () => {
  assert.equal(COMMENTS_PAGE_SIZE, 20);
  assert.deepEqual(await fetchCommentsPage(null, []), {
    comments: [], cursors: {}, hasMore: false
  });
  await assert.rejects(fetchCommentsPage(null, [], {}, 0), /inválidos/);
  await assert.rejects(fetchCommentsPage(null, [], {}, 101), /inválidos/);
  await assert.rejects(fetchCommentsPage(null, null), /inválidos/);
});

test('Las páginas se fusionan sin duplicar comentarios por ID compuesto', () => {
  const first = [
    { appId: 'app-a', id: '1', approved: false, createdAt: { seconds: 100 } },
    { appId: 'app-b', id: '1', approved: true, createdAt: { seconds: 150 } }
  ];
  const next = [
    { appId: 'app-a', id: '1', approved: true, createdAt: { seconds: 100 } },
    { appId: 'app-a', id: '2', approved: false, createdAt: { seconds: 50 } }
  ];
  const merged = mergeCommentPages(first, next);
  assert.deepEqual(merged.map(x => [x.appId, x.id]), [
    ['app-b', '1'], ['app-a', '1'], ['app-a', '2']
  ]);
  assert.equal(merged[1].approved, true);
  assert.equal(first[0].approved, false);
});

test('Los nanosegundos se ordenan sin desbordamiento con fechas actuales', () => {
  const epoch = 1794770000;
  const comments = [
    { id: 'earlier', appId: 'x', createdAt: { seconds: epoch, nanoseconds: 3 } },
    { id: 'later', appId: 'x', createdAt: { seconds: epoch, nanoseconds: 5 } },
    { id: 'next-second', appId: 'x', createdAt: { seconds: epoch + 1, nanoseconds: 0 } }
  ];
  assert.deepEqual(newestCommentsFirst(comments).map(x => x.id),
    ['next-second', 'later', 'earlier']);
});

test('El orden es estable para comentarios sin timestamp', () => {
  const entries = [
    { appId: 'b', id: 'z' }, { appId: 'a', id: 'b' }, { appId: 'a', id: 'a' }
  ];
  assert.deepEqual(newestCommentsFirst(entries).map(x => x.id), ['a', 'b', 'z']);
});
