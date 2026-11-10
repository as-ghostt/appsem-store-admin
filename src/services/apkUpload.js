import { auth } from '../firebase';

// Endpoint seguro Cloudflare Pages Functions configurado en el panel: VITE_APK_UPLOAD_API.
export async function uploadApkToReleases(file, slug, version) {
  if (!file?.name?.toLowerCase().endsWith('.apk')) throw Error('Selecciona un archivo .apk.');
  if (!file.size || file.size > 95_000_000) throw Error('El APK supera el límite de carga de 95 MB.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) throw Error('Identificador de app inválido.');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,50}$/.test(version || '')) throw Error('Versión inválida.');
  const endpoint = import.meta.env.VITE_APK_UPLOAD_API;
  if (!endpoint || !/^https:\/\//.test(endpoint)) {
    throw Error('El servidor para subir APK todavía no está configurado.');
  }
  const user = auth.currentUser;
  if (!user || !user.emailVerified) throw Error('Inicia sesión con el administrador autorizado.');
  const token = await user.getIdToken();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/vnd.android.package-archive',
      'X-APK-Name': file.name,
      'X-APK-Slug': slug,
      'X-APK-Version': version
    },
    body: file
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.apkUrl) {
    throw Error(payload.error || 'La subida del APK no se completó.');
  }
  return payload;
}
