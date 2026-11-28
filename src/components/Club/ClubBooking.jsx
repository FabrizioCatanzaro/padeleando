import { useEffect, useMemo, useState } from 'react'
import { api } from '../../utils/api'
import { parseScheduleToGrid, businessDaySlots, businessToday, addDaysStr, dayGridIndex, DAYS } from './scheduleGrid'
import { pendingGroupIdsFor } from './bookingAvailability'
import BookingGridDesktop from './BookingGridDesktop'
import BookingFlowMobile from './BookingFlowMobile'
import BookingFormModal from './BookingFormModal'
import BookingManualBlockModal from './BookingManualBlockModal'
import { courtSummary, courtFloorColor, courtWallColor } from '../../utils/clubProfile'
import ClubMyBookings from './ClubMyBookings'

const HORIZON_DAYS = 7
const MAX_SLOTS_PER_BOOKING = 8 // igual al tope del backend (routes/clubs.js)


function dayLongLabel(dateStr, i) {
  const name = DAYS[dayGridIndex(dateStr)].label
  const d = Number(dateStr.slice(8))
  return i === 0 ? `Hoy, ${name.toLowerCase()} ${d}` : `${name} ${d}`
}

// Reserva pública: requiere horario en grilla; escritorio usa grilla y mobile dos pasos
export default function ClubBooking({ club, canManage = false }) {
  const grid = useMemo(() => parseScheduleToGrid(club.schedule), [club.schedule])
  const dates = useMemo(() => {
    const first = businessToday(grid)
    return Array.from({ length: HORIZON_DAYS }, (_, i) => addDaysStr(first, i))
  }, [grid])
  const courts = useMemo(() => (club.courts_list ?? []).filter((c) => c.active), [club.courts_list])

  // Forma común de las dos vistas; sin canchas cargadas hay una fila genérica con name null
  const effectiveCourts = useMemo(() => {
    if (courts.length > 0) {
      return courts.map((c) => ({
        id: c.id,
        name: c.name,
        displayName: c.name,
        price_30: c.price_30,
        price_60: c.price_60,
        // El precio no va acá: se muestra en el botón o panel de selección
        summary: courtSummary(c).join(' · '),
        floorColor: courtFloorColor(c),
        wallColor: courtWallColor(c),
      }))
    }
    return [{
      id: null,
      name: null,
      displayName: 'Turnos disponibles',
      price_30: null,
      price_60: null,
      summary: 'Turnos de 30 min en adelante',
      floorColor: 'var(--color-border-strong)',
      wallColor: 'var(--color-border-strong)',
    }]
  }, [courts])

  // matchMedia como en ProfileView: cambia el componente, no solo el estilo
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const [selectedDate, setSelectedDate] = useState(dates[0])
  const [bookings, setBookings]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [selection, setSelection]       = useState(null) // { courtId, startIndex, count }
  const [confirming, setConfirming]     = useState(false)
  const [bookedCount, setBookedCount]   = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.clubs.bookings.list(club.id, dates[0], addDaysStr(dates[dates.length - 1], 1))
      .then((rows) => { if (!cancelled) { setBookings(rows); setError(null) } })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club.id])

  // Sin dueño verificado nadie puede aprobar pedidos: se muestra un cartel para reclamar el club
  if (!club.has_owner && !canManage) {
    return (
      <div className="border border-border-mid rounded-lg px-4 py-6 text-center">
        <p className="font-condensed font-bold text-[13px] tracking-wide text-premium mb-2 leading-snug">
          NO DISPONIBLE HASTA QUE UN USUARIO PADELERO RECLAME SER DUEÑO DE ESTE CLUB
        </p>
        <p className="text-[12px] text-dim leading-relaxed max-w-[42ch] mx-auto">
          Todavía nadie puede confirmar o rechazar turnos acá. Si conocés este club, invitalo a reclamarlo desde la solapa INFO.
        </p>
      </div>
    )
  }

  if (!grid) {
    return (
      <p className="text-[12.5px] text-dim leading-relaxed">
        Este club todavía no cargó su horario en un formato que permita reservar online. Fijate el teléfono o WhatsApp en la solapa INFO para consultar turnos directo.
      </p>
    )
  }

  const dayGrid = grid[dayGridIndex(selectedDate)]
  const slots = businessDaySlots(grid, selectedDate, club.slot_minutes)

  function selectDate(dt) { setSelectedDate(dt); setSelection(null) }

  // anchorRect solo lo manda la grilla de escritorio (ancla del popover)
  function handleSelect(courtId, startIndex, anchorRect) {
    setSelection({ courtId, startIndex, count: 1, anchorRect })
  }
  function handleChangeCount(delta) {
    setSelection((sel) => (sel ? { ...sel, count: Math.max(1, sel.count + delta) } : sel))
  }
  function handleCancelSelection() { setSelection(null) }
  function handleConfirmRequest() { setConfirming(true) }

  function handleBooked(created) {
    setBookings((bs) => [...bs, ...created])
    setBookedCount((n) => n + 1)
    setSelection(null)
    setConfirming(false)
  }

  const selectedCourt = selection ? effectiveCourts.find((c) => c.id === selection.courtId) : null
  const selectedSlots = selection ? slots.slice(selection.startIndex, selection.startIndex + selection.count) : []
  const selectedOverlapGroupIds = selection
    ? pendingGroupIdsFor(bookings, selection.courtId, selectedSlots)
    : new Set()

  const sharedViewProps = {
    club,
    courts: effectiveCourts,
    slots,
    selectedDate,
    dayTitle: dayLongLabel(selectedDate, dates.indexOf(selectedDate)),
    bookings,
    selection,
    onSelect: handleSelect,
    onChangeCount: handleChangeCount,
    onCancelSelection: handleCancelSelection,
    onConfirm: handleConfirmRequest,
    canManage,
    maxSlotsPerBooking: MAX_SLOTS_PER_BOOKING,
  }

  return (
    <div>
      <div className="flex justify-between items-end gap-4 flex-wrap mb-4">
        <div role="tablist" aria-label="Día" className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {dates.map((dt, i) => {
            const on = selectedDate === dt
            return (
              <button key={dt} type="button" role="tab" aria-selected={on} onClick={() => selectDate(dt)}
                className={`shrink-0 w-14 sm:w-16 py-2 rounded-[11px] text-center cursor-pointer border transition-colors ${
                  on ? 'bg-brand text-base border-brand' : 'bg-transparent text-content border-border-strong hover:text-white'
                }`}>
                <span className="block text-[12px]">{i === 0 ? 'Hoy' : DAYS[dayGridIndex(dt)].abbr}</span>
                <span className="block font-condensed font-black text-[17px] mt-0.5">{Number(dt.slice(8))}</span>
              </button>
            )
          })}
        </div>
        <div className="hidden md:flex gap-3.5 flex-wrap text-[12px] text-soft" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm border border-border-strong bg-surface" />Libre</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-border-mid" />Ocupado</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-brand" />{canManage ? 'A bloquear' : 'Tu turno'}</span>
        </div>
      </div>

      {loading && <div className="h-[280px] rounded-xl bg-surface animate-pulse" aria-hidden="true" />}
      {error && <p className="m-0 text-sm text-danger">{error}</p>}

      {!loading && !error && !dayGrid.open && slots.length === 0 && (
        <p className="m-0 text-sm text-secondary">El club está cerrado este día.</p>
      )}

      {!loading && !error && dayGrid.open && slots.length === 0 && (
        <p className="m-0 text-sm text-secondary">No entra ningún turno de {club.slot_minutes} min en el horario de este día.</p>
      )}

      {!loading && !error && slots.length > 0 && (
        isDesktop
          ? <BookingGridDesktop {...sharedViewProps} />
          : <BookingFlowMobile {...sharedViewProps} />
      )}

      {confirming && selection && selectedCourt && (
        canManage ? (
          <BookingManualBlockModal
            club={club}
            courtId={selection.courtId}
            courtName={selectedCourt.name}
            date={selectedDate}
            slots={selectedSlots}
            court={selectedCourt}
            overlappingPendingCount={selectedOverlapGroupIds.size}
            onClose={() => setConfirming(false)}
            onBooked={handleBooked}
          />
        ) : (
          <BookingFormModal
            club={club}
            courtId={selection.courtId}
            courtName={selectedCourt.name}
            date={selectedDate}
            slots={selectedSlots}
            court={selectedCourt}
            contested={selectedOverlapGroupIds.size > 0}
            onClose={() => setConfirming(false)}
            onBooked={handleBooked}
          />
        )
      )}

      <div className="flex flex-wrap gap-4 mt-6 items-start">
        <ClubMyBookings club={club} refreshKey={bookedCount} />
        <section aria-labelledby="bk-how" className="flex-[1_1_360px] rounded-xl border border-border-mid bg-surface p-4 sm:p-5">
          <h2 id="bk-how" className="m-0 mb-3 font-condensed font-bold text-[15px] text-white">Cómo funciona</h2>
          <ul className="m-0 pl-4.5 list-disc flex flex-col gap-1.5 text-sm text-soft leading-relaxed">
            <li>{club.mp_connected ? 'Pagás online con Mercado Pago al reservar. El turno se confirma solo.' : 'Pedís el turno y el club lo confirma. Te avisamos por la app.'}</li>
            <li>Podés reservar hasta {MAX_SLOTS_PER_BOOKING / 2} h seguidas, con {HORIZON_DAYS} días de anticipación.</li>
            {grid.some((d) => d.open && d.to <= d.from) && <li>Los turnos después de medianoche aparecen en el día del club.</li>}
            <li>Si cancelás, el club recibe el aviso al instante.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
