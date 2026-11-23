import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import AgendaList from '../../shared/AgendaList'
import { Skeleton } from '../../shared/Skeleton'

const MAX_ROWS = 5

export default function Agenda({ items }) {
  const loading = items == null
  const rows = (items ?? []).slice(0, MAX_ROWS)

  return (
    <section className="mb-7" aria-labelledby="agenda-title">
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="agenda-title" className="m-0 font-sans text-[11px] font-bold tracking-[2px] text-muted">TU AGENDA</h2>
        <Link to="/partidos/mios" className="font-sans text-[12px] font-bold text-brand no-underline hover:underline">Ver mis partidos →</Link>
      </div>

      {loading && <Skeleton className="h-[188px] w-full rounded-xl" />}

      {!loading && rows.length === 0 && (
        <div className="flex items-center gap-3.5 px-4 py-4 rounded-xl bg-surface border border-border">
          <CalendarDays size={20} className="text-dim shrink-0" />
          <p className="m-0 flex-1 font-sans text-[13px] text-soft">No tenés partidos en las próximas dos semanas.</p>
          <Link to="/partidos" className="font-sans text-[12px] font-bold text-brand no-underline hover:underline whitespace-nowrap">Buscar partido</Link>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <AgendaList items={rows} />
      )}
    </section>
  )
}
