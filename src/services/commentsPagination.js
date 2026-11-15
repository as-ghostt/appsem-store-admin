import {
  collection, getDocs, limit, orderBy, query, startAfter
} from 'firebase/firestore';
import { mapWithConcurrency, newestCommentsFirst } from '../utils/commentsLoading.js';

export const COMMENTS_PAGE_SIZE = 20;

/**
 * Página incremental de cada subcolección apps/{id}/comments.
 * cursor === null significa que la app agotó sus resultados.
 * El cursor es un QueryDocumentSnapshot real para mantener el desempate
 * por ID de documento incluso cuando dos comentarios comparten timestamp.
 */
export async function fetchCommentsPage(db, apps, cursors = {}, pageSize = COMMENTS_PAGE_SIZE) {
  if (!Array.isArray(apps) || !cursors || typeof cursors !== 'object' ||
      !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error('Parámetros inválidos de paginación de comentarios.');
  }

  const entries = await mapWithConcurrency(apps, async (app) => {
    if (!app?.id || typeof app.id !== 'string') {
      throw new Error('Identificador de app inválido.');
    }
    if (Object.prototype.hasOwnProperty.call(cursors, app.id) && cursors[app.id] === null) {
      return { appId: app.id, comments: [], cursor: null };
    }

    const ref = collection(db, 'apps', app.id, 'comments');
    const after = cursors[app.id];
    const criteria = [orderBy('createdAt', 'desc')];
    if (after) criteria.push(startAfter(after));
    const snapshot = await getDocs(query(ref, ...criteria, limit(pageSize + 1)));
    const docs = snapshot.docs.slice(0, pageSize);
    const hasNext = snapshot.docs.length > pageSize;

    return {
      appId: app.id,
      comments: docs.map((item) => ({
        id: item.id,
        appId: app.id,
        appTitle: app.title,
        ...item.data(),
      })),
      cursor: hasNext ? docs[docs.length - 1] : null,
    };
  }, 4);

  const nextCursors = { ...cursors };
  for (const item of entries) nextCursors[item.appId] = item.cursor;

  return {
    comments: newestCommentsFirst(entries.flatMap((item) => item.comments)),
    cursors: nextCursors,
    hasMore: entries.some((item) => item.cursor !== null)
  };
}
