import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL('../../' + file, import.meta.url), 'utf8');

test('Cerrar sesión sigue accesible en móviles aunque desaparezca el pie lateral', () => {
  const layout = read('src/components/AdminLayout.jsx');
  const styles = read('src/styles.css');
  assert.match(styles, /@media \(max-width: 1100px\)[\s\S]*?\.sidebar-footer\s*\{\s*display:\s*none/);
  assert.match(styles, /@media \(max-width: 1100px\)\s*\{[\s\S]*?\.mobile-signout\s*\{\s*display:\s*inline-flex/);
  assert.match(layout, /className="ghost-button mobile-signout"[^>]*onClick=\{handleLogout\}/);
});

test('Navegación accesible por teclado y áreas táctiles de 44 px', () => {
  const layout = read('src/components/AdminLayout.jsx');
  const styles = read('src/styles.css');
  assert.match(layout, /href="#admin-main"/);
  assert.match(layout, /id="admin-main" tabIndex=\{-1\}/);
  assert.match(layout, /aria-label="Secciones del panel"/);
  assert.match(styles, /\.skip-link:focus\s*\{\s*top:\s*12px;/);
  assert.match(styles, /\.nav-link:focus-visible/);
  assert.match(styles, /\.icon-button:focus-visible/);
  assert.match(styles, /\.icon-button\s*\{\s*min-width:\s*44px;\s*min-height:\s*44px/);
});

test('Acciones de catálogo y filtros identificables sin depender del icono', () => {
  const apps = read('src/pages/AppsPage.jsx');
  const comments = read('src/pages/CommentsPage.jsx');
  assert.match(apps, /aria-label=.*Editar/);
  assert.match(apps, /aria-label=.*Archivar/);
  assert.match(apps, /aria-label=.*Restaurar/);
  assert.match(apps, /aria-label="Filtrar aplicaciones por estado"/);
  assert.match(apps, /aria-label="Buscar aplicaciones"/);
  assert.match(comments, /aria-label="Filtrar comentarios por estado"/);
  assert.match(comments, /aria-label="Buscar comentarios"/);
});

test('Los clics no se presentan como exclusivos de Google Play', () => {
  const dashboard = read('src/pages/DashboardPage.jsx');
  assert.match(dashboard, /note="Clics de descarga"/);
  assert.doesNotMatch(dashboard, /Clics hacia Google Play/);
});
