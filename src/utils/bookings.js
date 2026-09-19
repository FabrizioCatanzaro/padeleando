import { addMinutes } from '../components/Club/scheduleGrid'

// Compartido entre ClubBookingManage.jsx (reservas de un club, para el
// dueño) y MyBookingsView.jsx (reservas propias, para el jugador) -- las dos
// pantallas agrupan las mismas filas planas de `bookings` por group_id y
// necesitan la misma fecha/hora formateada, así que vive acá una sola vez.

export function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const label = new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// Fecha Y HORA a la que se hizo/decidió la solicitud -- distinto de `date`
// (el día del turno en sí, que se muestra por separado).
export function fmtDateTime(iso) {
  if (!iso) return null
  const label = new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// Agrupa las filas planas que devuelven GET /:id/bookings/manage o
// GET /bookings/mine (una fila por turno base) en una reserva lógica por
// group_id -- mismo criterio que usa el backend para insertarlas (ver
// insertBookingGroup en routes/clubs.js). club_id/club_name/club_photo_url
// sólo vienen en /bookings/mine (una reserva propia puede ser de cualquier
// club); en /:id/bookings/manage quedan undefined y no se usan -- el club ya
// se sabe por contexto en esa pantalla.
export function groupBookings(rows) {
  const map = new Map()
  for (const r of rows) {
    if (!map.has(r.group_id)) {
      map.set(r.group_id, {
        group_id: r.group_id,
        status: r.status,
        club_id: r.club_id,
        club_name: r.club_name,
        club_photo_url: r.club_photo_url,
        court_name: r.court_name,
        date: r.date,
        guest_name: r.guest_name,
        guest_contact: r.guest_contact,
        user_id: r.user_id,
        user_username: r.user_username,
        decision_reason: r.decision_reason,
        decided_at: r.decided_at,
        created_at: r.created_at,
        other_pending_count: r.other_pending_count ?? 0,
        slots: [],
        totalPrice: 0,
        hasPrice: false,
      })
    }
    const g = map.get(r.group_id)
    g.slots.push({ start_time: r.start_time.slice(0, 5), duration_minutes: r.duration_minutes })
    if (r.price != null) { g.totalPrice += Number(r.price); g.hasPrice = true }
  }
  return Array.from(map.values()).map((g) => {
    const sorted = [...g.slots].sort((a, b) => a.start_time.localeCompare(b.start_time))
    const last = sorted[sorted.length - 1]
    return {
      ...g,
      startTime: sorted[0].start_time,
      endTime: addMinutes(last.start_time, last.duration_minutes),
      slotCount: sorted.length,
      totalPrice: g.hasPrice ? g.totalPrice : null,
    }
  })
}
