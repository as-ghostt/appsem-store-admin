export const CATEGORIES = [
  { key: 'arte-diseno', label: 'Arte y diseño' },
  { key: 'automoviles-vehiculos', label: 'Automóviles y vehículos' },
  { key: 'belleza', label: 'Belleza' },
  { key: 'bibliotecas-demostracion', label: 'Bibliotecas y demostración' },
  { key: 'comida-bebida', label: 'Comida y bebida' },
  { key: 'compras', label: 'Compras' },
  { key: 'comunicacion', label: 'Comunicación' },
  { key: 'conocer-personas', label: 'Conocer personas' },
  { key: 'comics', label: 'Cómics' },
  { key: 'deportes', label: 'Deportes' },
  { key: 'editores-reproductores-video', label: 'Editores y reproductores de video' },
  { key: 'educacion', label: 'Educación' },
  { key: 'entretenimiento', label: 'Entretenimiento' },
  { key: 'estilo-vida', label: 'Estilo de vida' },
  { key: 'eventos', label: 'Eventos' },
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'fotografia', label: 'Fotografía' },
  { key: 'herramientas', label: 'Herramientas' },
  { key: 'libros-referencias', label: 'Libros y referencias' },
  { key: 'mapas-navegacion', label: 'Mapas y navegación' },
  { key: 'medicina', label: 'Medicina' },
  { key: 'musica-audio', label: 'Música y audio' },
  { key: 'negocios', label: 'Negocios' },
  { key: 'noticias-revistas', label: 'Noticias y revistas' },
  { key: 'personalizacion', label: 'Personalización' },
  { key: 'productividad', label: 'Productividad' },
  { key: 'salud-deportes', label: 'Salud y deportes' },
  { key: 'ser-padres', label: 'Ser padres' },
  { key: 'social', label: 'Social' },
  { key: 'tiempo', label: 'Tiempo' },
  { key: 'viajes-lugares', label: 'Viajes y lugares' },
  { key: 'vivienda-hogar', label: 'Vivienda y hogar' },
];

// Categorías heredadas: mantener su etiqueta sin modificar las fichas guardadas.
const LEGACY_LABELS = {
  cristianas: 'Libros y referencias',
  christian: 'Libros y referencias',
  bible: 'Libros y referencias',
  'books-reference': 'Libros y referencias',
  tools: 'Herramientas',
  education: 'Educación',
  entertainment: 'Entretenimiento',
  productivity: 'Productividad',
  lifestyle: 'Estilo de vida',
  games: 'Juegos',
  juegos: 'Juegos',
  other: 'Otros',
  otros: 'Otros',
  noticias: 'Noticias',
  'salud-bienestar': 'Salud y bienestar'
};

export function getCategoryLabel(categoryKey) {
  return CATEGORIES.find((category) => category.key === categoryKey)?.label ||
    LEGACY_LABELS[categoryKey] || 'Otros';
}
