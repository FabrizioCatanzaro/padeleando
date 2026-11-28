import { useEffect, useMemo, useState } from 'react'
import { isSlotTaken, pendingGroupIdsFor } from './bookingAvailability'
import { shortDayLabel } from './scheduleGrid'
import { computeTotalPrice } from './pricing'
import { formatMoney } from '../../utils/money'
import SlotSelectionPanel from './SlotSelectionPanel'

// Mobile en dos pasos: primero la hora (flex-wrap, sin scroll) y luego las canchas libres
export default function BookingFlowMobile({
  club, courts, slots, selectedDate, bookings,
  selection, onSelect, onChangeCount, onCancelSelection, onConfirm,
  canManage, maxSlotsPerBooking,
}) {
  const availableHours = useMemo(
    () => slots.filter((s) => courts.some((c) => !isSlotTaken(bookings, c.id, s))),
    [slots, courts, bookings],
  )
  const keyOf = (s) => `${s.date} ${s.time}`

  // Arranca en la hora de la selección en curso, si la hay
  const [selectedKey, setSelectedKey] = useState(() => {
    const s = (selection ? slots[selection.startIndex] : null) ?? availableHours[0]
    return s ? keyOf(s) : null
  })
  const availableKeys = availableHours.map(keyOf).join(',')

  // Si cambia el día o la hora ya no está libre, elige la primera disponible
  useEffect(() => {
    if (!availableHours.some((s) => keyOf(s) === selectedKey)) setSelectedKey(availableHours[0] ? keyOf(availableHours[0]) : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, availableKeys])

  const hasHighDemand = availableHours.some((h) => courts.some((c) => (
    !isSlotTaken(bookings, c.id, h) &&
    pendingGroupIdsFor(bookings, c.id, [h]).size > 0
  )))

  if (availableHours.length === 0) {
    return <p className="text-[12.5px] text-dim">No quedan turnos libres este día.</p>
  }

  const hourIndex = slots.findIndex((s) => keyOf(s) === selectedKey)
  const selectedHour = hourIndex >= 0 ? slots[hourIndex] : null
  const courtsAtHour = selectedHour
    ? courts.filter((c) => !isSlotTaken(bookings, c.id, selectedHour))
    : []
  const dayHours = availableHours.filter((s) => !s.nextDay)
  const lateHours = availableHours.filter((s) => s.nextDay)
  const hourButton = (h) => (
    <button key={keyOf(h)} type="button" onClick={() => setSelectedKey(keyOf(h))}
      className={`shrink-0 px-3.5 py-2 rounded-lg text-[12.5px] font-mono border cursor-pointer transition-colors ${
        selectedKey === keyOf(h) ? 'bg-brand text-base border-brand' : 'bg-transparent text-white border-border-strong hover:border-brand hover:text-brand'
      }`}>
      {h.time}
    </button>
  )

  return (
    <div>
      <p className="text-[11px] font-mono text-dim mb-2">Mostrando los horarios con turnos disponibles:</p>
      <div className="flex flex-wrap gap-1.5 mb-4">{dayHours.map(hourButton)}</div>
      {lateHours.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-2 text-[11px] font-mono text-brand">
            <span className="flex-1 h-px bg-brand/50" />Madrugada del {shortDayLabel(lateHours[0].date)}<span className="flex-1 h-px bg-brand/50" />
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">{lateHours.map(hourButton)}</div>
        </>
      )}

      <p className="font-condensed font-bold text-[13px] tracking-[3px] text-[#555] mb-1">CANCHAS DISPONIBLES</p>
      <p className="text-[11.5px] text-dim mb-3">Para continuar, elegí una duración y precio.</p>

      <div className="flex flex-col gap-3">
        {courtsAtHour.map((court) => {
          const isThisCourtSelected = selection?.courtId === court.id && selection.startIndex === hourIndex
          const demand = pendingGroupIdsFor(bookings, court.id, [selectedHour]).size
          const startingPrice = computeTotalPrice(court, 1)
          return (
            <div key={court.id ?? 'default'} className="border border-border-mid rounded-lg px-3.5 py-3">
              <div className="text-[13px] text-white font-sans">{court.displayName}</div>
              {court.summary && <div className="text-[10.5px] font-mono text-dim mt-0.5">{court.summary}</div>}

              {!isThisCourtSelected ? (
                <button type="button" onClick={() => onSelect(court.id, hourIndex)}
                  className="relative mt-2.5 inline-flex items-center gap-2 bg-brand/10 border border-brand text-brand px-3.5 py-2 rounded-lg font-mono text-[12.5px] cursor-pointer hover:bg-brand/20 transition-colors">
                  {startingPrice != null ? formatMoney(startingPrice) : 'Ver precio'} · {club.slot_minutes} min
                  {demand > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-premium inline-block shrink-0" aria-hidden="true" />
                  )}
                </button>
              ) : (
                <div className="mt-2.5">
                  <SlotSelectionPanel
                    court={court} club={club} slots={slots} bookings={bookings}
                    selection={selection} onChangeCount={onChangeCount} onCancel={onCancelSelection}
                    onConfirm={onConfirm} canManage={canManage} maxSlotsPerBooking={maxSlotsPerBooking}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hasHighDemand && (
        <p className="text-[10.5px] font-mono text-premium/90 mt-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-premium inline-block shrink-0" />
          Turno muy solicitado: ya hay otra persona esperando que el club decida. Igual podés pedirlo.
        </p>
      )}
    </div>
  )
}
