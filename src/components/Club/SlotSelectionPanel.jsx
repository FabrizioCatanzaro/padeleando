import { Minus, Plus, X } from 'lucide-react'
import { addMinutes } from './scheduleGrid'
import { maxConsecutiveFree } from './bookingAvailability'
import { computeTotalPrice } from './pricing'
import { formatMoney } from '../../utils/money'

// Panel de "elegí cuántos turnos seguidos" + confirmar -- compartido por
// BookingGridDesktop (aparece como una fila que se expande debajo de la
// cancha tocada) y BookingFlowMobile (aparece dentro de la tarjeta de la
// cancha tocada). Misma mecánica de siempre (antes vivía inline en
// ClubBooking.jsx): se parte de 1 turno y se suma/resta de a uno, hasta el
// tope de turnos libres seguidos o MAX_SLOTS_PER_BOOKING, lo que sea menor.
export default function SlotSelectionPanel({
  court, club, slots, selectedDate, bookings, selection,
  onChangeCount, onCancel, onConfirm, canManage, maxSlotsPerBooking,
}) {
  const selectedSlots = slots.slice(selection.startIndex, selection.startIndex + selection.count)
  const rangeEnd = addMinutes(selectedSlots[selectedSlots.length - 1], club.slot_minutes)
  const totalPrice = computeTotalPrice(court, selection.count)
  const maxFree = maxConsecutiveFree(bookings, selectedDate, court.id, slots, selection.startIndex, maxSlotsPerBooking)

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] text-white font-sans">
            {selectedSlots[0]} – {rangeEnd} hs
          </div>
          <div className="text-[11px] font-mono text-muted mt-0.5">
            {selection.count} {selection.count === 1 ? 'turno' : 'turnos'} · {selection.count * club.slot_minutes} min
            {totalPrice != null ? ` · ${formatMoney(totalPrice)}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" disabled={selection.count <= 1}
            onClick={() => onChangeCount(-1)}
            className="p-1.5 bg-transparent border border-border-strong rounded text-muted hover:text-white cursor-pointer disabled:opacity-30" aria-label="Sacar un turno">
            <Minus size={13} />
          </button>
          <button type="button" disabled={selection.count >= maxFree}
            onClick={() => onChangeCount(1)}
            className="p-1.5 bg-transparent border border-border-strong rounded text-muted hover:text-white cursor-pointer disabled:opacity-30" aria-label="Sumar un turno seguido">
            <Plus size={13} />
          </button>
          <button type="button" onClick={onCancel}
            className="p-1.5 bg-transparent border-none text-muted hover:text-white cursor-pointer" aria-label="Cancelar selección">
            <X size={14} />
          </button>
        </div>
      </div>
      <button type="button" onClick={onConfirm}
        className="w-full inline-flex items-center justify-center gap-2 bg-brand text-base border-0 px-3.5 py-2.5 rounded-lg font-condensed font-bold text-[12px] tracking-widest cursor-pointer">
        {canManage ? 'MARCAR COMO RESERVADO' : 'RESERVAR'}
      </button>
    </div>
  )
}
