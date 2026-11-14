import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { uploadEncryptedBackupToGitHub } from '../../src/services/githubBackupUpload.js';

test('La copia cifrada se envía al repositorio migrado as-ghostt, no al antiguo', async () => {
  const original = globalThis.fetch;
  const bytes = Uint8Array.from([65,80,80,83,69,77,45,66,65,67,75,85,80,45,49,10]);
  const name = 'appsem-firestore-2026-11-14T17-00-00-000Z-1234abcd.appsem.enc';
  const expectedPath = 'backups/encrypted/' + name;
  const expectedSha = createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0'))
    .update(bytes).digest('hex');
  let called = false;
  globalThis.fetch = async (url, options = {}) => {
    called = true;
    assert.equal(url, 'https://api.github.com/repos/as-ghostt/appsem-store-admin/contents/' + expectedPath);
    assert.equal(options.method, 'PUT');
    const payload = JSON.parse(options.body);
    assert.equal(payload.branch, 'main');
    assert.equal(payload.content, Buffer.from(bytes).toString('base64'));
    assert.equal(options.headers.Authorization, 'Bearer ' + 't'.repeat(24));
    return Response.json({ content: { path: expectedPath, sha: expectedSha },
      commit: { sha: 'synthetic-test-commit' } }, { status: 201 });
  };
  try {
    const out = await uploadEncryptedBackupToGitHub(bytes, name, 't'.repeat(24));
    assert.equal(called, true);
    assert.equal(out.path, expectedPath);
    assert.equal(out.url, 'https://github.com/as-ghostt/appsem-store-admin/blob/main/' + expectedPath);
  } finally { globalThis.fetch = original; }
});

test('El navegador no acepta nombres de respaldo sin cifrado o con rutas alteradas', async () => {
  await assert.rejects(uploadEncryptedBackupToGitHub(Uint8Array.from([1]), '../secret.txt', 't'.repeat(24)));
});
