/** Proyección del auditor para logs operativos: sin alias, IDs, eventos ni PII. */
export function summarizeAuditForLogs(audit) {
  if (audit?.schemaVersion !== 'appsem-integrity-audit-v1' ||
    audit?.mode !== 'production-read-only' ||
    !Array.isArray(audit?.apps) ||
    audit?.projectId !== 'webs-8b1bf') {
    throw Error('Informe inválido o no procedente de lectura productiva.');
  }
  const issues = {};
  const statuses = {};
  const summaries = audit.summary;
  for (const app of audit.apps) {
    const status = app.status ?? 'missing-parent';
    statuses[status] = (statuses[status] || 0) + 1;
    for (const issue of app.issues || []) {
      if (!/^[A-Z0-9_]+$/.test(issue.code) ||
        !['error', 'review'].includes(issue.severity)) {
        throw Error('Código de hallazgo inválido.');
      }
      const key = issue.severity + ':' + issue.code;
      issues[key] = (issues[key] || 0) + 1;
    }
  }
  return {
    schemaVersion: audit.schemaVersion, mode: audit.mode, projectId: audit.projectId,
    existingApps: summaries.existingApps,
    appReferences: summaries.appReferences,
    orphanParents: summaries.orphanParents,
    errors: summaries.errors, reviews: summaries.reviews,
    statuses: Object.fromEntries(Object.entries(statuses).sort()),
    findings: Object.fromEntries(Object.entries(issues).sort()),
    assessment: summaries.errors > 0
      ? 'requires-investigation-no-automatic-changes'
      : 'no-confirmed-counter-errors-review-historical-warnings'
  };
}
