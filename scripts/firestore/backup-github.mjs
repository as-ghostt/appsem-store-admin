/**
 * Firestore real -> copia local privada -> cifrado verificado -> GitHub.
 * Repo destino es PÚBLICO: jamás subir documentos sin cifrar.
 */
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createArchive } from './archive.mjs';
import { askHidden, decryptBackup, encryptBackup } from './encrypted.mjs';
import { isAllowedBackupOrigin } from './backup-origin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const expected = 'webs-8b1bf';
const args = process.argv.slice(2);
const command = (args) => execFileSync('git', args, {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
}).trim();

function preflight() {
  if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error('No mezclar el respaldo real con un emulador.');
  if (!args.includes('--project=' + expected) || !args.includes('--confirm-read') ||
      !args.includes('--confirm-github')) {
    throw new Error('Uso: npm run firestore:backup:github -- --project=webs-8b1bf --confirm-read --confirm-github');
  }
  const from = command(['remote', 'get-url', 'origin']);
  if (!isAllowedBackupOrigin(from)) {
    throw new Error('Origin no coincide con el repositorio GitHub Appsem Store Admin.');
  }
  if (command(['branch', '--show-current']) !== 'main') throw new Error('Ejecutar únicamente en main.');
  if (command(['status', '--porcelain'])) {
    throw new Error('Git tiene cambios pendientes: guarda o confirma tus cambios antes del respaldo.');
  }
  if (command(['rev-parse', 'HEAD']) !== command(['rev-parse', 'refs/remotes/origin/main'])) {
    throw new Error('main local y origin/main difieren: primero ejecuta git pull origin main.');
  }
}
try {
  preflight();
  const pass = await askHidden('Frase de cifrado (mínimo 20 caracteres, NO se guardará): ');
  const pass2 = await askHidden('Repetir frase de cifrado: ');
  if (pass !== pass2) throw new Error('Las frases no coinciden. No se ha leído Firestore.');
  if (pass.length < 20) throw new Error('Frase demasiado corta. No se ha leído Firestore.');
  const suffix = new Date().toISOString().replace(/[:.]/g, '-');
  const name = 'appsem-firestore-' + suffix + '-' + randomBytes(4).toString('hex') + '.appsem.enc';
  const relative = 'backups/encrypted/' + name;
  const local = join(root, 'backups', 'firestore');
  const output = join(root, relative);
  const app = initializeApp({ projectId: expected, credential: applicationDefault() });
  let plainDir;
  try {
    console.log('Exportando desde Firestore SOLO en lectura...');
    const backup = await createArchive(getFirestore(app), {
      projectId: expected, outputRoot: local
    });
    plainDir = backup.dir;
    console.log('Documentos leídos:', backup.manifest.documents);
    const sealed = await encryptBackup(plainDir, output, pass);
    if (sealed.bytes > 90 * 1024 * 1024) {
      throw new Error('Respaldo cifrado >90 MiB: no subir al Git normal. Usa un almacén privado.');
    }
    // Autenticación y SHA-256 de la copia cifrada ANTES de publicar.
    const proof = await decryptBackup(output, local, pass);
    try {
      if (proof.manifest.archiveSha256 !== backup.manifest.archiveSha256 ||
          proof.manifest.documents !== backup.manifest.documents) {
        throw new Error('La copia descifrada no coincide con el respaldo original.');
      }
      console.log('Cifrado y verificación correcta. SHA-256 original:', backup.manifest.archiveSha256);
    } finally {
      await rm(proof.dir, { force: true, recursive: true });
    }
    console.log('Publicando ÚNICAMENTE el archivo cifrado en GitHub...');
    command(['add', '--', relative]);
    const staged = command(['diff', '--cached', '--name-only']);
    if (staged !== relative) throw new Error('Git contiene archivos diferentes al backup cifrado; se bloquea commit.');
    command(['commit', '-m', 'backup(firestore): almacenar copia cifrada ' + suffix]);
    command(['push', 'origin', 'HEAD:main']);
    console.log('BACKUP CIFRADO SUBIDO A GITHUB:', relative);
    console.log('Conserva la frase de cifrado FUERA de GitHub; sin ella no podrás recuperar los datos.');
  } finally {
    await app.delete();
    if (plainDir) await rm(plainDir, { recursive: true, force: true });
  }
} catch (e) {
  console.error('OPERACIÓN NO COMPLETADA:', e.message);
  console.error('Si el push falló, comprueba el commit local y ejecuta git push origin main.');
  process.exitCode = 1;
}
