import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, getCategoryLabel } from '../../src/data/categories.js';

const expected = [
  'Arte y diseño', 'Automóviles y vehículos', 'Belleza',
  'Bibliotecas y demostración', 'Comida y bebida', 'Compras',
  'Comunicación', 'Conocer personas', 'Cómics', 'Deportes',
  'Editores y reproductores de video', 'Educación', 'Entretenimiento',
  'Estilo de vida', 'Eventos', 'Finanzas', 'Fotografía', 'Herramientas',
  'Libros y referencias', 'Mapas y navegación', 'Medicina',
  'Música y audio', 'Negocios', 'Noticias y revistas',
  'Personalización', 'Productividad', 'Salud y deportes', 'Ser padres',
  'Social', 'Tiempo', 'Viajes y lugares', 'Vivienda y hogar'
];

test('Panel Admin incluye las 32 categorías exactas de Google Play en el orden recibido', () => {
  assert.deepEqual(CATEGORIES.map(category => category.label), expected);
  assert.equal(new Set(CATEGORIES.map(category => category.key)).size, expected.length);
  for (const category of CATEGORIES) {
    assert.equal(getCategoryLabel(category.key), category.label);
  }
});

test('Edición no convierte categorías históricas desconocidas en otras de forma silenciosa', () => {
  assert.equal(getCategoryLabel('noticias'), 'Noticias');
  assert.equal(getCategoryLabel('salud-bienestar'), 'Salud y bienestar');
  assert.equal(getCategoryLabel('juegos'), 'Juegos');
  assert.equal(getCategoryLabel('otros'), 'Otros');
  assert.equal(getCategoryLabel('bible'), 'Libros y referencias');
});
