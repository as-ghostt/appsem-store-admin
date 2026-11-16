import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isAuthorizedAdmin } from '../../src/utils/adminAuthorization.js';

const ADMIN_EMAIL = 'eler30.mr@gmail.com';
const verifiedUser = { email: ADMIN_EMAIL, emailVerified: true };
const verifiedClaims = { email: ADMIN_EMAIL, email_verified: true };

test('autoriza solo al usuario administrador con correo y claim verificados', () => {
  assert.equal(isAuthorizedAdmin(verifiedUser, verifiedClaims, ADMIN_EMAIL), true);
});

test('deniega sesión ausente o identidad incompleta', () => {
  assert.equal(isAuthorizedAdmin(null, verifiedClaims, ADMIN_EMAIL), false);
  assert.equal(isAuthorizedAdmin({}, verifiedClaims, ADMIN_EMAIL), false);
  assert.equal(isAuthorizedAdmin(verifiedUser, null, ADMIN_EMAIL), false);
  assert.equal(isAuthorizedAdmin(verifiedUser, verifiedClaims, ''), false);
});

test('deniega correo ajeno aunque Firebase marque la cuenta como verificada', () => {
  const outsider = { email: 'outsider@example.com', emailVerified: true };
  const claims = { email: 'outsider@example.com', email_verified: true };
  assert.equal(isAuthorizedAdmin(outsider, claims, ADMIN_EMAIL), false);
});

test('deniega cuenta sin emailVerified en el objeto de usuario', () => {
  assert.equal(isAuthorizedAdmin({ email: ADMIN_EMAIL, emailVerified: false }, verifiedClaims, ADMIN_EMAIL), false);
  assert.equal(isAuthorizedAdmin({ email: ADMIN_EMAIL }, verifiedClaims, ADMIN_EMAIL), false);
});

test('deniega claim email_verified falso o ausente aunque el perfil indique verificación', () => {
  assert.equal(isAuthorizedAdmin(verifiedUser, { email: ADMIN_EMAIL, email_verified: false }, ADMIN_EMAIL), false);
  assert.equal(isAuthorizedAdmin(verifiedUser, { email: ADMIN_EMAIL }, ADMIN_EMAIL), false);
});

test('Login y rutas protegidas utilizan la misma política y fuerzan refresco del token', () => {
  const login = readFileSync(new URL('../../src/pages/LoginPage.jsx', import.meta.url), 'utf8');
  const route = readFileSync(new URL('../../src/components/ProtectedRoute.jsx', import.meta.url), 'utf8');
  assert.match(login, /isAuthorizedAdmin\(result\.user, token\.claims, ADMIN_EMAIL\)/);
  assert.match(route, /isAuthorizedAdmin\(user, token\.claims, ADMIN_EMAIL\)/);
  assert.match(login, /getIdTokenResult\(true\)/);
  assert.match(route, /getIdTokenResult\(true\)/);
  assert.match(login, /await signOut\(auth\)/);
  assert.match(route, /await signOut\(auth\)/);
});
