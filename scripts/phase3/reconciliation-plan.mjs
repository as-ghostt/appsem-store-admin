/**
 * Fase 3 — plan de conciliación determinista, sin escrituras.
 * NO importa Firebase ni ofrece funciones que apliquen operaciones.
 * Los recuentos históricos de likes/ratings/downloads son evidencia parcial.
 */
const SCHEMA = 'appsem-reconciliation-dry-run-v1';

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function buildReconciliationDryRun(report) {
  if (report?.schemaVersion !== 'appsem-integrity-audit-v1' ||
      !Array.isArray(report?.apps)) {
    throw Error('Informe de integridad incompatible.');
  }
  const rows = [];
  for (const app of report.apps) {
    if (!app?.parentExists) {
      rows.push({ alias: app.alias, type: 'orphan-manual-investigation', applied: false });
      continue;
    }
    const comments = app.metrics?.commentsCount;
    if (comments?.verdict === 'mismatch') {
      if (!safeCount(comments.stored) || !safeCount(comments.observed)) {
        rows.push({ alias: app.alias, type: 'invalid-counter-manual-review', applied: false });
      } else {
        rows.push({
          alias: app.alias,
          type: 'comments-count-proposal',
          current: comments.stored,
          proposed: comments.observed,
          delta: comments.observed - comments.stored,
          applied: false,
          prerequisites: ['verified-recent-backup', 'fresh-transactional-recount', 'manual-approval']
        });
      }
    }
    for (const issue of app.issues || []) {
      if (issue.code === 'RATING_SUM_DIFFERS_FROM_EVENTS' ||
          issue.code === 'RATING_AVERAGE_DIFFERS_FROM_EVENTS' ||
          issue.code === 'RATING_HISTORY_NOT_RECONCILABLE') {
        rows.push({
          alias: app.alias,
          type: 'rating-history-manual-review',
          reason: issue.code,
          applied: false,
          prohibitsAutomaticRatingChanges: true
        });
      } else if (issue.code.startsWith('HISTORICAL_')) {
        rows.push({
          alias: app.alias,
          type: 'incomplete-history-review',
          reason: issue.code,
          applied: false
        });
      }
    }
  }
  const types = {};
  for (const row of rows) types[row.type] = (types[row.type] || 0) + 1;
  return {
    schemaVersion: SCHEMA,
    sourceMode: report.mode,
    dryRun: true,
    appliedWrites: 0,
    backupRequiredBeforeCorrections: true,
    summary: {
      appReferences: report.summary?.appReferences ?? report.apps.length,
      proposed: rows.length,
      byType: Object.fromEntries(Object.entries(types).sort())
    },
    recommendations: rows
  };
}

/** PII-safe projection, for build logs only, never includes aliases or counters per app. */
export function summarizeReconciliationDryRun(plan) {
  if (plan?.schemaVersion !== SCHEMA || plan?.appliedWrites !== 0 || plan?.dryRun !== true) {
    throw Error('No es un plan de solo lectura.');
  }
  return {
    schemaVersion: plan.schemaVersion,
    dryRun: true,
    appliedWrites: 0,
    backupRequiredBeforeCorrections: true,
    ...plan.summary
  };
}
