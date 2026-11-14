import test from 'node:test';
import assert from 'node:assert/strict';
import { ratingForensics } from '../../scripts/phase3/rating-forensics.mjs';

test('Rating historical review calculates deltas without leaking app identities', () => {
  const input = {
    schemaVersion: 'appsem-integrity-audit-v1', mode: 'production-read-only',
    projectId: 'webs-8b1bf',
    apps: [
      {alias:'private-app-a',parentExists:true,issues:[{code:'RATING_SUM_DIFFERS_FROM_EVENTS'}],
       metrics:{ratingCount:{stored:2,observed:2},ratings:{storedSum:9,observedSum:8,observedValidEvents:2,storedAverage:4}}},
      {alias:'private-app-b',parentExists:true,issues:[{code:'RATING_SUM_DIFFERS_FROM_EVENTS'}],
       metrics:{ratingCount:{stored:1,observed:1},ratings:{storedSum:1,observedSum:5,observedValidEvents:1,storedAverage:5}}},
      {alias:'private-app-c',parentExists:true,issues:[],metrics:{}}
    ]
  };
  const result=ratingForensics(input);
  assert.equal(result.totalCases,2);
  assert.equal(result.totalProposedWrites,0);
  assert.equal(result.cases[0].difference,1);
  assert.equal(result.cases[1].difference,-4);
  assert.equal(result.cases[0].rationale,'observed-count-parity-but-history-not-proven');
  const serialized=JSON.stringify(result);
  for(const value of ['private-app-a','private-app-b','private-app-c','id','name','visitor']) {
    if (value==='id' || value==='name') continue;
    assert.ok(!serialized.includes(value));
  }
});
test('Refuses nonproduction or missing counter details', () => {
  assert.throws(()=>ratingForensics({schemaVersion:'appsem-integrity-audit-v1',mode:'emulator',projectId:'webs-8b1bf',apps:[]}));
  assert.throws(()=>ratingForensics({schemaVersion:'appsem-integrity-audit-v1',mode:'production-read-only',projectId:'wrong',apps:[]}));
  assert.throws(()=>ratingForensics({schemaVersion:'appsem-integrity-audit-v1',mode:'production-read-only',projectId:'webs-8b1bf',
    apps:[{parentExists:true,issues:[{code:'RATING_SUM_DIFFERS_FROM_EVENTS'}],metrics:{}}]}));
});
