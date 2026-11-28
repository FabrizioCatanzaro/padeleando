import { useMemo } from 'react'
import { isSlotTaken, pendingGroupIdsFor } from './bookingAvailability'
import { shortDayLabel } from './scheduleGrid'
import SlotSelectionPanel from './SlotSelectionPanel'

const CELL_MIN_WIDTH = 22
const POPOVER_WIDTH = 300
const POPOVER_HEIGHT_ESTIMATE = 290

const keyOf = (s) => `${s.date} ${s.time}`
function nowKey() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const isMidnight = (slots, i) => i > 0 && slots[i].nextDay && !slots[i - 1].nextDay

// Escritorio: canchas en filas, una columna por media hora y el encabezado por hora; la medianoche lleva una línea
export default function BookingGridDesktop({
  club, courts, slots, bookings, selectedDate, dayTitle,
  selection, onSelect, onChangeCount, onCancelSelection, onConfirm,
  canManage, maxSlotsPerBooking,
}) {
  const now = nowKey()
  const hasHighDemand = useMemo(
    () => slots.some((s) => courts.some((c) => !isSlotTaken(bookings, c.id, s) && pendingGroupIdsFor(bookings, c.id, [s]).size > 0)),
    [slots, courts, bookings],
  )
  const headerGroups = useMemo(() => buildHeaderGroups(slots), [slots])
  const selectedCourt = selection ? courts.find((c) => c.id === selection.courtId) : null
  const popoverStyle = selection?.anchorRect ? computePopoverStyle(selection.anchorRect) : null
  const cols = `220px repeat(${slots.length}, minmax(${CELL_MIN_WIDTH}px, 1fr))`

  return (
    <div>
      <div className="overflow-x-auto overflow-y-hidden rounded-xl border border-border-mid bg-surface"
        onScroll={() => { if (selection) onCancelSelection() }}>
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <div className="sticky left-0 z-10 bg-surface border-b border-border-mid px-4 py-3 text-[12px] text-dim">{dayTitle}</div>
          {headerGroups.map((g) => (
            <div key={`h-${g.startIndex}`} style={{ gridColumn: `span ${g.count}` }}
              className={`border-b border-border-mid py-3 pl-1.5 text-[12px] whitespace-nowrap ${g.midnight ? 'border-l-2 border-l-brand text-brand' : 'border-l border-l-border text-secondary'}`}>
              {g.hour}
              {g.midnight && <span className="block text-[10px] mt-0.5">{shortDayLabel(g.date)}</span>}
            </div>
          ))}
          {courts.map((court) => (
            <CourtRow key={court.id ?? 'default'} court={court} slots={slots} bookings={bookings}
              selection={selection} onSelect={onSelect} onCancelSelection={onCancelSelection} now={now} />
          ))}
        </div>
        <p className="m-0 px-4 py-3 text-[12px] text-dim">
          Tocá un horario libre. La mitad izquierda de cada hora arranca en punto y la derecha a y media.
          {slots.some((s) => s.nextDay) && ' Después de la línea amarilla los turnos son de la madrugada del día siguiente.'}
        </p>
      </div>

      {hasHighDemand && (
        <p className="m-0 mt-3 text-[12px] text-premium flex items-center gap-1.5">
          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-premium" />
          Turno muy solicitado: otra persona espera que el club decida. Igual podés pedirlo.
        </p>
      )}

      {selection && selectedCourt && popoverStyle && (
        <>
          <div className="fixed inset-0 z-40" onClick={onCancelSelection} />
          <div role="dialog" aria-label="Reservar turno"
            style={{ position: 'fixed', top: popoverStyle.top, left: popoverStyle.left, width: popoverStyle.width }}
            className="z-50 border border-border-strong rounded-[14px] bg-surface-alt shadow-2xl shadow-photo-shade/60 p-4">
            <SlotSelectionPanel court={selectedCourt} club={club} slots={slots} bookings={bookings} selection={selection}
              selectedDate={selectedDate} onChangeCount={onChangeCount} onCancel={onCancelSelection} onConfirm={onConfirm}
              canManage={canManage} maxSlotsPerBooking={maxSlotsPerBooking} />
          </div>
        </>
      )}
    </div>
  )
}

