/**
 * Carga concurrente acotada de subcolecciones de comentarios.
 * Conserva el orden final y no introduce lecturas adicionales en Firestore.
 */
export async function mapWithConcurrency(items, fetchItem, concurrency = 4) {
  if (!Array.isArray(items) || typeof fetchItem !== 'function' ||
      !Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 16) {
    throw new Error('Parámetros inválidos de lectura concurrente.');
  }
  if (items.length === 0) return [];

  const results = new Array(items.length);
  let next = 0;
  const count = Math.min(concurrency, items.length);

  await Promise.all(Array.from({ length: count }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fetchItem(items[index], index);
    }
  }));

  return results;
}

export function commentsCatalogKey(apps = []) {
  return JSON.stringify(
    apps.map(({ id, title, commentsCount }) => [id, title || '', commentsCount ?? 0])
      .sort((a, b) => a[0].localeCompare(b[0]))
  );
}

export function newestCommentsFirst(comments) {
  return [...comments].sort((a, b) => {
    const aTime = (a.createdAt?.seconds || 0) * 1e9 + (a.createdAt?.nanoseconds || 0);
    const bTime = (b.createdAt?.seconds || 0) * 1e9 + (b.createdAt?.nanoseconds || 0);
    return bTime - aTime;
  });
}
