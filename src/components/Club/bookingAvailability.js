// Helpers puros de disponibilidad para las vistas de reserva (BookingGridDesktop
// y BookingFlowMobile) -- separados de scheduleGrid.js a propósito, porque ese
// archivo es sobre EDITAR el horario semanal del club, y esto es sobre LEER
// qué turnos ya están ocupados/pedidos para un día puntual. Toman `bookings`
// (las filas que ya trajo ClubBooking.jsx desde GET /:id/bookings) y nunca
// pegan a la red -- son las mismas cuentas que antes vivían como funciones
// locales dentro de ClubBooking.jsx, sólo que ahora reciben `courtId` como
// parámetro en vez de cerrar sobre un único "selectedCourtId", porque las dos
// vistas nuevas pueden mostrar más de una cancha a la vez.

// Sólo "confirmed" bloquea un horario (decisión de Fabri, 2026-09-06): dejar
// "pending" en pie evita que el dueño pierda clientes por tardar en decidir.
export function isSlotTaken(bookings, date, courtId, startTime) {
  return bookings.some((b) => (
    b.status === 'confirmed' &&
    b.date === date &&
    b.start_time.slice(0, 5) === startTime &&
    (courtId != null ? b.court_id === courtId : b.court_id == null)
  ))
}

// Group_id de las solicitudes pendientes (de otras personas) que ya apuntan a
// alguno de estos horarios -- para el aviso de "muy solicitado" (no bloquea,
// sólo informa). Cuenta grupos, no filas: una misma reserva de varios turnos
// seguidos no debe contarse dos veces.
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

// Cuántos turnos seguidos y libres hay a partir de `startIndex` en `slots` --
// corta en el primer turno ya tomado o en el tope `cap` (MAX_SLOTS_PER_BOOKING,
// ver ClubBooking.jsx).
export function maxConsecutiveFree(bookings, date, courtId, slots, startIndex, cap) {
  let n = 0
  for (let i = startIndex; i < slots.length && n < cap; i++) {
    if (isSlotTaken(bookings, date, courtId, slots[i])) break
    n++
  }
  return n
}
