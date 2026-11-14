import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReconciliationDryRun, summarizeReconciliationDryRun } from '../../scripts/phase3/reconciliation-plan.mjs';

test('Two historical rating sums trigger investigation, never automatic migration', () => {
  const report = {
    schemaVersion: 'appsem-integrity-audit-v1', mode: 'production-read-only',
    summary: { appReferences: 2 },
    apps: [
      { alias: 'private-1', parentExists: true,
        metrics: { commentsCount: { stored: 0, observed: 0, verdict: 'matches' } },
        issues: [{ code: 'RATING_SUM_DIFFERS_FROM_EVENTS', severity: 'review' }] },
      { alias: 'private-2', parentExists: true,
        metrics: { commentsCount: { stored: 1, observed: 1, verdict: 'matches' } },
        issues: [{ code: 'RATING_SUM_DIFFERS_FROM_EVENTS', severity: 'review' }] }
    ]
  };
  const p = buildReconciliationDryRun(report);
  assert.equal(p.appliedWrites, 0);
  assert.equal(p.summary.byType['rating-history-manual-review'], 2);
  assert.equal(p.recommendations.every(x => x.prohibitsAutomaticRatingChanges), true);
  const publicReport = JSON.stringify(summarizeReconciliationDryRun(p));
  assert.equal(publicReport.includes('private-'), false);
});

test('Only exact approved comments mismatch can suggest a guarded correction', () => {
  const p = buildReconciliationDryRun({
    schemaVersion: 'appsem-integrity-audit-v1', mode: 'emulator',
    apps: [{ alias: 'synthetic', parentExists: true,
      metrics: { commentsCount: { stored: 2, observed: 4, verdict: 'mismatch' } },
      issues: [{ code: 'APPROVED_COMMENTS_COUNT_MISMATCH', severity: 'error' }]
    }]
  });
  assert.deepEqual(p.recommendations, [{
    alias: 'synthetic', type: 'comments-count-proposal',
    current: 2, proposed: 4, delta: 2, applied: false,
    prerequisites: ['verified-recent-backup', 'fresh-transactional-recount', 'manual-approval']
  }]);
  assert.equal(p.appliedWrites, 0);
});

test('Rejects unsupported report schema and unsafe summaries', () => {
  assert.throws(() => buildReconciliationDryRun({ schemaVersion: 'other', apps: [] }));
  assert.throws(() => summarizeReconciliationDryRun({schemaVersion:'appsem-reconciliation-dry-run-v1',dryRun:true,appliedWrites:1}));
});
