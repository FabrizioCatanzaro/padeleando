// Espejo de lib/clubProfile.js de la API: mismas claves y mismo orden
export const AMENITIES = [
  { key: 'estacionamiento',  label: 'Estacionamiento' },
  { key: 'bano_adaptado',    label: 'Baño adaptado' },
  { key: 'duchas',           label: 'Duchas' },
  { key: 'vestuarios',       label: 'Vestuarios' },
  { key: 'lockers',          label: 'Lockers' },
  { key: 'wifi',             label: 'Wi-Fi' },
  { key: 'buffet',           label: 'Buffet' },
  { key: 'tienda',           label: 'Tienda' },
  { key: 'alquiler_paletas', label: 'Alquiler de paletas' },
  { key: 'clases',           label: 'Clases' },
  { key: 'grabacion',        label: 'Grabación de partidos' },
  { key: 'parrilla',         label: 'Parrilla' },
  { key: 'pileta',           label: 'Pileta' },
  { key: 'gimnasio',         label: 'Gimnasio' },
  { key: 'seguridad',        label: 'Seguridad' },
  { key: 'espacio_chicos',   label: 'Espacio para chicos' },
]

export function clubAmenities(club) {
  const keys = new Set(club?.amenities ?? [])
  return AMENITIES.filter((a) => keys.has(a.key))
}

export const FLOOR_OPTIONS = [
  { value: 'cesped_sintetico', label: 'Césped sintético' },
  { value: 'cesped_natural',   label: 'Césped natural' },
  { value: 'cemento',          label: 'Cemento' },
]
export const WALL_OPTIONS = [
  { value: 'cristal_panoramico', label: 'Cristal panorámico' },
  { value: 'cristal',            label: 'Cristal' },
  { value: 'cemento',            label: 'Cemento' },
]
const FLOOR_LABEL = Object.fromEntries(FLOOR_OPTIONS.map((o) => [o.value, o.label]))
const WALL_LABEL = { cemento: 'Paredes de cemento', cristal: 'Cristal', cristal_panoramico: 'Cristal panorámico' }

export const COURT_COLORS = [
  { label: 'Azul',      hex: '#1f5fa8' },
  { label: 'Celeste',   hex: '#3d8fc4' },
  { label: 'Verde',     hex: '#2f6b3a' },
  { label: 'Terracota', hex: '#b5552f' },
  { label: 'Violeta',   hex: '#5b3f8c' },
  { label: 'Gris',      hex: '#5a5a5a' },
]
const DEFAULT_FLOOR_COLOR = { cesped_sintetico: '#1f5fa8', cesped_natural: '#2f6b3a', cemento: '#5a5a5a' }

// Sin color cargado, uno según el tipo de piso
export function courtFloorColor(court) {
  return court?.floor_color || DEFAULT_FLOOR_COLOR[court?.floor_type] || 'var(--color-border-strong)'
}

export function courtColorName(hex) {
  return COURT_COLORS.find((c) => c.hex === String(hex ?? '').toLowerCase())?.label ?? null
}

// Cristal: borde celeste en el dibujo de la cancha; cemento: gris
export function courtWallColor(court) {
  return court?.wall_type === 'cemento' ? 'var(--color-dim)' : 'var(--color-court-glass)'
}

// "Cristal panorámico · Césped sintético azul · Techada"
export function courtSummary(c) {
  const color = c.floor_color ? courtColorName(c.floor_color)?.toLowerCase() : null
  const floor = c.floor_type ? [FLOOR_LABEL[c.floor_type], color].filter(Boolean).join(' ') : null
  return [
    c.wall_type ? WALL_LABEL[c.wall_type] : null,
    floor,
    c.covered ? 'Techada' : null,
    c.lit ? 'Con iluminación' : null,
    c.external_play ? 'Juego exterior' : null,
  ].filter(Boolean)
}
