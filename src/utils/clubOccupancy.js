const DAY = 1440
const BAND = 120
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

function windowOf(day) {
  if (!day?.open) return null
  const start = toMin(day.from)
  let end = toMin(day.to)
  if (end <= start) end += DAY
  return { start, end }
}

// Medias horas abiertas de un día real en cada franja de 2 h, sumando la madrugada del día anterior
function openHalfHours(grid, idx) {
  const out = Array(12).fill(0)
  const add = (from, to) => { for (let t = from; t < to; t += 30) out[Math.floor(t / BAND)]++ }
  const cur = windowOf(grid[idx])
  if (cur) add(cur.start, Math.min(cur.end, DAY))
  const prev = windowOf(grid[(idx + 6) % 7])
  if (prev && prev.end > DAY) add(0, Math.min(prev.end - DAY, cur ? cur.start : DAY))
  return out
}

// Ocupación por día (lun a dom) y franja; level 0-4 para la rampa de calor
export function occupancyGrid(grid, cells, courts, weeks) {
  if (!grid || !courts) return null
  const booked = new Map((cells ?? []).map((c) => [`${c.dow}-${c.band}`, c.slots]))
  const caps = grid.map((_, i) => openHalfHours(grid, i).map((n) => n * courts * weeks))
  const bands = Array.from({ length: 12 }, (_, b) => b).filter((b) => caps.some((row) => row[b] > 0))
  let used = 0, total = 0
  const rows = grid.map((_, i) => ({
    idx: i,
    cells: bands.map((b) => {
      const cap = caps[i][b]
      const n = Math.min(booked.get(`${i + 1}-${b}`) ?? 0, cap)
      used += n; total += cap
      const ratio = cap ? n / cap : null
      return { band: b, ratio, level: ratio == null ? null : Math.min(4, Math.ceil(ratio * 4)) }
    }),
  }))
  return { bands, rows, percent: total ? Math.round((used / total) * 100) : 0 }
}
