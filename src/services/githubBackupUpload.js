import { backupBase64, gitBlobSha1 } from './browserBackupEncryption.js';

const OWNER = 'as-ghostt';
const REPO = 'appsem-store-admin';

export async function uploadEncryptedBackupToGitHub(file, filename, personalToken) {
  if (typeof personalToken !== 'string' || personalToken.trim().length < 20) {
    throw new Error('Necesitas un token GitHub temporal con permiso Contents: write para este repositorio.');
  }
  if (!/^appsem-firestore-[0-9TZ-]+-[a-f0-9]{8}\.appsem\.enc$/.test(filename)) {
    throw new Error('Nombre de respaldo cifrado inválido.');
  }
  if (file.length > 24 * 1024 * 1024) throw new Error('Archivo demasiado grande para subir desde el navegador.');
  const path = 'backups/encrypted/' + filename;
  const url = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + path;
  const response = await fetch(url, {
    method: 'PUT',
    referrerPolicy: 'no-referrer',
    headers: {
      Authorization: 'Bearer ' + personalToken.trim(),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'backup(firestore): guardar datos cifrados desde Admin ' + new Date().toISOString(),
      content: backupBase64(file),
      branch: 'main'
    })
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('GitHub rechazó el token. Revisa que sea válido.');
    if (response.status === 403) throw new Error('GitHub denegó la escritura: token sin permiso Contents: write o restricción del repositorio.');
    if (response.status === 404) throw new Error('Repositorio no accesible para el token indicado.');
    if (response.status === 422) throw new Error('GitHub rechazó el archivo: conflicto de nombre o restricción de tamaño.');
    throw new Error('No se completó la subida a GitHub (HTTP ' + response.status + ').');
  }
  const result = await response.json();
  const expectedBlob = await gitBlobSha1(file);
  if (result.content?.path !== path || result.content?.sha !== expectedBlob || !result.commit?.sha) {
    throw new Error('GitHub respondió, pero no se pudo comprobar la integridad del archivo subido.');
  }
  return { path, url: 'https://github.com/' + OWNER + '/' + REPO + '/blob/main/' + path, commit: result.commit.sha };
}
