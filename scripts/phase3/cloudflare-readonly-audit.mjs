#!/usr/bin/env node
/**
 * Diagnóstico acotado de producción desde la compilación de Cloudflare.
 * Solo lectura; ningún documento, credencial, alias ni dato personal se imprime.
 *
 * Ejecución intencional:
 *   PHASE3_PRODUCTION_AUDIT=read-only \
 *   node scripts/phase3/cloudflare-readonly-audit.mjs --confirm-production-read-only
 *
 * FIREBASE_SERVICE_ACCOUNT_JSON debe permanecer como Secret de Cloudflare.
 */
import { randomBytes } from 'node:crypto';
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { scanFirestore } from './audit-integrity.mjs';
import { summarizeAuditForLogs } from './read-only-report.mjs';

const expectedProject = 'webs-8b1bf';
const args = process.argv.slice(2);
if (
  process.env.PHASE3_PRODUCTION_AUDIT !== 'read-only' ||
  args.length !== 1 || args[0] !== '--confirm-production-read-only' ||
  process.env.FIRESTORE_EMULATOR_HOST ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  !process.env.FIREBASE_SERVICE_ACCOUNT_JSON
) {
  throw Error('Auditoría de producción no autorizada o credenciales ausentes.');
}
const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (credentials.project_id !== expectedProject ||
    credentials.type !== 'service_account' ||
    !credentials.client_email ||
    !credentials.private_key) {
  throw Error('Identidad de servicio incompatible con webs-8b1bf.');
}
const app = initializeApp({ projectId: expectedProject, credential: cert(credentials) }, 'phase3-live-readonly');
try {
  const audit = await scanFirestore(getFirestore(app), {
    project: expectedProject, emulator: false,
    key: randomBytes(32).toString('hex'),
    maxApps: 50, maxEvents: 1000
  });
  const report = summarizeAuditForLogs(audit);
  process.stdout.write('APPSEM_FASE3_AUDITORIA_SOLO_LECTURA ' + JSON.stringify(report) + '\n');
} finally {
  await deleteApp(app);
}
