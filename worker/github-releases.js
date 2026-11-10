// Cloudflare Worker: subida directa de APK a GitHub Releases.
// Secrets: GITHUB_TOKEN. Vars: GITHUB_REPOSITORY, ADMIN_ORIGIN, FIREBASE_PROJECT_ID, ADMIN_EMAIL.
// El token de GitHub nunca se envía al navegador.
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers }
});
function cors(origin) {
  return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'Authorization, Content-Type, X-APK-Name, X-APK-Slug, X-APK-Version',
    'vary': 'Origin', 'cache-control': 'no-store' };
}
function decodeBase64Url(part) {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64 + '='.repeat((4 - base64.length % 4) % 4)));
}
async function verifyFirebaseToken(token, env) {
  const parts = token.split('.');
  if (parts.length !== 3) throw Error('Token inválido.');
  const header = decodeBase64Url(parts[0]);
  const claims = decodeBase64Url(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'RS256' || !header.kid || claims.aud !== env.FIREBASE_PROJECT_ID ||
      claims.iss !== 'https://securetoken.google.com/' + env.FIREBASE_PROJECT_ID ||
      !claims.sub || claims.exp <= now || claims.iat > now || claims.auth_time > now ||
      claims.email !== env.ADMIN_EMAIL || claims.email_verified !== true) {
    throw Error('Administrador no autorizado.');
  }
  const response = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  if (!response.ok) throw Error('No se pudo verificar Firebase.');
  const jwks = await response.json();
  const jwk = jwks.keys.find(key => key.kid === header.kid);
  if (!jwk) throw Error('Firma Firebase desconocida.');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const bytes = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - parts[2].length % 4) % 4)), c => c.charCodeAt(0));
  const signed = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes, signed)) throw Error('Firma Firebase inválida.');
}
async function github(url, token, init = {}) {
  return fetch(url, { ...init, headers: {
    'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28', ...init.headers
  } });
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (!origin || origin !== env.ADMIN_ORIGIN) return json({ error: 'Origen no permitido.' }, 403);
    const headers = cors(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405, headers);
    if (!env.GITHUB_TOKEN || !/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || '') ||
        !env.FIREBASE_PROJECT_ID || !env.ADMIN_EMAIL) {
      return json({ error: 'Servidor de carga no configurado.' }, 503, headers);
    }
    const bearer = request.headers.get('Authorization') || '';
    if (!bearer.startsWith('Bearer ')) return json({ error: 'Inicio de sesión requerido.' }, 401, headers);
    try {
      await verifyFirebaseToken(bearer.slice(7), env);
    } catch (_) { return json({ error: 'Sesión no autorizada.' }, 403, headers); }
    const name = request.headers.get('X-APK-Name') || '';
    const slug = request.headers.get('X-APK-Slug') || '';
    const version = request.headers.get('X-APK-Version') || '';
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,110}\.apk$/i.test(name) ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,50}$/.test(version) ||
        request.headers.get('content-type') !== 'application/vnd.android.package-archive') {
      return json({ error: 'Nombre, versión o formato APK inválido.' }, 400, headers);
    }
    const length = Number(request.headers.get('content-length'));
    // Cloudflare Free limita el tamaño del cuerpo de solicitud; mantener margen respecto a 100 MB.
    if (!Number.isFinite(length) || length <= 0 || length > 95_000_000) {
      return json({ error: 'El APK debe ocupar entre 1 byte y 95 MB.' }, 413, headers);
    }
    const repo = env.GITHUB_REPOSITORY;
    const tag = 'apk/' + slug + '/v' + version;
    const base = 'https://api.github.com/repos/' + repo;
    const lookup = await github(base + '/releases/tags/' + encodeURIComponent(tag), env.GITHUB_TOKEN);
    let release;
    if (lookup.status === 404) {
      const created = await github(base + '/releases', env.GITHUB_TOKEN, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_name: tag, target_commitish: 'main', name: slug + ' ' + version,
          body: 'Distribución APK de Appsem Store.', draft: false, prerelease: false })
      });
      if (!created.ok) return json({ error: 'No se pudo crear la versión en GitHub.' }, 502, headers);
      release = await created.json();
    } else if (lookup.ok) release = await lookup.json();
    else return json({ error: 'No se pudo consultar la versión en GitHub.' }, 502, headers);
    if (release.assets?.some(a => a.name === name)) {
      return json({ error: 'Esta versión ya tiene un APK con ese nombre. Usa una versión nueva.' }, 409, headers);
    }
    const uploadUrl = 'https://uploads.github.com/repos/' + repo + '/releases/' + release.id +
      '/assets?name=' + encodeURIComponent(name);
    const upload = await github(uploadUrl, env.GITHUB_TOKEN, {
      method: 'POST', headers: { 'Content-Type': 'application/vnd.android.package-archive' },
      body: request.body
    });
    if (!upload.ok) return json({ error: 'GitHub rechazó la carga del APK.' }, 502, headers);
    const asset = await upload.json();
    if (!asset.browser_download_url || asset.state !== 'uploaded') {
      return json({ error: 'La carga no se confirmó en GitHub.' }, 502, headers);
    }
    return json({ apkUrl: asset.browser_download_url, size: asset.size, releaseUrl: release.html_url }, 200, headers);
  }
};
