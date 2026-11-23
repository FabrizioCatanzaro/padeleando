import { dayKey, shortDay } from './agenda'

export const FORMAT_LABEL = { liga: 'LIGA', americano: 'AMERICANO', copa: 'COPA' }
export const FORMAT_CLS   = { liga: 'text-cyan', americano: 'text-brand', copa: 'text-chart-3' }

export function roleOf(t) {
  if (t.plays && t.manages) return 'ambos'
  if (t.manages) return 'organizas'
  return 'jugas'
}

export const ROLE_LABEL = { jugas: 'Jugás', organizas: 'Organizás', ambos: 'Jugás y organizás' }

// En curso, próximo o finalizado: con fecha futura es próximo; activo sin fecha futura, en curso.
export function phaseOf(t, today = dayKey()) {
  if (t.status === 'finished') return 'finalizados'
  if (t.event_date && t.event_date > today) return 'proximos'
  return 'en_curso'
}

export function statusLine(t, phase) {
  if (t.live) return { text: 'En vivo', cls: 'text-green' }
  if (phase === 'finalizados') return t.won_final ? { text: 'Campeón', cls: 'text-brand' } : { text: 'Finalizado', cls: 'text-secondary' }
  if (phase === 'proximos') return { text: [shortDay(t.event_date), t.event_time].filter(Boolean).join(' · '), cls: 'text-white' }
  return { text: 'En curso', cls: 'text-white' }
}

export function detailLine(t) {
  if (!t.plays && t.my_registration === 'pending') return 'Tu inscripción espera al organizador'
  if (!t.plays && t.my_registration === 'waitlist') return 'Estás en lista de espera'
  if (!t.plays && t.my_registration === 'approved') return 'Inscripción aprobada'
  const bits = [`${t.player_count} ${t.player_count === 1 ? 'jugador' : 'jugadores'}`]
  if (t.match_count > 0) bits.push(`${t.match_count} ${t.match_count === 1 ? 'partido' : 'partidos'}`)
  return bits.join(' · ')
}
