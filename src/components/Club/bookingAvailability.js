// Helpers puros de disponibilidad para las vistas de reserva; no tocan la red

const sameCourt = (b, courtId) => (courtId != null ? b.court_id === courtId : b.court_id == null)

// Solo "confirmed" bloquea un turno ({ date, time })
export function isSlotTaken(bookings, courtId, slot) {
  return bookings.some((b) => (
    b.status === 'confirmed' && b.date === slot.date && b.start_time.slice(0, 5) === slot.time && sameCourt(b, courtId)
  ))
}

// Group_id de pendientes ajenas en estos turnos, para el aviso "muy solicitado" (no bloquea)
export function pendingGroupIdsFor(bookings, courtId, slots) {
  const keys = new Set(slots.map((s) => `${s.date} ${s.time}`))
  const ids = new Set()
  for (const b of bookings) {
    if (b.status === 'pending' && sameCourt(b, courtId) && keys.has(`${b.date} ${b.start_time.slice(0, 5)}`)) ids.add(b.group_id)
  }
  return ids
}

// Turnos libres seguidos desde startIndex, hasta el primer ocupado o el tope cap
export function maxConsecutiveFree(bookings, courtId, slots, startIndex, cap) {
  let n = 0
  for (let i = startIndex; i < slots.length && n < cap; i++) {
    if (isSlotTaken(bookings, courtId, slots[i])) break
    n++
  }
  return n
}
