// Traduce entre las líneas de clubs.schedule y una grilla editable, agrupando días seguidos iguales

export const DAYS = [
  { key: 'lun', label: 'Lunes',     abbr: 'Lun' },
  { key: 'mar', label: 'Martes',    abbr: 'Mar' },
  { key: 'mie', label: 'Miércoles', abbr: 'Mié' },
  { key: 'jue', label: 'Jueves',    abbr: 'Jue' },
  { key: 'vie', label: 'Viernes',   abbr: 'Vie' },
  { key: 'sab', label: 'Sábado',    abbr: 'Sáb' },
  { key: 'dom', label: 'Domingo',   abbr: 'Dom' },
]

const DAY_INDEX = Object.fromEntries(DAYS.map((d, i) => [d.key, i]))

const DAY_ALIASES = {
  lun: 'lun', lunes: 'lun',
  mar: 'mar', martes: 'mar',
  mie: 'mie', 'mié': 'mie', miercoles: 'mie', 'miércoles': 'mie', mier: 'mie',
  jue: 'jue', jueves: 'jue',
  vie: 'vie', viernes: 'vie',
  sab: 'sab', 'sáb': 'sab', sabado: 'sab', 'sábado': 'sab',
  dom: 'dom', domingo: 'dom',
}

function resolveDayToken(token) {
  return DAY_ALIASES[token.trim().toLowerCase()] ?? null
}

// "9 a 23" / "09:00 a 23:00" / "9:00-23:00" → { from: '09:00', to: '23:00' }
function parseHours(str) {
  const m = str.match(/(\d{1,2})(?::(\d{2}))?\s*(?:a|-|–|hasta)\s*(\d{1,2})(?::(\d{2}))?/i)
  if (!m) return null
  const from = `${m[1].padStart(2, '0')}:${m[2] ?? '00'}`
  const to   = `${m[3].padStart(2, '0')}:${m[4] ?? '00'}`
  return { from, to }
}

// "Lun a Vie" / "Sáb y Dom" / "Lunes" → lista de day keys
function parseDayRange(str) {
  const s = str.trim().toLowerCase()
  const rangeM = s.match(/^(.+?)\s+a\s+(.+)$/)
  if (rangeM) {
    const from = resolveDayToken(rangeM[1])
    const to   = resolveDayToken(rangeM[2])
    if (from && to && DAY_INDEX[from] <= DAY_INDEX[to]) {
      return DAYS.slice(DAY_INDEX[from], DAY_INDEX[to] + 1).map((d) => d.key)
    }
  }
  const parts = s.split(/,| y /).map((p) => resolveDayToken(p)).filter(Boolean)
  return parts
}

export function emptyGrid() {
  return DAYS.map((d) => ({ key: d.key, open: false, from: '09:00', to: '23:00' }))
}

// Interpreta líneas de texto como grilla; devuelve null si no reconoce ningún día
export function parseScheduleToGrid(lines) {
  const byKey = Object.fromEntries(DAYS.map((d) => [d.key, { open: false, from: '09:00', to: '23:00' }]))
  let matched = 0
  for (const raw of lines ?? []) {
    const line = (typeof raw === 'string' ? raw : raw?.text ?? '').trim()
    if (!line) continue
    const sep = line.indexOf(':')
    if (sep === -1) continue
    const dayPart = line.slice(0, sep)
    const hours   = parseHours(line.slice(sep + 1))
    if (!hours) continue
    const days = parseDayRange(dayPart)
    if (!days.length) continue
    for (const key of days) { byKey[key] = { open: true, ...hours }; matched++ }
  }
  if (!matched) return null
  return DAYS.map((d) => ({ key: d.key, ...byKey[d.key] }))
}

// Horarios de inicio de turnos completos entre from y to; no ofrece un turno recortado
export function slotsForRange(from, to, slotMinutes) {
  const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const start = toMinutes(from);
  const end   = toMinutes(to);
  const slots = [];
  for (let t = start; t + slotMinutes <= end; t += slotMinutes) slots.push(toHHMM(t));
  return slots;
}

// Suma minutos a un horario HH:MM
export function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Agrupa días consecutivos con el mismo horario en una sola línea.
export function gridToLines(grid) {
  const lines = []
  let i = 0
  while (i < grid.length) {
    const day = grid[i]
    if (!day.open) { i++; continue }
    let j = i
    while (j + 1 < grid.length && grid[j + 1].open && grid[j + 1].from === day.from && grid[j + 1].to === day.to) j++
    const label = j === i
      ? DAYS[i].abbr
      : j === i + 1
        ? `${DAYS[i].abbr} y ${DAYS[j].abbr}`
        : `${DAYS[i].abbr} a ${DAYS[j].abbr}`
    lines.push(`${label}: ${day.from} a ${day.to}`)
    i = j + 1
  }
  return lines
}
