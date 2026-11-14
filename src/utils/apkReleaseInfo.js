import { createSlug } from './slug.js';

/**
 * Prepara la etiqueta privada de GitHub Releases sin exigir que el formulario
 * ya haya guardado un slug o una versión comercial de la aplicación.
 * La etiqueta técnica nunca se copia a form.currentVersion.
 */
export function resolveApkReleaseInfo(form, file, originalApp) {
  const slug = [
    form?.slug, originalApp?.slug, form?.title, originalApp?.title,
    String(file?.name || '').replace(/\.apk$/i, '')
  ].map(value => createSlug(value || '')).find(Boolean);
  if (!slug) {
    throw Error('Escribe el nombre de la aplicación o selecciona un APK con nombre válido.');
  }

  const enteredVersion = String(form?.currentVersion || originalApp?.currentVersion || '').trim();
  if (enteredVersion && !/^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,50}$/.test(enteredVersion)) {
    throw Error('La versión actual contiene caracteres inválidos. Usa números, letras, puntos o guiones.');
  }

  const size = Number(file?.size);
  const modified = Number(file?.lastModified);
  if (!Number.isSafeInteger(size) || size < 1) {
    throw Error('Selecciona un archivo APK válido.');
  }
  const stableModification = Number.isSafeInteger(modified) && modified > 0 ? modified : 0;
  const technicalVersion = 'archivo-' + size + '-' + stableModification;
  return { slug, version: enteredVersion || technicalVersion };
}
