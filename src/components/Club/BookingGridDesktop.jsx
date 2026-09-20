import { useMemo } from 'react'
import { isSlotTaken, pendingGroupIdsFor } from './bookingAvailability'
import SlotSelectionPanel from './SlotSelectionPanel'

const CELL_MIN_WIDTH = 26 // px por columna de MEDIO turno (30 min) -- dos por hora

// Tamaño estimado del popover para acotarlo al viewport antes del primer render
const POPOVER_WIDTH = 300
const POPOVER_HEIGHT_ESTIMATE = 150

// Escritorio: canchas en filas, una columna por medio turno y encabezado agrupado por hora
export default function BookingGridDesktop({
  club, courts, slots, selectedDate, bookings,
  selection, onSelect, onChangeCount, onCancelSelection, onConfirm,
  canManage, maxSlotsPerBooking,
}) {
  const hasHighDemand = useMemo(
    () => slots.some((s) => courts.some((c) => (
      !isSlotTaken(bookings, selectedDate, c.id, s) &&
      pendingGroupIdsFor(bookings, selectedDate, c.id, [s]).size > 0
    ))),
    [slots, courts, selectedDate, bookings],
  )

  const headerGroups = useMemo(() => buildHeaderGroups(slots), [slots])
  const selectedCourt = selection ? courts.find((c) => c.id === selection.courtId) : null
  const popoverStyle = selection?.anchorRect ? computePopoverStyle(selection.anchorRect) : null

  return (
    <div>
      <div
        className="overflow-x-auto overflow-y-hidden rounded-lg border border-border-mid"
        onScroll={() => { if (selection) onCancelSelection() }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: `180px repeat(${slots.length}, minmax(${CELL_MIN_WIDTH}px, 1fr))` }}
        >
          <div className="sticky left-0 z-10 bg-surface border-b border-r border-border-mid" />
          {headerGroups.map((g) => (
            <div
              key={`h-${g.startIndex}`}
              style={{ gridColumn: `span ${g.count}` }}
              className="border-b border-border-mid px-1 py-2 text-center text-[10px] font-mono text-dim whitespace-nowrap"
            >
              {g.hour}
            </div>
          ))}

          {courts.map((court) => (
            <CourtRow
              key={court.id ?? 'default'}
              court={court}
              slots={slots}
              selectedDate={selectedDate}
              bookings={bookings}
              selection={selection}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2.5">
        <span className="w-3 h-3 rounded-sm bg-border-strong/70 inline-block shrink-0" />
        <span className="text-[10.5px] font-mono text-dim">No disponible</span>
      </div>

      {hasHighDemand && (
        <p className="text-[10.5px] font-mono text-premium/90 mt-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-premium inline-block shrink-0" />
          Turno muy solicitado: ya hay otra persona esperando que el club decida. Igual podés pedirlo.
        </p>
      )}

      {selection && selectedCourt && popoverStyle && (
        <>
          <div className="fixed inset-0 z-40" onClick={onCancelSelection} />
          <div
            style={{ position: 'fixed', top: popoverStyle.top, left: popoverStyle.left, width: popoverStyle.width }}
            className="z-50 border border-border-mid rounded-lg bg-surface shadow-xl px-3.5 py-3"
          >
            <SlotSelectionPanel
              court={selectedCourt}
              club={club}
              slots={slots}
              selectedDate={selectedDate}
              bookings={bookings}
              selection={selection}
              onChangeCount={onChangeCount}
              onCancel={onCancelSelection}
              onConfirm={onConfirm}
              canManage={canManage}
              maxSlotsPerBooking={maxSlotsPerBooking}
            />
          </div>
        </>
      )}
    </div>
  )
}

// Agrupa los slots de 30 min por prefijo de hora real (un club puede abrir a las 09:30)
function buildHeaderGroups(slots) {
  const groups = []
  let i = 0
  while (i < slots.length) {
    const hour = slots[i].slice(0, 2)
    let j = i
    while (j + 1 < slots.length && slots[j + 1].slice(0, 2) === hour) j++
    groups.push({ hour, startIndex: i, count: j - i + 1 })
    i = j + 1
  }
  return groups
}

// Popover debajo de la celda, acotado a los bordes del viewport (o arriba si no entra)
function computePopoverStyle(rect) {
  const margin = 8
  const width = Math.min(POPOVER_WIDTH, window.innerWidth - margin * 2)
  let left = rect.left
  if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin
  if (left < margin) left = margin

  let top = rect.bottom + 8
  if (top + POPOVER_HEIGHT_ESTIMATE > window.innerHeight - margin) {
    top = rect.top - POPOVER_HEIGHT_ESTIMATE - 8
    if (top < margin) top = margin
  }
  return { left, top, width }
}

// Agrupa turnos ocupados seguidos en un bloque; los libres quedan de a uno
function buildSegments(court, slots, selectedDate, bookings) {
  const segments = []
  let i = 0
  while (i < slots.length) {
    if (isSlotTaken(bookings, selectedDate, court.id, slots[i])) {
      let j = i
      while (j + 1 < slots.length && isSlotTaken(bookings, selectedDate, court.id, slots[j + 1])) j++
      segments.push({ type: 'taken', startIndex: i, count: j - i + 1 })
      i = j + 1
    } else {
      segments.push({ type: 'free', startIndex: i, count: 1 })
      i++
    }
  }
  return segments
}

function CourtRow({ court, slots, selectedDate, bookings, selection, onSelect }) {
  const segments = useMemo(
    () => buildSegments(court, slots, selectedDate, bookings),
    [court, slots, selectedDate, bookings],
  )
  const isThisCourtSelected = selection?.courtId === court.id

  return (
    <>
      <div className="sticky left-0 z-10 bg-surface border-b border-r border-border-mid px-3 py-2.5">
        <div className="text-[12.5px] text-white font-sans truncate">{court.displayName}</div>
        {/* Sin truncate: esta info debe leerse completa */}
        {court.summary && <div className="text-[10px] font-mono text-dim mt-0.5">{court.summary}</div>}
      </div>

      {segments.map((seg) => {
        if (seg.type === 'taken') {
          return (
            <div
              key={`taken-${seg.startIndex}`}
              style={{ gridColumn: `span ${seg.count}` }}
              className="border-b border-border-mid bg-border-strong/70"
            />
          )
        }
        const time = slots[seg.startIndex]
        // Segmento libre de un turno: se resalta si su índice cae en el rango seleccionado
        const inSelection = isThisCourtSelected
          && seg.startIndex >= selection.startIndex
          && seg.startIndex < selection.startIndex + selection.count
        const demand = pendingGroupIdsFor(bookings, selectedDate, court.id, [time]).size
        return (
          <div key={`free-${seg.startIndex}`} className="relative border-b border-border-mid">
            <button
              type="button"
              onClick={(e) => onSelect(court.id, seg.startIndex, e.currentTarget.getBoundingClientRect())}
              className={`relative w-full h-full min-h-[38px] transition-colors cursor-pointer border-0 ${
                inSelection
                  ? 'bg-brand'
                  : demand > 0
                    ? 'bg-transparent hover:bg-premium/10'
                    : 'bg-transparent hover:bg-brand/10'
              }`}
              aria-label={`Reservar desde las ${time}`}
            >
              {demand > 0 && !inSelection && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-premium" aria-hidden="true" />
              )}
            </button>
          </div>
        )
      })}
    </>
  )
}
