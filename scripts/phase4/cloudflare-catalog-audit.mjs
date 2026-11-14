#!/usr/bin/env node
/** Comprobación puntual, solo lectura; sin datos de aplicaciones en los logs. */
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { summarizeCatalogQuality } from './catalog-quality.mjs';

if (process.env.PHASE4_CATALOG_AUDIT !== 'read-only' ||
    process.argv.length !== 3 || process.argv[2] !== '--confirm-production-read-only' ||
    process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  throw Error('Comprobación de catálogo no autorizada o credenciales ausentes.');
}
const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (credentials.project_id !== 'webs-8b1bf' ||
    credentials.type !== 'service_account' || !credentials.private_key) {
  throw Error('La identidad de Firebase no corresponde a Appsem.');
}
const app = initializeApp({
  credential: cert(credentials), projectId: 'webs-8b1bf'
}, 'phase4-live-read-only');
try {
  const snap = await getFirestore(app).collection('apps').limit(51).get();
  if (snap.size > 50) throw Error('Excede 50 aplicaciones. No se emite informe parcial.');
  const report = summarizeCatalogQuality(snap.docs.map(item => item.data()));
  console.log('APPSEM_FASE4_CATALOGO_SOLO_LECTURA ' + JSON.stringify(report));
} finally {
  await deleteApp(app);
}
