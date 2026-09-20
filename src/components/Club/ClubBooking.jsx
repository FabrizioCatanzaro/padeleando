import { useEffect, useMemo, useState } from 'react'
import { api } from '../../utils/api'
import { parseScheduleToGrid, slotsForRange, DAYS } from './scheduleGrid'
import { pendingGroupIdsFor } from './bookingAvailability'
import BookingGridDesktop from './BookingGridDesktop'
import BookingFlowMobile from './BookingFlowMobile'
import BookingFormModal from './BookingFormModal'
import BookingManualBlockModal from './BookingManualBlockModal'

const HORIZON_DAYS = 7
const MAX_SLOTS_PER_BOOKING = 8 // igual al tope del backend (routes/clubs.js)

// Etiquetas duplicadas de ClubInfo y ClubCourtsManager (son de UI)
const FLOOR_LABEL = { cesped_sintetico: 'Césped sintético', cesped_natural: 'Césped natural', cemento: 'Cemento' };
const WALL_LABEL  = { cemento: 'Paredes de cemento', cristal: 'Paredes de cristal' };
function courtSummary(c) {
  return [
    c.floor_type ? FLOOR_LABEL[c.floor_type] : null,
    c.wall_type ? WALL_LABEL[c.wall_type] : null,
    c.covered ? 'Techada' : null,
    c.lit ? 'Con iluminación' : null,
    c.external_play ? 'Juego exterior' : null,
  ].filter(Boolean);
}

function todayLocalStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDaysStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
// Índice de DAYS (lun=0) para una fecha YYYY-MM-DD
function dayGridIndex(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return (new Date(y, m - 1, d).getDay() + 6) % 7
}
function dayLabel(dateStr, i) {
  if (i === 0) return 'Hoy'
  if (i === 1) return 'Mañana'
  const [, , d] = dateStr.split('-').map(Number)
  return `${DAYS[dayGridIndex(dateStr)].abbr} ${d}`
}

// Reserva pública: requiere horario en grilla; escritorio usa grilla y mobile dos pasos
export default function ClubBooking({ club, canManage = false }) {
  const grid = useMemo(() => parseScheduleToGrid(club.schedule), [club.schedule])
  const dates = useMemo(
    () => Array.from({ length: HORIZON_DAYS }, (_, i) => addDaysStr(todayLocalStr(), i)),
    [],
  )
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
      }))
    }
    return [{
      id: null,
      name: null,
      displayName: 'Turnos disponibles',
      price_30: null,
      price_60: null,
      summary: 'Turnos de 30 min en adelante',
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

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.clubs.bookings.list(club.id, dates[0], dates[dates.length - 1])
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
  const slots = dayGrid.open ? slotsForRange(dayGrid.from, dayGrid.to, club.slot_minutes) : []

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
    setSelection(null)
    setConfirming(false)
  }

  const selectedCourt = selection ? effectiveCourts.find((c) => c.id === selection.courtId) : null
  const selectedSlots = selection ? slots.slice(selection.startIndex, selection.startIndex + selection.count) : []
  const selectedOverlapGroupIds = selection
    ? pendingGroupIdsFor(bookings, selectedDate, selection.courtId, selectedSlots)
    : new Set()

  const sharedViewProps = {
    club,
    courts: effectiveCourts,
    slots,
    selectedDate,
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
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
        {dates.map((dt, i) => (
          <button key={dt} type="button" onClick={() => selectDate(dt)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-condensed font-bold tracking-wide border cursor-pointer transition-colors ${
              selectedDate === dt ? 'bg-brand text-base border-brand' : 'bg-transparent text-muted border-border-mid hover:text-white'
            }`}>
            {dayLabel(dt, i)}
          </button>
        ))}
      </div>

      {loading && <p className="text-xs font-mono text-dim">Cargando turnos...</p>}
      {error && <p className="text-xs font-mono text-danger">{error}</p>}

      {!loading && !error && !dayGrid.open && (
        <p className="text-[12.5px] text-dim">El club está cerrado este día.</p>
      )}

      {!loading && !error && dayGrid.open && slots.length === 0 && (
        <p className="text-[12.5px] text-dim">No entra ningún turno de {club.slot_minutes} min en el horario de este día.</p>
      )}

      {!loading && !error && dayGrid.open && slots.length > 0 && (
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
    </div>
  )
}
