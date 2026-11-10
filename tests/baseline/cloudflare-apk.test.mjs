import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../../functions/api/upload-apk.js';

test('Cloudflare APK endpoint refuses uploads when GitHub secret is absent', async () => {
  const origin = 'https://appsem-store-admin.pages.dev';
  const res = await onRequest({
    request: new Request(origin + '/api/upload-apk', {
      method: 'POST',
      headers: { Origin: origin, 'content-type': 'application/vnd.android.package-archive' },
      body: 'not-an-apk'
    }),
    env: { GITHUB_REPOSITORY: 'as-ghostt/appsem-store', FIREBASE_PROJECT_ID: 'webs-8b1bf',
      ADMIN_EMAIL: 'eler30.mr@gmail.com' }
  });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: 'Servidor de carga no configurado.' });
});

test('Cloudflare APK endpoint rejects unauthorized origins before credentials', async () => {
  const res = await onRequest({
    request: new Request('https://appsem-store-admin.pages.dev/api/upload-apk', {
      method: 'POST', headers: { Origin: 'https://evil.example' }, body: 'x'
    }),
    env: {}
  });
  assert.equal(res.status, 403);
});
