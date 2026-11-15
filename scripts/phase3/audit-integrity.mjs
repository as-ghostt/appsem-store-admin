#!/usr/bin/env node
/**
 * Auditoria de Firestore SOLO LECTURA. Nunca llama set/update/delete/batch.
 * La lectura real requiere doble confirmacion explicita y credenciales ADC.
 * Los identificadores se representan mediante HMAC, sin revelar IDs ni PII.
 */
import { createHmac } from 'node:crypto';
import { applicationDefault, initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { auditAppIntegrity, summarizeIntegrity } from './integrity-core.mjs';
import { auditCatalogSlugs } from './catalog-slug-audit.mjs';

const KNOWN = ['comments', 'likes', 'ratings', 'downloadClicks', 'downloads'];
const DEMO_PROJECT = 'demo-appsem-phase3';
const PROD_PROJECT = 'webs-8b1bf';

function readArgs(args, env) {
  const project = args.find(a => a.startsWith('--project='))?.slice('--project='.length);
  const emulator = Boolean(env.FIRESTORE_EMULATOR_HOST);
  const confirmedDemo = args.includes('--read-emulator');
  const confirmedProduction = args.includes('--confirm-production-read-only');
  if (emulator) {
    if (project !== DEMO_PROJECT || !confirmedDemo || confirmedProduction
      || !/^(127\.0\.0\.1|localhost):8080$/.test(env.FIRESTORE_EMULATOR_HOST)) {
      throw Error('Emulator: exige --project=demo-appsem-phase3 --read-emulator y host local :8080.');
    }
  } else if (project !== PROD_PROJECT || !confirmedProduction || confirmedDemo) {
    throw Error('Produccion: exige --project=webs-8b1bf --confirm-production-read-only y ADC de lectura.');
  }
  const key = env.PHASE3_AUDIT_KEY;
  if (typeof key !== 'string' || key.length < 16) {
    throw Error('Define PHASE3_AUDIT_KEY (minimo 16 caracteres) fuera del repositorio.');
  }
  const maxAppsValue = args.find(a => a.startsWith('--max-apps='))?.slice(11) ?? '500';
  const maxEventsValue = args.find(a => a.startsWith('--max-events='))?.slice(13) ?? '5000';
  const maxApps = Number(maxAppsValue), maxEvents = Number(maxEventsValue);
  if (!Number.isSafeInteger(maxApps) || maxApps < 1 || maxApps > 5000 ||
      !Number.isSafeInteger(maxEvents) || maxEvents < 1 || maxEvents > 10000) {
    throw Error('Limites invalidos: --max-apps=1..5000 --max-events=1..10000');
  }
  return { project, emulator, key, maxApps, maxEvents };
}

export async function scanFirestore(db, { project, emulator, key, maxApps = 500, maxEvents = 5000 }) {
  // listDocuments permite inspeccionar padres faltantes con subcolecciones existentes.
  const references = (await db.collection('apps').listDocuments())
    .sort((a, b) => a.id.localeCompare(b.id, 'en'));
  if (references.length > maxApps) {
    throw Error('La cantidad de apps excede --max-apps. Reporte no generado.');
  }
  const rows = [];
  const slugInventory = [];
  for (const ref of references) {
    const [app, subcollections] = await Promise.all([ref.get(), ref.listCollections()]);
    // El identificador original solo se utiliza en memoria para contar colisiones.
    slugInventory.push({ id: ref.id, exists: app.exists, slug: app.exists ? app.data().slug : undefined });
    const available = new Set(subcollections.map(c => c.id));
    const events = {};
    for (const name of KNOWN) {
      if (!available.has(name)) {
        events[name] = [];
        continue;
      }
      const snapshot = await ref.collection(name).limit(maxEvents + 1).get();
      if (snapshot.size > maxEvents) {
        throw Error('Limite de eventos por subcoleccion excedido. Reporte no generado.');
      }
      // Los datos personales se mantienen solo en memoria y NUNCA se serializan.
      events[name] = snapshot.docs.map(item => item.data());
    }
    const alias = createHmac('sha256', key).update(ref.path).digest('hex').slice(0, 20);
    rows.push(auditAppIntegrity({
      alias, exists: app.exists, app: app.exists ? app.data() : {},
      events, unknownCollections: subcollections.filter(c => !KNOWN.includes(c.id)).length
    }));
  }
  const report = summarizeIntegrity(rows, project, emulator ? 'emulator' : 'production-read-only');
  return { ...report, catalogSlugs: auditCatalogSlugs(slugInventory) };
}

async function main() {
  const config = readArgs(process.argv.slice(2), process.env);
  const app = initializeApp(config.emulator
    ? { projectId: config.project }
    : { projectId: config.project, credential: applicationDefault() },
  'phase3-integrity-audit');
  try {
    const report = await scanFirestore(getFirestore(app), config);
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } finally {
    await deleteApp(app);
  }
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  main().catch(error => {
    console.error('AUDITORIA NO COMPLETADA: ' + error.message);
    process.exitCode = 1;
  });
}
