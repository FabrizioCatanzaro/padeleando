import { useEffect, useMemo, useState } from 'react'
import { isSlotTaken, pendingGroupIdsFor } from './bookingAvailability'
import { shortDayLabel } from './scheduleGrid'
import { computeTotalPrice } from './pricing'
import { formatMoney } from '../../utils/money'
import SlotSelectionPanel from './SlotSelectionPanel'

const keyOf = (s) => `${s.date} ${s.time}`
function nowKey() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// Mobile en dos pasos: la hora de inicio y después la cancha; la madrugada va en su propio grupo
export default function BookingFlowMobile({
  club, courts, slots, selectedDate, bookings,
  selection, onSelect, onChangeCount, onCancelSelection, onConfirm,
  canManage, maxSlotsPerBooking,
}) {
  const now = nowKey()
  const availableHours = useMemo(
    () => slots.filter((s) => keyOf(s) > now && courts.some((c) => !isSlotTaken(bookings, c.id, s))),
    [slots, courts, bookings, now],
  )
  const [selectedKey, setSelectedKey] = useState(() => {
    const s = (selection ? slots[selection.startIndex] : null) ?? availableHours[0]
    return s ? keyOf(s) : null
  })
  const availableKeys = availableHours.map(keyOf).join(',')

  useEffect(() => {
    if (!availableHours.some((s) => keyOf(s) === selectedKey)) setSelectedKey(availableHours[0] ? keyOf(availableHours[0]) : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, availableKeys])

  if (availableHours.length === 0) {
    return <p className="m-0 text-sm text-secondary">No quedan turnos libres este día.</p>
  }

  const hourIndex = slots.findIndex((s) => keyOf(s) === selectedKey)
  const selectedHour = hourIndex >= 0 ? slots[hourIndex] : null
  const dayHours = availableHours.filter((s) => !s.nextDay)
  const lateHours = availableHours.filter((s) => s.nextDay)
  const hourButton = (h) => {
    const on = selectedKey === keyOf(h)
    return (
      <button key={keyOf(h)} type="button" aria-pressed={on} onClick={() => { setSelectedKey(keyOf(h)); onCancelSelection() }}
        className={`min-w-16 min-h-10 px-3 rounded-full text-sm font-semibold cursor-pointer border transition-colors ${
          on ? 'bg-photo-ink text-photo-shade border-photo-ink' : 'bg-transparent text-white border-border-strong hover:border-soft'
        }`}>
        {h.time}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="bk-hour">
        <h3 id="bk-hour" className="m-0 mb-2.5 font-condensed font-bold text-[14px] text-white">Hora de inicio</h3>
        <div className="flex flex-wrap gap-1.5">{dayHours.map(hourButton)}</div>
        {lateHours.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-3.5 mb-2 text-[12px] text-brand">
              <span aria-hidden="true" className="flex-1 h-px bg-brand/50" />Madrugada del {shortDayLabel(lateHours[0].date)}<span aria-hidden="true" className="flex-1 h-px bg-brand/50" />
            </div>
            <div className="flex flex-wrap gap-1.5">{lateHours.map(hourButton)}</div>
          </>
        )}
      </section>

      {selectedHour && (
        <section aria-labelledby="bk-courts">
          <h3 id="bk-courts" className="m-0 mb-2.5 font-condensed font-bold text-[14px] text-white">Canchas a las {selectedHour.time}</h3>
          <div className="flex flex-col gap-2">
            {courts.map((court) => {
              const taken = isSlotTaken(bookings, court.id, selectedHour)
              const on = selection?.courtId === court.id && selection.startIndex === hourIndex
              const demand = pendingGroupIdsFor(bookings, court.id, [selectedHour]).size
              const price = computeTotalPrice(court, 2)
              return (
                <div key={court.id ?? 'default'} className={`rounded-[14px] bg-surface border ${on ? 'border-brand' : 'border-border-mid'}`}>
                  <button type="button" disabled={taken} aria-pressed={on}
                    onClick={() => (on ? onCancelSelection() : onSelect(court.id, hourIndex))}
                    className={`w-full flex gap-3 items-center bg-transparent border-0 px-3.5 py-3 text-left cursor-pointer disabled:cursor-not-allowed ${taken ? 'opacity-45' : ''}`}>
                    <span aria-hidden="true" className="w-2.5 h-11 rounded-sm shrink-0 border" style={{ background: court.floorColor, borderColor: court.wallColor }} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-white text-sm">{court.displayName}</span>
                      {court.summary && <span className="block text-[12px] text-secondary leading-snug mt-0.5">{court.summary}</span>}
                    </span>
                    <span className="text-[13px] text-content shrink-0 flex items-center gap-1.5">
                      {demand > 0 && !taken && <span aria-label="Muy solicitado" className="w-1.5 h-1.5 rounded-full bg-premium" />}
                      {taken ? 'Ocupada' : price != null ? `${formatMoney(price)}/h` : 'Elegir'}
                    </span>
                  </button>
                  {on && (
                    <div className="px-3.5 pb-3.5">
                      <SlotSelectionPanel court={court} club={club} slots={slots} bookings={bookings} selection={selection}
                        selectedDate={selectedDate} onChangeCount={onChangeCount} onCancel={onCancelSelection}
                        onConfirm={onConfirm} canManage={canManage} maxSlotsPerBooking={maxSlotsPerBooking} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
