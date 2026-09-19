import { useEffect, useMemo, useState } from 'react'
import { isSlotTaken, pendingGroupIdsFor } from './bookingAvailability'
import { computeTotalPrice } from './pricing'
import { formatMoney } from '../../utils/money'
import SlotSelectionPanel from './SlotSelectionPanel'

// Vista mobile: una grilla como la de escritorio no entra en una pantalla
// angosta (hay clubes con 10+ horas de horario), así que acá se arma en dos
// pasos, como la referencia que trajo Fabri -- primero se elige la HORA
// (chips con los horarios que tienen algún turno libre en CUALQUIER cancha
// ese día) y recién ahí se ve, para esa hora puntual, qué canchas están
// libres. A propósito NO se copia el detalle de la referencia de mostrar dos
// botones de precio fijos (60/120 min): acá tocar una cancha despliega el
// mismo selector +/- de siempre, porque el usuario puede querer armar
// cualquier duración de a turnos de 30 min (Fase 4) -- el botón sólo muestra
// el precio de arrancar con UN turno (30 min).
// Los chips de hora van en flex-wrap (no scroll horizontal, pedido de Fabri
// 2026-09-13): a diferencia de la tira de 7 días de ClubBooking.jsx, acá
// puede haber muchos más horarios en un mismo día y todos tienen que
// quedar a la vista sin scrollear.
export default function BookingFlowMobile({
  club, courts, slots, selectedDate, bookings,
  selection, onSelect, onChangeCount, onCancelSelection, onConfirm,
  canManage, maxSlotsPerBooking,
}) {
  const availableHours = useMemo(
    () => slots.filter((s) => courts.some((c) => !isSlotTaken(bookings, selectedDate, c.id, s))),
    [slots, courts, selectedDate, bookings],
  )

  // Si ya hay una selección en curso (por ejemplo, se venía de la vista de
  // escritorio y la pantalla se achicó a mitad de flujo), arranca mostrando
  // la hora de esa selección en vez de la primera disponible.
  const [selectedHour, setSelectedHour] = useState(() => (
    (selection ? slots[selection.startIndex] : null) ?? availableHours[0] ?? null
  ))

  // Si cambia el día (o la hora elegida ya no queda libre en ninguna cancha),
  // se vuelve a elegir la primera disponible.
  useEffect(() => {
    if (!availableHours.includes(selectedHour)) setSelectedHour(availableHours[0] ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, availableHours.join(',')])

  const hasHighDemand = availableHours.some((h) => courts.some((c) => (
    !isSlotTaken(bookings, selectedDate, c.id, h) &&
    pendingGroupIdsFor(bookings, selectedDate, c.id, [h]).size > 0
  )))

  if (availableHours.length === 0) {
    return <p className="text-[12.5px] text-dim">No quedan turnos libres este día.</p>
  }

  const hourIndex = slots.indexOf(selectedHour)
  const courtsAtHour = selectedHour != null
    ? courts.filter((c) => !isSlotTaken(bookings, selectedDate, c.id, selectedHour))
    : []

  return (
    <div>
      <p className="text-[11px] font-mono text-dim mb-2">Mostrando los horarios con turnos disponibles:</p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {availableHours.map((h) => (
          <button key={h} type="button" onClick={() => setSelectedHour(h)}
            className={`shrink-0 px-3.5 py-2 rounded-lg text-[12.5px] font-mono border cursor-pointer transition-colors ${
              selectedHour === h ? 'bg-brand text-base border-brand' : 'bg-transparent text-white border-border-strong hover:border-brand hover:text-brand'
            }`}>
            {h}
          </button>
        ))}
      </div>

      <p className="font-condensed font-bold text-[13px] tracking-[3px] text-[#555] mb-1">CANCHAS DISPONIBLES</p>
      <p className="text-[11.5px] text-dim mb-3">Para continuar, elegí una duración y precio.</p>

      <div className="flex flex-col gap-3">
        {courtsAtHour.map((court) => {
          const isThisCourtSelected = selection?.courtId === court.id && selection.startIndex === hourIndex
          const demand = pendingGroupIdsFor(bookings, selectedDate, court.id, [selectedHour]).size
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
                    court={court} club={club} slots={slots} selectedDate={selectedDate} bookings={bookings}
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
