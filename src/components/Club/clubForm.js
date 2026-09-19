// Helpers puros para convertir entre el shape del form y el de la API (clubs).
import { parseScheduleToGrid, emptyGrid, gridToLines } from './scheduleGrid'

const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'website']

// Estado inicial del form a partir de un club/solicitud existente (o vacío).
// El horario vive en dos formas a la vez: `scheduleGrid` (la grilla día ×
// horario, lo que se edita) y `scheduleText` (el textarea de respaldo, para
// el horario que no entra en la grilla). `scheduleMode` arranca en 'grid' si
// se pudo interpretar al menos un día del texto guardado; si no se reconoció
// nada pero había texto, arranca en 'text' para no perder ese dato.
export function clubToForm(club = {}) {
  const social = Array.isArray(club.social_links) ? club.social_links : []
  const get = (platform) => social.find((s) => s.platform === platform)?.url ?? ''
  const schedule = Array.isArray(club.schedule) ? club.schedule : []
  const parsedGrid = parseScheduleToGrid(schedule)
  return {
    name:             club.name ?? '',
    location_name:    club.location_name ?? '',
    contact_phone:    club.contact_phone ?? '',
    contact_whatsapp: club.contact_whatsapp ?? '',
    courts:           club.courts ?? '',
    instagram:        get('instagram'),
    facebook:         get('facebook'),
    website:          get('website'),
    scheduleMode:     parsedGrid ? 'grid' : (schedule.length ? 'text' : 'grid'),
    scheduleGrid:     parsedGrid ?? emptyGrid(),
    scheduleText:     schedule.map((s) => (typeof s === 'string' ? s : s.text ?? '')).filter(Boolean).join('\n'),
    lat:              club.lat ?? null,
    lon:              club.lon ?? null,
    owner_visible:    club.owner_visible ?? false,
  }
}

// Normaliza un WhatsApp a formato de visualización argentino "+54...".
// Saca separadores y ceros iniciales (011 → 11) y antepone +54 si falta.
export function normalizeWhatsappDisplay(raw) {
  if (!raw) return null
  let digits = String(raw).replace(/\D/g, '').replace(/^0+/, '')
  if (!digits) return null
  return digits.startsWith('54') ? `+${digits}` : `+54${digits}`
}

// Link wa.me a partir de cualquier formato: garantiza el prefijo "549".
export function whatsappLink(raw) {
  if (!raw) return ''
  let digits = String(raw).replace(/\D/g, '').replace(/^0+/, '')
  if (!digits) return ''
  if (digits.startsWith('549'))      { /* ya tiene 549 */ }
  else if (digits.startsWith('54'))  digits = `549${digits.slice(2)}`
  else                               digits = `549${digits}`
  return `https://wa.me/${digits}`
}

// URL absoluta de una red social a partir del valor guardado (URL o @handle).
export function socialUrl(s) {
  const url = (s?.url ?? '').trim()
  if (!url) return '#'
  if (url.startsWith('http')) return url
  const handle = url.replace(/^@/, '')
  if (s.platform === 'instagram') return `https://instagram.com/${handle}`
  if (s.platform === 'facebook')  return `https://facebook.com/${handle}`
  return `https://${handle}`
}

// Texto a mostrar para una red social (handle de Instagram o dominio).
export function socialLabel(s) {
  const url = (s?.url ?? '').trim()
  if (s.platform === 'instagram') {
    if (url.startsWith('http')) return '@' + url.replace(/\/+$/, '').split('/').pop()
    return url.startsWith('@') ? url : `@${url}`
  }
  return url.replace(/^https?:\/\//, '').replace(/\/+$/, '')
}

// Convierte el estado del form al body que espera la API.
export function formToClub(f) {
  const social_links = SOCIAL_PLATFORMS
    .map((platform) => ({ platform, url: (f[platform] ?? '').trim() }))
    .filter((s) => s.url)
  // 'grid' es el modo normal (la grilla día × horario); 'text' es la válvula
  // de escape para un horario que no entra en esa forma.
  const schedule = f.scheduleMode === 'text'
    ? (f.scheduleText ?? '').split('\n').map((line) => line.trim()).filter(Boolean).map((text) => ({ text }))
    : gridToLines(f.scheduleGrid ?? []).map((text) => ({ text }))
  return {
    name:             f.name?.trim() ?? '',
    location_name:    f.location_name?.trim() || null,
    contact_phone:    f.contact_phone?.trim() || null,
    contact_whatsapp: normalizeWhatsappDisplay(f.contact_whatsapp),
    courts:           f.courts === '' || f.courts == null ? null : Number(f.courts),
    social_links,
    schedule,
    lat:              f.lat ?? null,
    lon:              f.lon ?? null,
    owner_visible:    !!f.owner_visible,
  }
}

// Para mostrar el horario de un club como líneas de texto.
export function scheduleLines(schedule) {
  if (!Array.isArray(schedule)) return []
  return schedule.map((s) => (typeof s === 'string' ? s : s.text ?? '')).filter(Boolean)
}

// Compara los datos actuales de un club con los propuestos y devuelve
// [{ label, before, after }] solo para los campos que cambiaron.
export function clubChanges(current = {}, proposed = {}) {
  const changes = []
  const norm = (v) => (v == null || v === '' ? '' : String(v))
  const simple = [
    ['name',             'Nombre'],
    ['location_name',    'Ubicación'],
    ['contact_phone',    'Teléfono'],
    ['contact_whatsapp', 'WhatsApp'],
    ['courts',           'Canchas'],
  ]
  for (const [key, label] of simple) {
    const before = norm(current[key])
    const after  = norm(proposed[key])
    if (before !== after) changes.push({ label, before, after })
  }
  // Redes: comparar plataforma por plataforma para no mezclar cambios distintos.
  const socialLabels = { instagram: 'Instagram', facebook: 'Facebook', website: 'Sitio web' }
  const getUrl = (arr, platform) => (Array.isArray(arr) ? arr : []).find((s) => s?.platform === platform)?.url ?? ''
  for (const platform of Object.keys(socialLabels)) {
    const before = norm(getUrl(current.social_links, platform))
    const after  = norm(getUrl(proposed.social_links, platform))
    if (before !== after) changes.push({ label: socialLabels[platform], before, after })
  }

  const beforeSched = scheduleLines(current.schedule).join(' · ')
  const afterSched  = scheduleLines(proposed.schedule).join(' · ')
  if (beforeSched !== afterSched) changes.push({ label: 'Horarios', before: beforeSched, after: afterSched })

  return changes
}
