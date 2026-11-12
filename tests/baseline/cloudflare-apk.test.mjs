import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
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

test('Cloudflare APK upload verifies signed Firebase identity and GitHub Release flow', async () => {
  const origin = 'https://appsem-store-admin.pages.dev';
  const repo = 'as-ghostt/appsem-store';
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const content = encode({ alg: 'RS256', kid: 'test-key' }) + '.' + encode({
    aud: 'webs-8b1bf', iss: 'https://securetoken.google.com/webs-8b1bf',
    sub: 'synthetic-admin-user', exp: now + 3600, iat: now, auth_time: now,
    email: 'eler30.mr@gmail.com', email_verified: true
  });
  const jwt = content + '.' + sign('RSA-SHA256', Buffer.from(content), privateKey).toString('base64url');
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    const target = String(url);
    calls.push(target);
    if (target.endsWith('/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')) {
      return Response.json({ keys: [jwk] });
    }
    if (target === 'https://api.github.com/repos/' + repo + '/releases/tags/apk-test-app-v1.0.0') {
      return Response.json({ message: 'Not Found' }, { status: 404 });
    }
    if (target === 'https://api.github.com/repos/' + repo + '/releases') {
      const data = JSON.parse(opts.body);
      assert.equal(opts.method, 'POST');
      assert.equal(data.tag_name, 'apk-test-app-v1.0.0');
      assert.equal(data.draft, false);
      return Response.json({ id: 12, assets: [], html_url: 'https://github.com/' + repo + '/releases/tag/' + data.tag_name }, { status: 201 });
    }
    if (target === 'https://uploads.github.com/repos/' + repo + '/releases/12/assets?name=test-v1.apk') {
      assert.equal(opts.method, 'POST');
      assert.equal(opts.headers['Content-Type'], 'application/vnd.android.package-archive');
      return Response.json({
        name: 'test-v1.apk', state: 'uploaded', size: 4,
        browser_download_url: 'https://github.com/' + repo + '/releases/download/apk-test-app-v1.0.0/test-v1.apk'
      }, { status: 201 });
    }
    throw Error('GitHub/Firebase no esperado: ' + target);
  };
  try {
    const res = await onRequest({
      request: new Request(origin + '/api/upload-apk', {
        method: 'POST',
        headers: {
          Origin: origin, Authorization: 'Bearer ' + jwt,
          'Content-Type': 'application/vnd.android.package-archive',
          'X-APK-Name': 'test-v1.apk',
          'X-APK-Slug': 'test-app',
          'X-APK-Version': '1.0.0'
        },
        body: Uint8Array.from([80, 75, 3, 4])
      }),
      env: { GITHUB_TOKEN: 'synthetic-test-token', GITHUB_REPOSITORY: repo,
        FIREBASE_PROJECT_ID: 'webs-8b1bf', ADMIN_EMAIL: 'eler30.mr@gmail.com' }
    });
    const data = await res.json();
    assert.equal(res.status, 200, JSON.stringify(data));
    assert.equal(data.apkUrl, 'https://github.com/' + repo + '/releases/download/apk-test-app-v1.0.0/test-v1.apk');
    assert.equal(data.size, 4);
    assert.equal(calls.length, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
