import { auth } from '../firebase';

const PART_BYTES = 20 * 1024 * 1024;
const DIRECT_LIMIT_BYTES = 64 * 1024 * 1024;
const MAX_APK_BYTES = 1_900_000_000;
const MIME_APK = 'application/vnd.android.package-archive';

function safeApkName(name, slug) {
  const raw = String(name || '').replace(/\.apk$/i, '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^[^a-zA-Z0-9]+/, '').replace(/-+/g, '-').slice(0, 100);
  return (raw || slug) + '.apk';
}

function getEndpoint() {
  const endpoint = import.meta.env.VITE_APK_UPLOAD_API;
  if (!endpoint || !/^https:\/\//.test(endpoint)) {
    throw Error('El servidor para subir APK todavía no está configurado.');
  }
  return endpoint;
}

async function getToken() {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    throw Error('Inicia sesión con el administrador autorizado.');
  }
  return user.getIdToken();
}

async function callUpload({ endpoint, token, operation, data, partIndex, uploadId, body }) {
  const headers = {
    Authorization: 'Bearer ' + token,
    'X-APK-Operation': operation,
    'Content-Type': body ? 'application/octet-stream' : 'application/json'
  };
  if (body) {
    headers['X-APK-Upload-Id'] = String(uploadId);
    headers['X-APK-Part-Index'] = String(partIndex);
  }
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST', headers, body: body || JSON.stringify(data)
    });
  } catch {
    throw Error('Se interrumpió la conexión durante la carga. Reintenta para continuar desde la última parte guardada.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Error(payload.error || (response.status === 413
      ? 'El servidor rechazó el tamaño de una parte.'
      : 'Error HTTP ' + response.status + ' durante la subida.'));
  }
  return payload;
}

function report(progress, phase, percent, extra = {}) {
  progress?.({ phase, percent, ...extra });
}

async function uploadLargeApk(file, slug, version, safeName, endpoint, token, progress) {
  const parts = Math.ceil(file.size / PART_BYTES);
  const data = { slug, version, name: safeName, size: file.size, parts };
  report(progress, 'Preparando subida segura...', 0);
  const started = await callUpload({ endpoint, token, operation: 'start', data });
  if (started.ready && started.apkUrl) {
    report(progress, 'APK disponible.', 100);
    return started;
  }
  const uploadId = started.uploadId;
  if (!Number.isInteger(uploadId)) throw Error('GitHub no devolvió una sesión de carga válida.');
  const existing = new Set(started.uploadedParts || []);
  if (started.chunkSize !== PART_BYTES) throw Error('El servidor usa un tamaño de parte diferente.');
  for (let index = 0; index < parts; index++) {
    const offset = index * PART_BYTES;
    const length = Math.min(PART_BYTES, file.size - offset);
    if (!existing.has(index)) {
      const chunk = file.slice(offset, offset + length);
      let done = false;
      let lastError;
      for (let attempt = 0; attempt < 3 && !done; attempt++) {
        try {
          await callUpload({
            endpoint, token, operation: 'part', uploadId,
            partIndex: index, body: chunk
          });
          done = true;
        } catch (error) {
          lastError = error;
          if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
        }
      }
      if (!done) throw lastError;
    }
    report(progress, 'Subiendo APK...', Math.min(95, Math.round(((index + 1) / parts) * 95)), {
      uploadedBytes: Math.min(file.size, offset + length), totalBytes: file.size
    });
  }
  report(progress, 'Verificando partes en GitHub...', 96);
  const completed = await callUpload({
    endpoint, token, operation: 'complete', data: { uploadId }
  });
  if (completed.ready && completed.apkUrl) {
    report(progress, 'APK disponible.', 100);
    return completed;
  }
  report(progress, 'Uniendo y verificando el APK en GitHub...', 98);
  // GitHub Actions assembles the uploaded pieces and publishes only the final APK.
  // The upload is only successful after the published asset is confirmed.
  for (let attempt = 0; attempt < 90; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 4000));
    const status = await callUpload({
      endpoint, token, operation: 'status', data: { uploadId }
    });
    if (status.ready && status.apkUrl) {
      report(progress, 'APK publicado correctamente.', 100);
      return status;
    }
  }
  throw Error('GitHub todavía no confirmó el APK completo. Vuelve a seleccionar el mismo archivo para consultar o reanudar la carga.');
}

// Endpoint seguro Cloudflare Pages Functions; el token privado de GitHub nunca
// se entrega al navegador. El archivo solo se considera subido con URL real.
export async function uploadApkToReleases(file, slug, version, onProgress) {
  if (!file?.name?.toLowerCase().endsWith('.apk')) throw Error('Selecciona un archivo .apk.');
  if (!file.size || file.size > MAX_APK_BYTES) {
    throw Error('El APK debe ocupar entre 1 byte y 1,9 GB.');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) {
    throw Error('Identificador de app inválido.');
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,50}$/.test(version || '')) {
    throw Error('Completa una versión válida antes de seleccionar el APK.');
  }
  const endpoint = getEndpoint();
  const token = await getToken();
  const name = safeApkName(file.name, slug);

  if (file.size > DIRECT_LIMIT_BYTES) {
    return uploadLargeApk(file, slug, version, name, endpoint, token, onProgress);
  }
  report(onProgress, 'Subiendo APK...', 0);
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': MIME_APK,
        'X-APK-Name': name,
        'X-APK-Slug': slug,
        'X-APK-Version': version
      },
      body: file
    });
  } catch {
    throw Error('No se pudo conectar con el servidor de subida.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.apkUrl) {
    throw Error(payload.error || 'La subida del APK no se completó (HTTP ' + response.status + ').');
  }
  report(onProgress, 'APK publicado correctamente.', 100);
  return payload;
}
