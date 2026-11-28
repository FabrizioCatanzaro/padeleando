import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { api } from '../../../utils/api'
import { businessDaySlots, businessToday, addDaysStr, shortDayLabel } from '../scheduleGrid'
import { freeStartTimes } from '../freeSlots'

const MAX = 10

// Próximos horarios libres del día del club; reserva su alto mientras carga
export default function ClubFreeToday({ club, grid, courts, onReservar }) {
  const day = useMemo(() => businessToday(grid), [grid])
  const [bookings, setBookings] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.clubs.bookings.list(club.id, day, addDaysStr(day, 1))
      .then((rows) => { if (!cancelled) setBookings(rows) })
      .catch(() => { if (!cancelled) setBookings([]) })
    return () => { cancelled = true }
  }, [club.id, day])

  const free = useMemo(() => {
    if (!bookings) return null
    const ids = courts.map((c) => ({ id: c.id }))
    return freeStartTimes(businessDaySlots(grid, day, club.slot_minutes), ids, bookings)
  }, [bookings, grid, day, club.slot_minutes, courts])

  return (
    <section aria-labelledby="club-free" className="rounded-xl border border-border-mid bg-surface p-4 sm:p-5 flex flex-col gap-3.5 min-h-[150px]">
      <div className="flex justify-between items-baseline gap-3 flex-wrap">
        <h2 id="club-free" className="m-0 font-condensed font-bold text-[15px] text-white">Turnos libres hoy</h2>
        <span className="text-[13px] text-secondary">{courts.length} {courts.length === 1 ? 'cancha' : 'canchas'}</span>
      </div>
      {free == null && <div className="h-10 rounded-full bg-surface-alt animate-pulse" aria-hidden="true" />}
      {free?.length === 0 && <p className="m-0 text-sm text-secondary">No quedan turnos libres hoy. Fijate otro día en la grilla.</p>}
      {free?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {free.slice(0, MAX).map((s) => (
            <button key={`${s.date} ${s.time}`} type="button" onClick={onReservar}
              className="inline-flex items-center gap-1.5 min-h-10 rounded-full border border-border-strong px-3.5 text-[13px] font-semibold text-white bg-transparent cursor-pointer hover:border-brand">
              {s.time}
              {s.nextDay && <span className="text-[11px] font-normal text-brand">{shortDayLabel(s.date)}</span>}
              <span className="font-normal text-secondary" aria-label={`${s.free} libres`}>{s.free}</span>
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={onReservar}
        className="self-start inline-flex items-center gap-1.5 text-sm font-bold text-brand bg-transparent border-0 p-0 cursor-pointer hover:underline">
        Ver la grilla completa y reservar<ChevronRight size={15} aria-hidden="true" />
      </button>
    </section>
  )
}
