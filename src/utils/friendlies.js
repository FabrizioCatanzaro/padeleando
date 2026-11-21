// Amistosos: rótulos y cálculos puros. La API decide estados y permisos; esto solo los muestra.

export const SIDE_LABEL  = { drive: 'Drive', reves: 'Revés', cualquiera: 'Cualquiera' }
export const HAND_LABEL  = { diestro: 'Diestro', zurdo: 'Zurdo' }
export const STYLE_LABEL = { caballeros: 'Caballeros', damas: 'Damas', mixto: 'Mixto' }

export const SIDE_OPTIONS  = Object.entries(SIDE_LABEL).map(([id, label]) => ({ id, label }))
export const HAND_OPTIONS  = Object.entries(HAND_LABEL).map(([id, label]) => ({ id, label }))
export const STYLE_OPTIONS = Object.entries(STYLE_LABEL).map(([id, label]) => ({ id, label }))

export const STATUS_LABEL = {
  abierto: 'ABIERTO',
  completo: 'COMPLETO',
  falta_resultado: 'FALTA RESULTADO',
  por_confirmar: 'POR CONFIRMAR',
  confirmado: 'CONFIRMADO',
  cancelado: 'CANCELADO',
  vencido: 'VENCIDO',
}

const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
const MONTH = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

function parts(date) {
  const [y, m, d] = String(date).slice(0, 10).split('-').map(Number)
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
}

export function dayBlock(date) {
  const p = parts(date)
  return { dow: DOW[p.dow], day: String(p.d), month: MONTH[p.m - 1] }
}

export function longDate(date) {
  const b = dayBlock(date)
  return `${b.dow} ${b.day} ${b.month}`
}

export function endTime(startTime, minutes) {
  const [h, m] = String(startTime).split(':').map(Number)
  const total = h * 60 + m + Number(minutes)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const isFilled = (p) => Boolean(p?.user || p?.guest_name)
export const freeCount = (players = []) => players.filter((p) => !isFilled(p)).length
export const playerName = (p) => p?.user?.name ?? p?.guest_name ?? null

export function playerDetail(p) {
  const bits = []
  if (p?.user?.category) bits.push(p.user.category)
  if (p?.side) bits.push(SIDE_LABEL[p.side])
  if (p?.hand) bits.push(HAND_LABEL[p.hand])
  if (!p?.user && p?.guest_name) bits.push('Sin cuenta')
  return bits.join(' · ')
}

export function teamNames(players = [], team) {
  return players.filter((p) => p.team === team && isFilled(p)).map((p) => playerName(p)).join(' · ')
}

export const setsText = (sets = []) => sets.map((s) => `${s.s1}-${s.s2}`).join(' ')

export const perPersonFromTotal = (total) => (total === '' || total == null ? '' : String(Math.round(Number(total) / 4)))
export const totalFromPerPerson = (each) => (each === '' || each == null ? '' : String(Math.round(Number(each) * 4)))

export function matchMeta(m) {
  const bits = []
  bits.push(m.court_label || 'Sin cancha asignada')
  bits.push(`${m.duration_minutes} min`)
  bits.push(m.sets_format === 3 ? 'Mejor de 3' : 'Set único')
  if (m.style) bits.push(STYLE_LABEL[m.style])
  return bits.join(' · ')
}

export function setWinner(s) {
  const a = Number(s?.s1), b = Number(s?.s2)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null
  return a > b ? 1 : 2
}

export function resultSummary(setsFormat, sets) {
  if (setsFormat === 1) {
    const w = setWinner(sets[0])
    return w ? { ready: true, winner: w, score: [sets[0].s1, sets[0].s2] } : { ready: false }
  }
  const won = [0, 0]
  for (const s of sets) {
    if (won[0] === 2 || won[1] === 2) return { ready: false, error: 'Sobra un set: el partido ya estaba definido' }
    const w = setWinner(s)
    if (!w) return { ready: false }
    won[w - 1]++
  }
  if (won[0] < 2 && won[1] < 2) return { ready: false }
  return { ready: true, winner: won[0] > won[1] ? 1 : 2, score: won }
}

export const emptySets = (setsFormat) => (setsFormat === 3 ? [{ s1: 0, s2: 0 }, { s1: 0, s2: 0 }] : [{ s1: 0, s2: 0 }])

// Con dos sets repartidos aparece el tercero; con dos ganados por el mismo equipo, sobra.
export function normalizeSets(setsFormat, sets) {
  if (setsFormat !== 3) return sets.slice(0, 1)
  const first = sets.slice(0, 2)
  const w = first.map(setWinner)
  const split = w[0] && w[1] && w[0] !== w[1]
  return split ? [...first, sets[2] ?? { s1: 0, s2: 0 }] : first
}

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const DATE_FILTERS = [
  { id: 'todas', label: 'Cualquier fecha' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'manana', label: 'Mañana' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'finde', label: 'Este fin de semana' },
]

export function dateRange(id, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const add = (n) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + n)
  if (id === 'hoy') return { from: iso(today), to: iso(today) }
  if (id === 'manana') return { from: iso(add(1)), to: iso(add(1)) }
  if (id === 'semana') return { from: iso(today), to: iso(add(6)) }
  if (id === 'finde') {
    const dow = today.getDay()
    if (dow === 0) return { from: iso(today), to: iso(today) }
    return { from: iso(add(6 - dow)), to: iso(add(7 - dow)) }
  }
  return { from: null, to: null }
}

export function whatsappHref(phone, text = '') {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const full = digits.startsWith('54') ? digits : `549${digits}`
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function shareText(m, url) {
  const libres = freeCount(m.players)
  const faltan = libres > 0 ? ` Faltan ${libres}.` : ''
  return `Amistoso ${longDate(m.date)} ${m.start_time} en ${m.club.name}.${faltan} ${url}`
}

export const profileMatchHref = (m) =>
  m.source === 'amistoso' ? `/amistoso/${m.friendly_id}` : `/cat/${m.group_id}/torneo/${m.tournament_id}`;
