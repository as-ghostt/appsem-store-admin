import test from 'node:test';
import assert from 'node:assert/strict';
import { handleChunkedUpload } from '../../worker/github-chunked.js';

const repo = 'as-ghostt/appsem-store';
const origin = 'https://appsem-store-admin.pages.dev';
const marker = 'APPSEM_CHUNKED_V1\n';
const chunkSize = 20 * 1024 * 1024;
function createGateway() {
  let release;
  let assets = [];
  let dispatchCount = 0;
  const github = async (url, token, init = {}) => {
    assert.equal(token, 'fake-gh-token');
    const method = init.method || 'GET';
    if (url.endsWith('/releases/tags/apk-demo-v1.0.0') && method === 'GET') {
      return release ? Response.json(release) : Response.json({}, { status: 404 });
    }
    if (url.endsWith('/releases') && method === 'POST') {
      const body = JSON.parse(init.body);
      assert.equal(body.draft, true);
      release = { id: 7, tag_name: body.tag_name, body: body.body, draft: true,
        html_url: 'https://github.com/' + repo + '/releases/tag/' + body.tag_name };
      return Response.json(release, { status: 201 });
    }
    if (url.endsWith('/releases/7') && method === 'GET') {
      return Response.json(release);
    }
    if (url.endsWith('/releases/7/assets?per_page=100') && method === 'GET') {
      return Response.json(assets);
    }
    if (url.includes('uploads.github.com/repos/' + repo + '/releases/7/assets?name=') && method === 'POST') {
      const name = decodeURIComponent(url.split('?name=')[1]);
      const bytes = init.body.byteLength;
      assert.equal(init.headers['Content-Length'], String(bytes));
      const asset = { id: assets.length + 20, name, size: bytes, state: 'uploaded' };
      assets.push(asset);
      return Response.json(asset, { status: 201 });
    }
    if (url.endsWith('/dispatches') && method === 'POST') {
      const body = JSON.parse(init.body);
      assert.equal(body.event_type, 'appsem_apk_assemble');
      assert.equal(body.client_payload.release_id, 7);
      dispatchCount++;
      return new Response(null, { status: 204 });
    }
    throw Error('GitHub endpoint inesperado: ' + method + ' ' + url);
  };
  const helpers = {
    github, json: (data, status = 200) => Response.json(data, { status }), headers: {}
  };
  async function run(op, data, headers = {}, body) {
    const request = new Request(origin + '/api/upload-apk', {
      method: 'POST',
      headers: {
        'X-APK-Operation': op,
        'Content-Type': body ? 'application/octet-stream' : 'application/json',
        ...headers
      },
      body: body || JSON.stringify(data)
    });
    const response = await handleChunkedUpload(request, {
      GITHUB_TOKEN: 'fake-gh-token', GITHUB_REPOSITORY: repo
    }, helpers);
    return { status: response.status, payload: await response.json() };
  }
  return {
    run,
    publish(name, size) {
      release.draft = false;
      release.body = 'Distribución APK oficial de Appsem Store.';
      assets = [{ id: 100, name, size, state: 'uploaded',
        browser_download_url: 'https://github.com/' + repo + '/releases/download/apk-demo-v1.0.0/' + name }];
    },
    get dispatchCount() { return dispatchCount; },
    get release() { return release; },
    get assets() { return assets; }
  };
}

test('APK de 255 MB inicia subida privada por 13 partes de 20 MiB', async () => {
  const env = createGateway();
  const size = 255_000_000;
  const parts = Math.ceil(size / chunkSize);
  const result = await env.run('start', {
    slug: 'demo', version: '1.0.0', name: 'demo.apk', size, parts
  });
  assert.equal(result.status, 200);
  assert.equal(result.payload.uploadId, 7);
  assert.equal(result.payload.chunkSize, chunkSize);
  assert.deepEqual(result.payload.uploadedParts, []);
  assert.equal(env.release.draft, true);
  assert.equal(JSON.parse(env.release.body.slice(marker.length)).size, size);
  assert.equal(parts, 13);
  assert.equal(env.assets.length, 0);
});

test('Subida: parte binaria -> despacho de ensamblaje -> URL pública confirmada', async () => {
  const env = createGateway();
  const data = { slug: 'demo', version: '1.0.0', name: 'demo.apk', size: 5, parts: 1 };
  const start = await env.run('start', data);
  assert.equal(start.status, 200);
  const id = start.payload.uploadId;
  const missing = await env.run('complete', { uploadId: id });
  assert.equal(missing.status, 409);
  assert.equal(env.dispatchCount, 0);
  const uploaded = await env.run('part', null, {
    'X-APK-Upload-Id': String(id), 'X-APK-Part-Index': '0'
  }, Uint8Array.from([80, 75, 3, 4, 0]));
  assert.equal(uploaded.status, 200, JSON.stringify(uploaded.payload));
  assert.equal(uploaded.payload.uploaded, true);
  const repeated = await env.run('part', null, {
    'X-APK-Upload-Id': String(id), 'X-APK-Part-Index': '0'
  }, Uint8Array.from([80, 75, 3, 4, 0]));
  assert.equal(repeated.status, 200);
  assert.equal(repeated.payload.alreadyUploaded, true);
  assert.equal(env.assets.length, 1);
  const completed = await env.run('complete', { uploadId: id });
  assert.equal(completed.status, 202);
  assert.equal(completed.payload.processing, true);
  assert.equal(env.dispatchCount, 1);
  const waiting = await env.run('status', { uploadId: id });
  assert.equal(waiting.status, 202);
  assert.equal(waiting.payload.processing, true);
  env.publish('demo.apk', 5);
  const done = await env.run('status', { uploadId: id });
  assert.equal(done.status, 200);
  assert.equal(done.payload.ready, true);
  assert.match(done.payload.apkUrl, /releases\/download\/apk-demo-v1\.0\.0\/demo\.apk/);
});

test('No acepta tamaños o nombres inválidos para nuevas subidas', async () => {
  const env = createGateway();
  const invalid = await env.run('start', {
    slug: 'demo', version: '1.0.0', name: '../demo.apk',
    size: 256_000_000, parts: 1
  });
  assert.equal(invalid.status, 400);
  const tooBig = await env.run('start', {
    slug: 'demo', version: '1.0.0', name: 'demo.apk',
    size: 2_000_000_000, parts: 96
  });
  assert.equal(tooBig.status, 400);
});
