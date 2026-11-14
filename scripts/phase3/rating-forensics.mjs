/**
 * Forense agregado de ratingSum: diagnostica inconsistencias sin revelar
 * aplicaciones, usuarios, identificadores ni eventos individuales.
 * No consulta Firebase y nunca propone escrituras.
 */
function validRating(n) {
  return Number.isSafeInteger(n) && n >= 0;
}
export function ratingForensics(report) {
  if (!report || report.schemaVersion !== 'appsem-integrity-audit-v1' ||
      report.mode !== 'production-read-only' || report.projectId !== 'webs-8b1bf' ||
      !Array.isArray(report.apps)) {
    throw Error('Se necesita un informe de producción de solo lectura.');
  }
  const cases = [];
  for (const row of report.apps) {
    if (!row.parentExists || !row.issues?.some(x => x.code === 'RATING_SUM_DIFFERS_FROM_EVENTS')) continue;
    const count = row.metrics?.ratingCount;
    const rating = row.metrics?.ratings;
    if (!validRating(count?.stored) || !validRating(count?.observed) ||
        !validRating(rating?.storedSum) || !validRating(rating?.observedSum)) {
      throw Error('Métricas incompletas: no inferir ni corregir ratingSum.');
    }
    const delta = rating.storedSum - rating.observedSum;
    cases.push({
      storedRatingCount: count.stored,
      observedRatingDocuments: count.observed,
      storedSum: rating.storedSum,
      observedSum: rating.observedSum,
      difference: delta,
      direction: delta > 0 ? 'stored-higher' : delta < 0 ? 'stored-lower' : 'equal',
      storedAverage: rating.storedAverage,
      rationale: count.stored === count.observed &&
        rating.observedValidEvents === count.observed
          ? 'observed-count-parity-but-history-not-proven'
          : 'incomplete-or-invalid-rating-history',
      action: 'manual-review-no-production-write'
    });
  }
  return {
    schemaVersion: 'appsem-rating-forensics-v1',
    mode: 'production-read-only',
    totalCases: cases.length,
    totalProposedWrites: 0,
    cases
  };
}
