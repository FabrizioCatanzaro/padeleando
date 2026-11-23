import { Link } from 'react-router-dom'
import { Check, ClipboardList, PencilLine, ChevronRight } from 'lucide-react'
import { setsText } from '../../../utils/friendlies'
import { shortDay } from '../../../utils/agenda'

const TONE = { brand: 'bg-brand/10 text-brand', cyan: 'bg-cyan/10 text-cyan' }

function friendlyRow(f) {
  const when = [shortDay(f.day), f.time, f.club_name].filter(Boolean).join(' · ')
  if (f.kind === 'cargar') {
    return { key: `f${f.id}`, icon: PencilLine, tone: 'brand', title: 'Cargá el resultado del amistoso', sub: when, to: `/amistoso/${f.id}`, cta: 'Cargar' }
  }
  const sets = setsText(f.proposed_sets ?? [])
  return { key: `f${f.id}`, icon: Check, tone: 'brand', title: 'Confirmá el resultado del amistoso', sub: sets ? `${when} · propusieron ${sets}` : when, to: `/amistoso/${f.id}`, cta: 'Revisar' }
}

function registrationRow(r) {
  return {
    key: `r${r.id}`, icon: ClipboardList, tone: 'cyan',
    title: `${r.count} ${r.count === 1 ? 'inscripción' : 'inscripciones'} por aprobar`,
    sub: r.name, to: `/cat/${r.group_id}/torneo/${r.id}?tab=registrations`, cta: 'Revisar',
  }
}

export default function Pendientes({ friendlies = [], registrations = [] }) {
  const rows = [...friendlies.map(friendlyRow), ...registrations.map(registrationRow)]
  if (rows.length === 0) return null

  return (
    <section className="mb-7" aria-labelledby="pendientes-title">
      <h2 id="pendientes-title" className="m-0 mb-3 font-sans text-[11px] font-bold tracking-[2px] text-muted">PENDIENTES</h2>
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const Icon = r.icon
          return (
            <Link key={r.key} to={r.to}
              className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-surface border border-border-mid no-underline hover:border-border-strong transition-colors">
              <span className={`w-9 h-9 shrink-0 rounded-[10px] flex items-center justify-center ${TONE[r.tone]}`}>
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-sans font-bold text-[14px] text-white">{r.title}</span>
                <span className="block font-sans text-[12px] text-secondary mt-0.5 truncate">{r.sub}</span>
              </span>
              <span className="hidden sm:inline font-sans font-bold text-[12px] text-brand">{r.cta}</span>
              <ChevronRight size={16} className="text-dim shrink-0" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
