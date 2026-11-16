/**
 * Política común de autorización del panel administrativo.
 * El correo visible por sí solo no concede acceso: también se exige
 * la verificación del usuario y del claim firmado por Firebase Auth.
 */
export function isAuthorizedAdmin(user, claims, adminEmail) {
  return Boolean(
    user &&
    adminEmail &&
    user.email === adminEmail &&
    user.emailVerified === true &&
    claims?.email === adminEmail &&
    claims?.email_verified === true
  );
}
