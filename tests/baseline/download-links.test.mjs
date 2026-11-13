import test from 'node:test';
import assert from 'node:assert/strict';
import { isOfficialPlayStoreUrl, isGithubReleasesApkUrl } from '../../src/utils/downloadLinks.js';

test('Google Play solo admite fichas reales de play.google.com', () => {
  assert.equal(isOfficialPlayStoreUrl('https://play.google.com/store/apps/details?id=com.appsmarttechnology.bibliauniversal&pcampaignid=web_share'), true);
  assert.equal(isOfficialPlayStoreUrl('https://appsem-store-admin.pages.dev/apps/new'), false);
  assert.equal(isOfficialPlayStoreUrl('https://appsem-store-public.vercel.app/apps/Biblia-Universal/Politicas-de-privacidad/'), false);
  assert.equal(isOfficialPlayStoreUrl('https://play.google.com.evil.example/store/apps/details?id=com.demo.app'), false);
});
test('Solo enlaces directos APK de GitHub Releases', () => {
  assert.equal(isGithubReleasesApkUrl('https://github.com/as-ghostt/appsem-store/releases/download/apk-botshow-v1.0.0/botshow.apk'), true);
  assert.equal(isGithubReleasesApkUrl('https://github.com/as-ghostt/appsem-store/releases'), false);
  assert.equal(isGithubReleasesApkUrl('https://appsem-store-admin.pages.dev/apps/new'), false);
});
