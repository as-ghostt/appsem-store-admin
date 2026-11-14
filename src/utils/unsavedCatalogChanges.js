/** Compara exclusivamente los campos visibles/editables del formulario. */
export function hasUnsavedCatalogChanges(current, saved) {
  if (!current || !saved) return false;
  const keys = new Set([...Object.keys(current), ...Object.keys(saved)]);
  for (const key of keys) {
    if (current[key] !== saved[key]) return true;
  }
  return false;
}

export function shouldBlockCatalogNavigation({ dirty, busy, currentUrl, nextUrl }) {
  return Boolean(dirty || busy) && currentUrl !== nextUrl;
}
