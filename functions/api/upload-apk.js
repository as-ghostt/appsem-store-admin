/** Cloudflare Pages API: same-origin bridge for protected GitHub Releases uploads.
 * GITHUB_TOKEN must be supplied as an encrypted Pages secret, never as VITE_*.
 */
import githubReleasesWorker from '../../worker/github-releases.js';

export async function onRequest({ request, env }) {
  return githubReleasesWorker.fetch(request, {
    ...env,
    ADMIN_ORIGIN: new URL(request.url).origin
  });
}
