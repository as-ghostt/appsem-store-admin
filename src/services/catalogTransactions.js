/**
 * Fase 4 — protección del identificador público.
 *
 * Las nuevas fichas usan el slug como ID atómico de apps/{slug}. Esto impide
 * que dos creaciones concurrentes reserven el mismo identificador.
 *
 * La búsqueda previa incluye fichas históricas con IDs automáticos. Las
 * renombradas de fichas antiguas necesitan migración de índice para garantizar
 * exclusividad ante DOS ediciones administrativas simultáneas; no se cambia
 * la base real ni sus reglas en este lote.
 */
import { collection, doc, getDocs, limit, query, runTransaction, where } from 'firebase/firestore';
import { isValidCatalogSlug } from '../utils/catalogSlug.js';

function conflict() {
  const error = new Error('Ese identificador público ya pertenece a otra aplicación.');
  error.fields = { slug: 'Ya existe una aplicación con este identificador.' };
  return error;
}

async function assertSlugAvailable(db, slug, excludeId = null) {
  if (!isValidCatalogSlug(slug)) {
    const error = new Error('El identificador público no es válido.');
    error.fields = { slug: 'Usa letras minúsculas, números y guiones (máximo 80 caracteres).' };
    throw error;
  }
  const snapshot = await getDocs(query(
    collection(db, 'apps'), where('slug', '==', slug), limit(3)
  ));
  if (snapshot.docs.some(item => item.id !== excludeId)) throw conflict();
}

export async function createCatalogApp(db, payload) {
  await assertSlugAvailable(db, payload.slug);
  const target = doc(db, 'apps', payload.slug);
  await runTransaction(db, async tx => {
    const previous = await tx.get(target);
    if (previous.exists()) throw conflict();
    tx.set(target, payload);
  });
  return target;
}

export async function updateCatalogApp(db, appId, payload) {
  if (!appId || typeof appId !== 'string') throw Error('ID de aplicación inválido.');
  await assertSlugAvailable(db, payload.slug, appId);
  const ref = doc(db, 'apps', appId);
  return runTransaction(db, async tx => {
    const current = await tx.get(ref);
    if (!current.exists()) throw Error('La aplicación ya no existe.');
    if (current.data().status === 'archived') {
      throw Error('Primero restaura la aplicación archivada a borrador.');
    }
    // También impide que una edición reutilice un slug reclamado por una
    // creación concurrente moderna (ID = slug) desde el preflight.
    if (appId !== payload.slug) {
      const canonicalRef = doc(db, 'apps', payload.slug);
      const canonical = await tx.get(canonicalRef);
      if (canonical.exists() && canonical.data().slug === payload.slug) throw conflict();
    }
    tx.update(ref, payload);
  });
}
