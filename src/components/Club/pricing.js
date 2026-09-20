// Precio de turnos: bloques de 60 más un 30 suelto; igual a computeTotalPrice() de la API
export function computeTotalPrice(court, slotCount) {
  const p30 = court?.price_30 != null ? Number(court.price_30) : null
  const p60 = court?.price_60 != null ? Number(court.price_60) : null
  if (p30 == null && p60 == null) return null
  const unit30 = p30 ?? p60 / 2
  const unit60 = p60 ?? p30 * 2
  const blocks60 = Math.floor(slotCount / 2)
  const extra30  = slotCount % 2
  return blocks60 * unit60 + extra30 * unit30
}
