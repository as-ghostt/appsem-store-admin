export function isValidCatalogSlug(value) {
  return typeof value === 'string' && value.length <= 80 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
