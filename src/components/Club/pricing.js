// Precio de turnos (Fase 4): el dueño carga DOS precios por cancha -- uno
// para un turno de 30 min (`price_30`) y otro para uno de 60 (`price_60`) --
// porque en la práctica el de 60 no siempre es el doble del de 30 (puede
// tener un combo). Como el turno base ahora SIEMPRE es de 30 min (ver
// clubForm.js/ClubFormFields.jsx -- el dueño ya no elige la duración), una
// reserva de varios turnos seguidos se arma de a bloques de 60 min y, si
// sobra un turno de 30 suelto (cantidad impar de turnos), se suma aparte con
// el precio de 30. Misma lógica que `computeTotalPrice()` en
// padeliando-api/src/routes/clubs.js -- si se cambia acá, cambiar allá.
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
