// Protected, chunked uploads for APKs above Cloudflare's request-size limit.
// Chunks remain private assets of a DRAFT GitHub Release until the workflow
// assembles, verifies, and publishes the single finished APK.
const CHUNK_BYTES = 20 * 1024 * 1024;
const MAX_APK_BYTES = 1_900_000_000;
const MARKER = 'APPSEM_CHUNKED_V1\n';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION = /^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,50}$/;
const APK_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,110}\.apk$/i;
const LIMIT_PARTS = Math.ceil(MAX_APK_BYTES / CHUNK_BYTES);
function fail(status, message) { const err = new Error(message); err.status = status; throw err; }
function partName(index) { return 'appsem-part-' + String(index).padStart(3, '0') + '.bin'; }
function expectedPartSize(meta, index) {
  return index === meta.parts - 1 ? meta.size - CHUNK_BYTES * index : CHUNK_BYTES;
}
function parseMetadata(release) {
  const body = String(release?.body || '');
  if (!body.startsWith(MARKER)) return null;
  try {
    const data = JSON.parse(body.slice(MARKER.length));
    if (!data || data.appsemUpload !== 1 ||
      !SLUG.test(data.slug) || !VERSION.test(data.version) ||
      !APK_NAME.test(data.name) ||
      !Number.isSafeInteger(data.size) || data.size < 1 || data.size > MAX_APK_BYTES ||
      !Number.isInteger(data.parts) || data.parts < 1 || data.parts > LIMIT_PARTS ||
      data.parts !== Math.ceil(data.size / CHUNK_BYTES) ||
      release.tag_name !== 'apk-' + data.slug + '-v' + data.version) return null;
    return data;
  } catch { return null; }
}
async function readJson(request) {
  if (Number(request.headers.get('content-length') || 0) > 4096) fail(413, 'Solicitud demasiado grande.');
  try { return await request.json(); } catch { fail(400, 'Datos de subida inválidos.'); }
}
async function asJson(response) {
  try { return await response.json(); } catch { return {}; }
}
async function githubJson(github, path, token, options = {}) {
  const res = await github(path, token, options);
  const payload = await asJson(res);
  if (!res.ok) fail(res.status === 403 ? 503 : 502, 'GitHub respondió HTTP ' + res.status + '. Comprueba el acceso a Releases.');
  return payload;
}
async function getRelease(github, repo, token, id) {
  const release = await githubJson(github, 'https://api.github.com/repos/' + repo + '/releases/' + id, token);
  if (release.id !== id) fail(409, 'La sesión de subida no coincide con la versión.');
  return release;
}
async function getAssets(github, repo, token, id) {
  const result = await githubJson(github,
    'https://api.github.com/repos/' + repo + '/releases/' + id + '/assets?per_page=100', token);
  if (!Array.isArray(result)) fail(502, 'GitHub no devolvió la lista de archivos.');
  return result;
}
async function requireDraft(github, repo, token, id) {
  const release = await getRelease(github, repo, token, id);
  const meta = parseMetadata(release);
  if (!meta) fail(409, 'Versión de APK incompatible con la sesión de subida.');
  return { release, meta };
}
function getReleaseId(value) {
  if (!Number.isSafeInteger(Number(value)) || Number(value) < 1 ||
      !/^\d{1,16}$/.test(String(value))) fail(400, 'Identificador de subida inválido.');
  return Number(value);
}
function checkCreateData(data) {
  const { slug, version, name, size, parts } = data || {};
  if (!SLUG.test(slug || '') || !VERSION.test(version || '') ||
      !APK_NAME.test(name || '') || !Number.isSafeInteger(size) || size <= 0 ||
      size > MAX_APK_BYTES || !Number.isInteger(parts) || parts < 1 ||
      parts > LIMIT_PARTS || parts !== Math.ceil(size / CHUNK_BYTES)) {
    fail(400, 'Nombre, versión o tamaño del APK inválidos (máximo 1,9 GB).');
  }
  return { appsemUpload: 1, slug, version, name, size, parts };
}
async function startUpload(github, repo, token, data) {
  const meta = checkCreateData(data);
  const tag = 'apk-' + meta.slug + '-v' + meta.version;
  const base = 'https://api.github.com/repos/' + repo;
  const lookup = await github(base + '/releases/tags/' + encodeURIComponent(tag), token);
  let release;
  if (lookup.status === 404) {
    release = await githubJson(github, base + '/releases', token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_name: tag, target_commitish: 'main', name: meta.slug + ' ' + meta.version,
        body: MARKER + JSON.stringify(meta), draft: true, prerelease: false
      })
    });
  } else if (lookup.ok) {
    release = await asJson(lookup);
  } else fail(502, 'GitHub no permitió consultar la versión (HTTP ' + lookup.status + ').');
  if (!release?.id) fail(502, 'GitHub no confirmó la versión.');
  if (!release.draft) {
    const existing = (await getAssets(github, repo, token, release.id)).find(a => a.name === meta.name &&
      a.state === 'uploaded' && a.size === meta.size);
    if (existing) return { ready: true, apkUrl: existing.browser_download_url, size: existing.size };
    fail(409, 'Esta versión ya está publicada. Indica una versión nueva.');
  }
  const prior = parseMetadata(release);
  if (!prior || JSON.stringify(prior) !== JSON.stringify(meta)) {
    fail(409, 'Ya existe una subida distinta para esa versión. Usa una versión nueva.');
  }
  const assets = await getAssets(github, repo, token, release.id);
  const uploadedParts = [];
  for (let index = 0; index < meta.parts; index++) {
    const asset = assets.find(a => a.name === partName(index));
    if (asset && asset.state === 'uploaded' && asset.size === expectedPartSize(meta, index)) {
      uploadedParts.push(index);
    } else if (asset) fail(409, 'La parte ' + (index + 1) + ' ya existe con tamaño incorrecto.');
  }
  return { uploadId: release.id, chunkSize: CHUNK_BYTES, uploadedParts };
}
async function uploadPart(github, repo, token, request) {
  const releaseId = getReleaseId(request.headers.get('X-APK-Upload-Id'));
  const indexText = request.headers.get('X-APK-Part-Index') || '';
  if (!/^\d{1,3}$/.test(indexText)) fail(400, 'Número de parte inválido.');
  const index = Number(indexText);
  const { release, meta } = await requireDraft(github, repo, token, releaseId);
  if (!release.draft) fail(409, 'La versión ya está publicada.');
  if (index < 0 || index >= meta.parts) fail(400, 'Parte fuera del rango permitido.');
  if (request.headers.get('content-type') !== 'application/octet-stream') fail(415, 'Formato de parte inválido.');
  const required = expectedPartSize(meta, index);
  const declared = request.headers.get('content-length');
  if (declared && Number(declared) !== required) fail(400, 'Tamaño de parte incorrecto.');
  const assets = await getAssets(github, repo, token, releaseId);
  const name = partName(index);
  const existing = assets.find(a => a.name === name);
  if (existing) {
    if (existing.size !== required || existing.state !== 'uploaded') fail(409, 'Parte previa dañada. Usa otra versión.');
    return { uploaded: true, alreadyUploaded: true, index };
  }
  // Buffer only one 20 MiB part. Never buffer the full APK in a Worker.
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength !== required) fail(400, 'La parte recibida está incompleta.');
  const url = 'https://uploads.github.com/repos/' + repo + '/releases/' + releaseId +
    '/assets?name=' + encodeURIComponent(name);
  const response = await github(url, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(bytes.byteLength) },
    body: bytes
  });
  const asset = await asJson(response);
  if (!response.ok) fail(502, 'GitHub rechazó la parte ' + (index + 1) + ' (HTTP ' + response.status + ').');
  if (asset.name !== name || asset.state !== 'uploaded' || asset.size !== required) {
    fail(502, 'GitHub no confirmó la parte ' + (index + 1) + '.');
  }
  return { uploaded: true, alreadyUploaded: false, index };
}
async function completeUpload(github, repo, token, data) {
  const id = getReleaseId(data?.uploadId);
  const { release, meta } = await requireDraft(github, repo, token, id);
  const assets = await getAssets(github, repo, token, id);
  const finalAsset = assets.find(a => a.name === meta.name && a.state === 'uploaded' && a.size === meta.size);
  if (!release.draft && finalAsset) return { ready: true, apkUrl: finalAsset.browser_download_url };
  if (!release.draft) fail(409, 'La versión ya se publicó sin el APK esperado.');
  for (let i = 0; i < meta.parts; i++) {
    const asset = assets.find(a => a.name === partName(i));
    if (!asset || asset.state !== 'uploaded' || asset.size !== expectedPartSize(meta, i)) {
      fail(409, 'Falta completar la parte ' + (i + 1) + ' de ' + meta.parts + '.');
    }
  }
  const response = await github('https://api.github.com/repos/' + repo + '/dispatches', token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: 'appsem_apk_assemble', client_payload: { release_id: id } })
  });
  if (response.status !== 204) {
    fail(502, 'GitHub Actions no aceptó el ensamblado del APK (HTTP ' + response.status + ').');
  }
  return { processing: true, uploadId: id };
}
async function uploadStatus(github, repo, token, data) {
  const id = getReleaseId(data?.uploadId);
  const { release, meta } = await requireDraft(github, repo, token, id);
  const assets = await getAssets(github, repo, token, id);
  const final = assets.find(a => a.name === meta.name && a.state === 'uploaded' && a.size === meta.size);
  if (final && !release.draft) {
    return { ready: true, apkUrl: final.browser_download_url, releaseUrl: release.html_url, size: meta.size };
  }
  if (!release.draft) fail(409, 'GitHub publicó la versión sin el APK completo.');
  if (String(release.body).includes('\nAPPSEM_ASSEMBLY_FAILED')) {
    fail(502, 'GitHub no pudo ensamblar el APK. Puedes reintentar la subida.');
  }
  return { processing: true, uploadedParts: assets.filter(a => a.name.startsWith('appsem-part-')).length };
}
export async function handleChunkedUpload(request, env, helpers) {
  const { github, json, headers } = helpers;
  const op = request.headers.get('X-APK-Operation');
  const repo = env.GITHUB_REPOSITORY;
  const token = env.GITHUB_TOKEN;
  try {
    let result;
    if (op === 'start') result = await startUpload(github, repo, token, await readJson(request));
    else if (op === 'part') result = await uploadPart(github, repo, token, request);
    else if (op === 'complete') result = await completeUpload(github, repo, token, await readJson(request));
    else if (op === 'status') result = await uploadStatus(github, repo, token, await readJson(request));
    else fail(400, 'Operación de subida desconocida.');
    return json(result, result.processing ? 202 : 200, headers);
  } catch (error) {
    return json({ error: error?.message || 'No se pudo completar la subida.' }, error.status || 502, headers);
  }
}
