export function isOfficialPlayStoreUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      url.hostname === 'play.google.com' && url.pathname === '/store/apps/details' &&
      /^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(url.searchParams.get('id') || '');
  } catch { return false; }
}
export function isGithubReleasesApkUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      url.hostname === 'github.com' &&
      /^\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/releases\/download\/[^/]+\/[^/]+\.apk$/i.test(url.pathname);
  } catch { return false; }
}
