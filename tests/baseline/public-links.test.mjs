import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicHttpsUrl } from '../../src/utils/publicLinks.js';

test('Permite HTTPS externo para iconos, capturas y enlaces legales', () => {
  for (const link of [
    'https://raw.githubusercontent.com/as-ghostt/assets/main/icon.png',
    'https://github.com/as-ghostt/appsem-store',
    'https://www.example.com/app/privacidad?language=es',
    'https://images.example.org/screenshot.webp'
  ]) assert.equal(isPublicHttpsUrl(link), true, link);
});
test('Bloquea enlaces inseguros, privados y credenciales embebidas', () => {
  for (const link of [
    '', null, 'https://...', 'javascript:alert(1)', 'data:image/svg+xml,',
    'http://example.com', '//example.com', '/app/botshow',
    'https://127.0.0.1/icon.png', 'https://192.168.1.10/icon.png',
    'https://localhost/icon.png', 'https://dev.local/icon.png',
    'https://user:password@example.com/icon.png',
    'https://example.com:8443/icon.png',
    'https://example.com/icon.png '
  ]) assert.equal(isPublicHttpsUrl(link), false, String(link));
});
