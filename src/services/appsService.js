import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCategoryLabel } from '../data/categories';
import { DEFAULT_DEVELOPER } from '../config';
import {
  moderateCommentAtomic, archiveAppAtomic, restoreAppAtomic, updatePublicationAtomic
} from './phase3Transactions';

const appsRef = collection(db, 'apps');

function cleanText(value) {
  return String(value || '').trim();
}

function parseScreenshots(value) {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);

  return String(value || '')
    .split('\n')
    .map(cleanText)
    .filter(Boolean);
}

export function buildAppPayload(formData, mode = 'create') {
  const categoryKey = cleanText(formData.categoryKey) || 'otros';
  const payload = {
    title: cleanText(formData.title),
    slug: cleanText(formData.slug),
    categoryKey,
    category: getCategoryLabel(categoryKey),
    shortDescription: cleanText(formData.shortDescription),
    fullDescription: cleanText(formData.fullDescription),
    iconUrl: cleanText(formData.iconUrl),
    bannerUrl: cleanText(formData.bannerUrl),
    screenshots: parseScreenshots(formData.screenshots),
    playStoreUrl: cleanText(formData.playStoreUrl),
    apkUrl: cleanText(formData.apkUrl),
    privacyPolicyUrl: cleanText(formData.privacyPolicyUrl),
    termsUrl: cleanText(formData.termsUrl),
    legalNoticeUrl: cleanText(formData.legalNoticeUrl),
    accountDeletionUrl: cleanText(formData.accountDeletionUrl),
    securityReportUrl: cleanText(formData.securityReportUrl),
    packageName: cleanText(formData.packageName),
    appSize: cleanText(formData.appSize),
    operatingSystem: cleanText(formData.operatingSystem) || 'Android',
    minAndroidVersion: cleanText(formData.minAndroidVersion),
    currentVersion: cleanText(formData.currentVersion),
    lastUpdate: cleanText(formData.lastUpdate),
    languages: cleanText(formData.languages),
    offlineUse: cleanText(formData.offlineUse),
    containsAds: cleanText(formData.containsAds),
    inAppPurchases: cleanText(formData.inAppPurchases),
    ageRating: cleanText(formData.ageRating),
    price: cleanText(formData.price),
    developer: cleanText(formData.developer) || DEFAULT_DEVELOPER,
    featured: Boolean(formData.featured),
    status: cleanText(formData.status) || 'draft',
    updatedAt: serverTimestamp(),
  };

  if (mode === 'create') {
    return {
      ...payload,
      likesCount: 0,
      downloadsCount: 0,
      ratingCount: 0,
      ratingSum: 0,
      ratingAverage: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
    };
  }

  return payload;
}

export function validateAppPayload(payload) {
  const errors = {};

  if (!payload.title) errors.title = 'El nombre de la app es obligatorio.';
  if (!payload.slug) errors.slug = 'El slug es obligatorio.';
  if (!payload.shortDescription) errors.shortDescription = 'La descripción corta es obligatoria.';
  if (!payload.fullDescription) errors.fullDescription = 'La descripción completa es obligatoria.';
  if (!payload.iconUrl) errors.iconUrl = 'El icono por URL es obligatorio.';
  // Se puede publicar una aplicación en Play Store, mediante APK directo, o ambos.
  if (!payload.playStoreUrl && !payload.apkUrl) {
    errors.playStoreUrl = 'Agrega un enlace de Google Play o un APK.';
    errors.apkUrl = 'Agrega un enlace de descarga APK o Google Play.';
  }
  for (const field of ['playStoreUrl', 'apkUrl']) {
    if (payload[field]) {
      try {
        const url = new URL(payload[field]);
        if (url.protocol !== 'https:' || url.username || url.password ||
            !url.hostname.includes('.') || /^(localhost|127\\.|10\\.|192\\.168\\.)/.test(url.hostname)) {
          errors[field] = 'Se requiere una URL HTTPS pública.';
        }
        if (field === 'apkUrl' && !/^github\\.com$/i.test(url.hostname)) {
          errors[field] = 'Solo se admiten enlaces de GitHub Releases.';
        }
        if (field === 'apkUrl' &&
            !/^\\/[^/]+\\/[^/]+\\/releases\\/download\\/[^/]+\\/[^/]+\\.apk$/i.test(url.pathname)) {
          errors[field] = 'Usa el enlace directo de un APK de GitHub Releases.';
        }
      } catch { errors[field] = 'URL de descarga inválida.'; }
    }
  }
  if (!payload.privacyPolicyUrl) errors.privacyPolicyUrl = 'La política de privacidad de la app es obligatoria.';

  return errors;
}

export function subscribeToApps(callback, onError) {
  const q = query(appsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const apps = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));
      callback(apps);
    },
    onError
  );
}

export async function getApp(appId) {
  const snapshot = await getDoc(doc(db, 'apps', appId));
  if (!snapshot.exists()) throw new Error('La app no existe.');
  return { id: snapshot.id, ...snapshot.data() };
}

export async function createApp(formData) {
  const payload = buildAppPayload(formData, 'create');
  const errors = validateAppPayload(payload);

  if (Object.keys(errors).length > 0) {
    const error = new Error('Revisa los campos obligatorios.');
    error.fields = errors;
    throw error;
  }

  return addDoc(appsRef, payload);
}

export async function updateApp(appId, formData) {
  const payload = buildAppPayload(formData, 'edit');
  const errors = validateAppPayload(payload);

  if (Object.keys(errors).length > 0) {
    const error = new Error('Revisa los campos obligatorios.');
    error.fields = errors;
    throw error;
  }

  // Una URL directa al editor no debe permitir volver a publicar una app
  // archivada sin pasar por la operación explícita de restauración.
  const appRef = doc(db, 'apps', appId);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(appRef);
    if (!snapshot.exists()) throw new Error('La aplicación ya no existe.');
    if (snapshot.data().status === 'archived') {
      throw new Error('Primero restaura la aplicación archivada a borrador.');
    }
    tx.update(appRef, payload);
  });
}

export async function archiveApp(appId) {
  return archiveAppAtomic(db, appId);
}

export async function restoreApp(appId) {
  return restoreAppAtomic(db, appId);
}

export async function updateAppStatus(appId, status) {
  return updatePublicationAtomic(db, appId, status);
}

export async function loadAllComments(apps = []) {
  const results = [];

  for (const app of apps) {
    const commentsRef = collection(db, 'apps', app.id, 'comments');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(commentsQuery);

    snapshot.forEach((commentDocument) => {
      results.push({
        id: commentDocument.id,
        appId: app.id,
        appTitle: app.title,
        ...commentDocument.data(),
      });
    });
  }

  return results.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });
}

export async function approveComment(comment) {
  return moderateCommentAtomic(db, comment, 'approve');
}

export async function hideComment(comment) {
  return moderateCommentAtomic(db, comment, 'hide');
}

export async function removeComment(comment) {
  return moderateCommentAtomic(db, comment, 'remove');
}
