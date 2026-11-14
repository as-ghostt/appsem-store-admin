import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedBackupOrigin } from '../../scripts/firestore/backup-origin.mjs';

test('Backup cifrado acepta exclusivamente el repositorio migrado de Appsem Admin', () => {
  for (const url of [
    'https://github.com/as-ghostt/appsem-store-admin',
    'https://github.com/as-ghostt/appsem-store-admin.git',
    'git@github.com:as-ghostt/appsem-store-admin',
    'git@github.com:as-ghostt/appsem-store-admin.git'
  ]) assert.equal(isAllowedBackupOrigin(url), true, url);
});
test('No permite subir copias al repositorio antiguo, falsificado o a otra organización', () => {
  for (const url of [
    'https://github.com/eler30mr-star/appsem-store-admin',
    'https://github.com/as-ghostt/appsem-store',
    'https://github.com/as-ghostt/appsem-store-admin.evil',
    'https://github.com.evil/as-ghostt/appsem-store-admin',
    'git@github.com:another-user/appsem-store-admin',
    '', null
  ]) assert.equal(isAllowedBackupOrigin(url), false, String(url));
});
