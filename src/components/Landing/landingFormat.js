import { levelLabel } from '../../utils/category'

export const FORMAT_NAME = { liga: 'Liga', americano: 'Americano', copa: 'Copa' }

const DAY = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const DOW = new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'UTC' })
const MON = new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' })

const asDate = (day) => (day ? new Date(`${String(day).slice(0, 10)}T12:00:00Z`) : null)
const clean = (s) => s.replace('.', '')

/** '2026-11-22' → '22 nov' */
export function shortDay(day) {
  const d = asDate(day)
  return d ? clean(DAY.format(d)) : null
}

/** '2026-12-06' → { dow: 'sáb', day: '6', month: 'dic' } */
export function dateBlock(day) {
  const d = asDate(day)
  if (!d) return null
  return { dow: clean(DOW.format(d)), day: String(d.getUTCDate()), month: clean(MON.format(d)) }
}

/** Categoría corta para etiquetas: C7, MIXTO 6, SUMA 11. */
export function levelTag(level) {
  const label = levelLabel(level)
  return label ? label.split(' · ')[0] : null
}

/** Cloudinary con el ancho justo; cualquier otra URL pasa igual. */
export const cld = (src, w) => (src?.includes('/upload/') ? src.replace('/upload/', `/upload/f_auto,q_auto,w_${w},c_limit/`) : src)
