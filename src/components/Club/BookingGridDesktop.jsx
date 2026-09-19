import { useMemo } from 'react'
import { isSlotTaken, pendingGroupIdsFor } from './bookingAvailability'
import SlotSelectionPanel from './SlotSelectionPanel'

const CELL_MIN_WIDTH = 26 // px por columna de MEDIO turno (30 min) -- dos por hora

// Ancho/alto estimados del popover para clamparlo contra los bordes del
// viewport antes de que React lo pinte (ver computePopoverStyle) -- no hace
// falta que sean exactos, sólo lo bastante generosos como para que nunca se
// corte contra un borde de la pantalla.
const POPOVER_WIDTH = 300
const POPOVER_HEIGHT_ESTIMATE = 150

// Vista de escritorio: todas las canchas activas como filas de una misma
// grilla, con un eje horario continuo -- se arma con CSS grid puro (sin medir
// píxeles a mano). Cada MEDIO turno (30 min, ver clubs.slot_minutes fijo en
// Fase 4) es su propia columna angosta -- así se puede arrancar un turno en
// punto o en la mitad (ej. 10:30) -- pero el ENCABEZADO agrupa cada par de
// columnas bajo una sola etiqueta de hora (buildHeaderGroups), para que se
// vea una columna por hora como en la referencia de Fabri (atcsports.io) en
// vez de una etiqueta "10:00"/"10:30" por separado. Un bloque ocupado de
// varios turnos seguidos pide `gridColumn: span N` para fundirse en un solo
// rectángulo, en vez de mostrar un botón gris por cada medio turno tomado.
//
// El popover de "elegí cuántos turnos" (SlotSelectionPanel) se renderiza UNA
// sola vez acá arriba (no por fila) con `position: fixed`, anclado al botón
// que se tocó (`selection.anchorRect`, capturado en el click con
// `getBoundingClientRect()`) -- así funciona como un popover FLOTANTE de
// verdad, igual que en la referencia, en vez de la fila que se expandía
// dentro de la grilla (esa versión obligaba a scrollear para llegar al +/-
// cuando la cancha tocada quedaba lejos del borde inferior visible, algo que
// Fabri señaló que no era lo acordado). `position: fixed` no lo recorta el
// `overflow-x-auto` de la grilla porque ese contenedor no tiene `transform`
// ni propiedades parecidas -- si el día llega a agregarle una, hay que
// revisar esto. Se cierra solo si se scrollea la grilla (la celda anclada ya
// no está debajo del popover) y con un backdrop invisible clickeable.
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

// Agrupa los slots de 30 min consecutivos que caen en la misma hora ("09:00"
// y "09:30" → un solo grupo "09" de 2 columnas) para el encabezado -- no
// asume que la grilla arranca en punto (un club puede abrir a las 09:30), así
// que agrupa por el prefijo de hora real de cada slot en vez de asumir pares.
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

// Posición del popover a partir del rect (viewport) del botón tocado: por
// default aparece debajo, pegado a la izquierda de la celda, pero se clampea
// contra los cuatro bordes de la pantalla (y se voltea arriba de la celda si
// no entra abajo) para que nunca quede cortado ni se vaya de la ventana.
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

// Agrupa turnos ocupados consecutivos en un solo segmento (para el bloque
// gris fundido); los libres quedan siempre de a uno, porque cada uno sigue
// siendo un botón clickeable propio (turno de inicio posible, cada 30 min).
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
        {/* Sin truncate a propósito (pedido de Fabri, 2026-09-13): esta info
            tiene que poder leerse siempre, aunque ocupe varias líneas -- la
            fila entera de la grilla (CSS grid) crece sola para acompañarla. */}
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
        // Cada segmento libre es siempre de un solo turno (ver buildSegments),
        // así que alcanza con chequear si su índice cae dentro del rango
        // [startIndex, startIndex+count) actual -- así el highlight cubre
        // TODOS los turnos sumados con el +/-, no sólo el primero tocado.
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
