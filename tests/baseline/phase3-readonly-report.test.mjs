import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAuditForLogs } from '../../scripts/phase3/read-only-report.mjs';

test('Audit logs show only aggregated counters, never IDs or personally identifying details', () => {
  const original = {
    schemaVersion: 'appsem-integrity-audit-v1',
    mode: 'production-read-only',
    projectId: 'webs-8b1bf',
    summary: { existingApps: 2, appReferences: 2, orphanParents: 0, errors: 1, reviews: 1 },
    apps: [
      { alias: 'private-alias-123', status: 'published',
        issues: [{ code: 'APPROVED_COMMENTS_COUNT_MISMATCH', severity: 'error' }],
        metrics: { commentsCount: { observed: 6, stored: 5 } } },
      { alias: 'private-alias-456', status: 'draft',
        issues: [{ code: 'HISTORICAL_LIKESCOUNT_DIFFERENCE', severity: 'review' }],
        metrics: { likesCount: { observed: 2, stored: 6 } } }
    ]
  };
  const result = summarizeAuditForLogs(original);
  assert.equal(result.findings['error:APPROVED_COMMENTS_COUNT_MISMATCH'], 1);
  assert.equal(result.statuses.published, 1);
  assert.equal(result.statuses.draft, 1);
  assert.equal(result.assessment, 'requires-investigation-no-automatic-changes');
  const text = JSON.stringify(result);
  assert.equal(text.includes('private-alias'), false);
  assert.equal(text.includes('"metrics"'), false);
  assert.equal(text.includes('"apps"'), false);
  assert.equal(text.includes('"commentsCount"'), false);
});

test('Refuse non-production or unexpected project in diagnostic output', () => {
  for (const mode of ['emulator', 'preview']) {
    assert.throws(() => summarizeAuditForLogs({
      schemaVersion: 'appsem-integrity-audit-v1', mode,
      projectId: 'webs-8b1bf', summary: {}, apps: []
    }));
  }
  assert.throws(() => summarizeAuditForLogs({
    schemaVersion: 'appsem-integrity-audit-v1', mode: 'production-read-only',
    projectId: 'some-other-project', summary: {}, apps: []
  }));
});
