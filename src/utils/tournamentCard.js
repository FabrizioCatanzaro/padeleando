import { levelLabel } from './category'
import { dayKey } from './agenda'
import { isLive, isDraftTournament, tournamentDisplayStatus } from './helpers'

export const FORMAT_META = {
  liga:      { label: 'Liga',      cls: 'text-cyan bg-cyan/12',       dot: 'bg-cyan' },
  americano: { label: 'Americano', cls: 'text-brand bg-brand/12',     dot: 'bg-brand' },
  copa:      { label: 'Copa',      cls: 'text-chart-3 bg-chart-3/15', dot: 'bg-chart-3' },
}

export const STATUS_TEXT = {
  draft:    { label: 'Borrador',   cls: 'text-brand' },
  upcoming: { label: 'Próximo',    cls: 'text-white' },
  active:   { label: 'En curso',   cls: 'text-green', dot: true },
  live:     { label: 'En vivo',    cls: 'text-danger', dot: true, pulse: true },
  finished: { label: 'Finalizado', cls: 'text-secondary' },
}

const DOW = new Intl.DateTimeFormat('es-AR', { weekday: 'short' })
const MON = new Intl.DateTimeFormat('es-AR', { month: 'short' })
const clean = (s) => s.replace('.', '').toLowerCase()

export function parseDay(day) {
  if (!day) return null
  if (day instanceof Date) return new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const [y, m, d] = String(day).slice(0, 10).split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d) : null
}

export function dateParts(day) {
  const d = parseDay(day)
  return d ? { dow: clean(DOW.format(d)), day: d.getDate(), month: clean(MON.format(d)), key: dayKey(d) } : null
}

export function daysUntil(day, today = dayKey()) {
  const d = parseDay(day)
  const t = parseDay(today)
  return d && t ? Math.round((d - t) / 86400000) : null
}

/** "C7", "Mixto 6", "Suma 11". */
export function levelShort(level) {
  const label = levelLabel(level)
  if (!label) return null
  const short = label.split(' · ')[0]
  return short.replace(/^(SUMA|MIXTO) /, (m) => m.charAt(0) + m.slice(1).toLowerCase())
}

const cldFill = (url, w) => (url?.includes('/upload/') ? url.replace('/upload/', `/upload/c_fill,ar_3:4,g_auto,f_auto,q_auto,w_${w}/`) : url)

/** Flyer o portada de la galería; null si no hay ninguna. */
export function ownImage(t, w = 220) {
  const src = t?.flyer_url || t?.cover_url
  return src ? cldFill(src, w) : null
}

export const formatPhoto = (format) => `/formatos/${FORMAT_META[format] ? format : 'liga'}-600.webp`

export function stubTone(status, day, today = dayKey()) {
  if (status === 'live') return 'live'
  if (status === 'finished') return 'done'
  if (!day) return 'none'
  const n = daysUntil(day, today)
  return n !== null && n >= 0 && n <= 3 ? 'soon' : 'upcoming'
}

/** Texto de estado; un próximo cercano dice cuándo. */
export function statusText(status, day, today = dayKey()) {
  const base = STATUS_TEXT[status] ?? STATUS_TEXT.upcoming
  if (status !== 'upcoming' || !day) return base
  const n = daysUntil(day, today)
  if (n === 0) return { ...base, label: 'Hoy' }
  if (n === 1) return { ...base, label: 'Mañana' }
  if (n > 1 && n <= 7) return { ...base, label: `En ${n} días` }
  return base
}

export const countLabel = (n, one, many) => `${n} ${n === 1 ? one : many}`

/** Lo que muestran la fila y el tile, sin importar de qué endpoint vino el torneo. */
export function cardModel(t, { group = null, fallbackCreated = false, today = dayKey() } = {}) {
  const live = t.live === true || isLive(t)
  const isDraft = !t.roster_hidden && t.pair_count !== undefined
    && isDraftTournament({ format: t.format, pairCount: t.pair_count, playerCount: t.player_count, copaConfig: t.copa_config })
  const base = tournamentDisplayStatus({ status: t.status, hasLiveMatch: live, hasPlayed: (t.match_count ?? 0) > 0, isDraft })
  const status = live && base !== 'finished' ? 'live' : base
  const day = t.event_date ?? (fallbackCreated ? t.created_at : null)
  return {
    id: t.id,
    name: t.name,
    format: t.format,
    level: levelShort(t.level ?? group?.level),
    status,
    day,
    time: t.event_time ?? null,
    groupName: t.group_name ?? group?.name ?? null,
    ownerName: t.owner_name ?? group?.owner_name ?? null,
    ownerAvatar: t.owner_avatar_url ?? group?.owner_avatar_url ?? null,
    clubName: t.club_name ?? null,
    clubPhoto: t.club_photo_url ?? null,
    place: t.club_location_name ?? null,
    image: ownImage(t),
    tone: stubTone(status, day, today),
    statusText: statusText(status, day, today),
  }
}
