/** Solo URLs HTTPS externas; no son obligatorias salvo el icono. */
export function isPublicHttpsUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        !host.includes('.') || host.startsWith('.') || host.endsWith('.') ||
        host === 'localhost' || host.endsWith('.localhost') ||
        host.endsWith('.local') || host.endsWith('.internal') ||
        host.includes(':') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return false;
    return true;
  } catch { return false; }
}
