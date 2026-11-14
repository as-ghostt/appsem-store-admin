import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApkReleaseInfo } from '../../src/utils/apkReleaseInfo.js';

const apk = { name: 'BotShow-release.apk', size: 255_000_000, lastModified: 1794672391986 };

test('Sube APK usando slug y versión comercial ya introducidos', () => {
  assert.deepEqual(resolveApkReleaseInfo(
    { slug: 'botshow', title: 'BotShow', currentVersion: '2.1.0' }, apk
  ), { slug: 'botshow', version: '2.1.0' });
});

test('Recupera el identificador de la ficha guardada al editarla', () => {
  const result = resolveApkReleaseInfo(
    { slug: '', title: 'BotShow', currentVersion: '1.0.0' }, apk,
    { slug: 'botshow' }
  );
  assert.equal(result.slug, 'botshow');
  assert.equal(result.version, '1.0.0');
});

test('La carga de APK no exige versión comercial: usa etiqueta técnica estable', () => {
  const form = { slug: 'botshow', title: 'BotShow', currentVersion: '' };
  const a = resolveApkReleaseInfo(form, apk);
  assert.equal(a.slug, 'botshow');
  assert.equal(a.version, 'archivo-255000000-1794672391986');
  assert.equal(resolveApkReleaseInfo(form, apk).version, a.version);
  assert.equal(form.currentVersion, '');
});

test('Si slug está vacío puede obtenerlo del título o nombre del APK', () => {
  assert.equal(resolveApkReleaseInfo({ slug: '', title: 'Biblia Universal', currentVersion: '' }, apk).slug, 'biblia-universal');
  assert.equal(resolveApkReleaseInfo({ slug: '', title: '', currentVersion: '' }, apk).slug, 'botshow-release');
});

test('Bloquea versiones ilegibles y archivos vacíos con errores específicos', () => {
  assert.throws(() => resolveApkReleaseInfo({ slug: 'botshow', currentVersion: 'versión 1' }, apk), /versión actual contiene/);
  assert.throws(() => resolveApkReleaseInfo({ slug: 'botshow' }, { name: 'botshow.apk', size: 0 }), /archivo APK válido/);
});
