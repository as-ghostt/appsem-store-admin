import test from 'node:test';
import assert from 'node:assert/strict';
import { mapWithConcurrency, commentsCatalogKey, newestCommentsFirst } from '../../src/utils/commentsLoading.js';

test('Hasta cuatro lecturas en paralelo preservando los resultados y su orden', async () => {
  let active = 0;
  let maxActive = 0;
  const ids = Array.from({ length: 11 }, (_, index) => index);
  const outputs = await mapWithConcurrency(ids, async (value) => {
    active++;
    maxActive = Math.max(maxActive, active);
    await Promise.resolve();
    await Promise.resolve();
    active--;
    return 'comentario-' + value;
  }, 4);
  assert.deepEqual(outputs, ids.map(id => 'comentario-' + id));
  assert.equal(maxActive, 4);
  assert.equal(active, 0);
});

test('No agrega consultas si no hay apps y propaga errores de lectura', async () => {
  let calls = 0;
  assert.deepEqual(await mapWithConcurrency([], async () => { calls++; }), []);
  assert.equal(calls, 0);
  await assert.rejects(
    mapWithConcurrency([1, 2], async id => {
      if (id === 2) throw Error('No se pudieron consultar los comentarios');
      return id;
    }, 2),
    /No se pudieron consultar los comentarios/
  );
  await assert.rejects(mapWithConcurrency([1], () => 1, 0), /inválidos/);
  await assert.rejects(mapWithConcurrency([1], () => 1, 17), /inválidos/);
});

test('Cambios de likes o descargas no provocan nuevas consultas de comentarios', () => {
  const initial = [{ id: 'alpha', title: 'Alpha', likesCount: 0, downloadsCount: 0 },
    { id: 'beta', title: 'Beta', ratingCount: 1 }];
  const changedMetrics = [{ ...initial[1], ratingCount: 27 },
    { ...initial[0], likesCount: 100, downloadsCount: 50 }];
  assert.equal(commentsCatalogKey(initial), commentsCatalogKey(changedMetrics));
  assert.notEqual(commentsCatalogKey(initial),
    commentsCatalogKey([{ ...initial[0], title: 'Alpha nueva' }, initial[1]]));
  assert.notEqual(commentsCatalogKey(initial), commentsCatalogKey([initial[0]]));
});

test('Comentarios de todas las apps se ordenan por fecha, sin modificar la entrada', () => {
  const input = [
    { id: 'old', createdAt: { seconds: 100, nanoseconds: 1 } },
    { id: 'recent', createdAt: { seconds: 200, nanoseconds: 10 } },
    { id: 'same-second', createdAt: { seconds: 200, nanoseconds: 2 } }
  ];
  assert.deepEqual(newestCommentsFirst(input).map(x => x.id),
    ['recent', 'same-second', 'old']);
  assert.equal(input[0].id, 'old');
});