function buildHeaderGroups(slots) {
  const groups = []
  let i = 0
  while (i < slots.length) {
    const hour = slots[i].time.slice(0, 2)
    const date = slots[i].date
    let j = i
    while (j + 1 < slots.length && slots[j + 1].time.slice(0, 2) === hour && slots[j + 1].date === date) j++
    groups.push({ hour, date, midnight: isMidnight(slots, i), startIndex: i, count: j - i + 1 })
    i = j + 1
  }
  return groups
}

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

// Pasados y ocupados seguidos se funden en un bloque; los libres van de a media hora
function buildSegments(court, slots, bookings, now) {
  const kind = (s) => (keyOf(s) <= now ? 'past' : isSlotTaken(bookings, court.id, s) ? 'taken' : 'free')
  const segments = []
  let i = 0
  while (i < slots.length) {
    const k = kind(slots[i])
    if (k === 'free') { segments.push({ type: 'free', startIndex: i, count: 1 }); i++; continue }
    let j = i
    while (j + 1 < slots.length && !isMidnight(slots, j + 1) && kind(slots[j + 1]) === k) j++
    segments.push({ type: k, startIndex: i, count: j - i + 1 })
    i = j + 1
  }
  return segments
}

function CourtRow({ court, slots, bookings, selection, onSelect, onCancelSelection, now }) {
  const segments = useMemo(() => buildSegments(court, slots, bookings, now), [court, slots, bookings, now])
  const mine = selection?.courtId === court.id
  return (
    <>
      <div className="sticky left-0 z-10 bg-surface border-b border-border flex gap-2.5 px-4 py-3">
        <span aria-hidden="true" className="w-2.5 self-stretch rounded-sm shrink-0 border"
          style={{ background: court.floorColor, borderColor: court.wallColor }} />
        <span className="min-w-0">
          <span className="block font-sans font-bold text-[14px] text-white">{court.displayName}</span>
          {court.summary && <span className="block text-[12px] text-secondary leading-snug mt-0.5">{court.summary}</span>}
        </span>
      </div>
      {segments.map((seg) => {
        const slot = slots[seg.startIndex]
        const edge = isMidnight(slots, seg.startIndex) ? 'border-l-2 border-l-brand' : ''
        if (seg.type === 'past') {
          return <div key={`p-${seg.startIndex}`} aria-hidden="true" className={`border-b border-border ${edge}`}
            style={{ gridColumn: `span ${seg.count}`, background: 'repeating-linear-gradient(135deg, var(--color-surface) 0 6px, var(--color-surface-alt) 6px 12px)' }} />
        }
        if (seg.type === 'taken') {
          return (
            <div key={`t-${seg.startIndex}`} style={{ gridColumn: `span ${seg.count}` }} className={`border-b border-border py-2 px-0.5 ${edge}`}>
              <span className="h-full min-h-12 rounded-md bg-border-mid flex items-center px-2 text-[11px] text-dim overflow-hidden whitespace-nowrap">
                {seg.count >= 3 ? 'Ocupado' : ''}
              </span>
            </div>
          )
        }
        const inSel = mine && seg.startIndex >= selection.startIndex && seg.startIndex < selection.startIndex + selection.count
        const demand = pendingGroupIdsFor(bookings, court.id, [slot]).size
        const half = slot.time.endsWith(':30')
        return (
          <div key={`f-${seg.startIndex}`} className={`relative border-b border-border ${edge || (half ? 'border-l border-l-surface-alt' : 'border-l border-l-border')}`}>
            <button type="button"
              onClick={(e) => (inSel ? onCancelSelection() : onSelect(court.id, seg.startIndex, e.currentTarget.getBoundingClientRect()))}
              aria-label={`${court.displayName}, ${slot.time}${slot.nextDay ? ` del ${shortDayLabel(slot.date)}` : ''} libre`}
              className={`w-full h-full min-h-16 border-0 cursor-pointer transition-colors ${inSel ? 'bg-brand' : demand ? 'bg-transparent hover:bg-premium/15' : 'bg-transparent hover:bg-brand/15'}`}>
              {demand > 0 && !inSel && <span aria-hidden="true" className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-premium" />}
            </button>
          </div>
        )
      })}
    </>
  )
}
