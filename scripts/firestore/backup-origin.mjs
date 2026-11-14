/** Únicamente el repositorio oficial migrado de Appsem Admin. */
export function isAllowedBackupOrigin(url) {
  if (typeof url !== 'string') return false;
  return /^(?:https:\/\/github\.com\/|git@github\.com:)as-ghostt\/appsem-store-admin(?:\.git)?$/.test(url.trim());
}
