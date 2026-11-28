import { isSlotTaken } from './bookingAvailability.js'

// Horarios de inicio que todavía no pasaron, con cuántas canchas libres hay en cada uno
export function freeStartTimes(slots, courts, bookings, now = new Date()) {
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return slots
    .filter((s) => `${s.date} ${s.time}` > nowKey)
    .map((s) => ({ ...s, free: courts.filter((c) => !isSlotTaken(bookings, c.id, s)).length }))
    .filter((s) => s.free > 0)
}
