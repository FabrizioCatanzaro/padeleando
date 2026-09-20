// Helpers puros de disponibilidad para las vistas de reserva; no tocan la red

// Solo "confirmed" bloquea un horario
export function isSlotTaken(bookings, date, courtId, startTime) {
  return bookings.some((b) => (
    b.status === 'confirmed' &&
    b.date === date &&
    b.start_time.slice(0, 5) === startTime &&
    (courtId != null ? b.court_id === courtId : b.court_id == null)
  ))
}

// Group_id de pendientes ajenas en estos horarios, para el aviso "muy solicitado" (no bloquea)
export function pendingGroupIdsFor(bookings, date, courtId, startTimes) {
  const ids = new Set()
  for (const b of bookings) {
    if (
      b.status === 'pending' &&
      b.date === date &&
      (courtId != null ? b.court_id === courtId : b.court_id == null) &&
      startTimes.includes(b.start_time.slice(0, 5))
    ) ids.add(b.group_id)
  }
  return ids
}

// Turnos libres seguidos desde startIndex, hasta el primer ocupado o el tope cap
export function maxConsecutiveFree(bookings, date, courtId, slots, startIndex, cap) {
  let n = 0
  for (let i = startIndex; i < slots.length && n < cap; i++) {
    if (isSlotTaken(bookings, date, courtId, slots[i])) break
    n++
  }
  return n
}
