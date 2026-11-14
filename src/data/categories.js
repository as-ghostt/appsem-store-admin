export const CATEGORIES = [
  { key: 'educacion', label: 'Educación' },
  { key: 'herramientas', label: 'Herramientas' },
  { key: 'libros-referencias', label: 'Libros y referencias' },
  { key: 'productividad', label: 'Productividad' },
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'salud-bienestar', label: 'Salud y bienestar' },
  { key: 'personalizacion', label: 'Personalización' },
  { key: 'musica-audio', label: 'Música y audio' },
  { key: 'noticias', label: 'Noticias' },
  { key: 'entretenimiento', label: 'Entretenimiento' },
  { key: 'juegos', label: 'Juegos' },
  { key: 'otros', label: 'Otros' },
];

export function getCategoryLabel(categoryKey) {
  if (['cristianas', 'christian', 'bible'].includes(categoryKey)) {
    return 'Libros y referencias';
  }

  return CATEGORIES.find((category) => category.key === categoryKey)?.label || 'Otros';
}
