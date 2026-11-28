import { Minus, Plus, X } from 'lucide-react'
import { slotRange, shortDayLabel, DAYS, dayGridIndex } from './scheduleGrid'
import { maxConsecutiveFree } from './bookingAvailability'
import { computeTotalPrice } from './pricing'
import { formatMoney } from '../../utils/money'

const duration = (min) => {
  const h = Math.floor(min / 60), m = min % 60
  return [h && `${h} h`, m && `${m} min`].filter(Boolean).join(' ')
}

// Panel de turnos seguidos, compartido por el popover de escritorio y la tarjeta mobile
export default function SlotSelectionPanel({
  court, club, slots, bookings, selection, selectedDate,
  onChangeCount, onCancel, onConfirm, canManage, maxSlotsPerBooking,
}) {
  const selectedSlots = slots.slice(selection.startIndex, selection.startIndex + selection.count)
  const range = slotRange(selectedSlots, club.slot_minutes)
  const totalPrice = computeTotalPrice(court, selection.count)
  const maxFree = maxConsecutiveFree(bookings, court.id, slots, selection.startIndex, maxSlotsPerBooking)
  const online = !!club.mp_connected && totalPrice != null
  const day = selectedDate ? `${DAYS[dayGridIndex(selectedDate)].abbr} ${Number(selectedDate.slice(8))} · ` : ''
  const btn = 'w-11 h-11 rounded-lg bg-border-mid text-white border-0 cursor-pointer flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed'

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <div className="font-sans font-bold text-[15px] text-white">{court.displayName}</div>
          <div className="text-[13px] text-soft mt-0.5">
            {day}{range.start} a {range.end}{range.crossesTo ? ` (${shortDayLabel(range.crossesTo)})` : ''}
          </div>
        </div>
        <button type="button" onClick={onCancel} aria-label="Cerrar"
          className="w-9 h-9 shrink-0 rounded-lg border border-border-strong bg-transparent text-content cursor-pointer flex items-center justify-center hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center justify-between border border-border-strong rounded-[11px] p-1.5">
        <button type="button" className={btn} disabled={selection.count <= 1} onClick={() => onChangeCount(-1)} aria-label="Restar media hora"><Minus size={16} /></button>
        <span className="text-center">
          <span className="block font-condensed font-black text-[17px] text-white">{duration(selection.count * club.slot_minutes)}</span>
          <span className="block text-[11px] text-secondary mt-0.5">
            {maxFree <= selection.count ? 'No hay más tiempo libre seguido' : `Hasta ${duration(maxFree * club.slot_minutes)} seguidas`}
          </span>
        </span>
        <button type="button" className={btn} disabled={selection.count >= maxFree} onClick={() => onChangeCount(1)} aria-label="Sumar media hora"><Plus size={16} /></button>
      </div>

      {totalPrice != null && (
        <div className="flex justify-between items-baseline">
          <span className="text-[13px] text-soft">Total</span>
          <span className="font-condensed font-black text-[20px] text-white tabular-nums">{formatMoney(totalPrice)}</span>
        </div>
      )}

      <button type="button" onClick={onConfirm}
        className="w-full min-h-[46px] border-0 rounded-[11px] bg-brand text-base font-sans font-bold text-[15px] cursor-pointer">
        {canManage ? 'Marcar como reservado' : online ? 'Reservar y pagar' : 'Pedir el turno'}
      </button>
      {!canManage && (
        <p className="m-0 text-[12px] text-secondary leading-relaxed">
          {online
            ? 'Pagás con Mercado Pago. El turno queda tuyo cuando se acredita el pago.'
            : 'El club confirma tu pedido y te avisamos.'}
        </p>
      )}
    </div>
  )
}
