import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { dayParts, ROUND_LABEL } from '../../utils/agenda'

const TAG = {
  partido_torneo: { label: 'TORNEO',   cls: 'text-cyan' },
  torneo:         { label: 'TORNEO',   cls: 'text-cyan' },
  amistoso:       { label: 'AMISTOSO', cls: 'text-brand' },
}

function title(it) {
  if (it.kind === 'amistoso') return it.status === 'abierto' ? 'Partido abierto' : 'Amistoso'
  const round = it.round ? ` · ${ROUND_LABEL[it.round] ?? it.round}` : ''
  return `${it.tournament?.name ?? 'Torneo'}${round}`
}

function detail(it) {
  return [
    it.time,
    it.club_name,
    it.court != null && `Cancha ${it.court}`,
    it.rivals && `vs ${it.rivals}`,
    it.kind === 'torneo' && it.tournament?.group_name,
  ].filter(Boolean).join(' · ')
}

function pill(it) {
  if (it.kind === 'torneo') return { text: 'Anotado', cls: 'text-green border-green/40' }
  if (it.kind === 'amistoso' && it.status === 'abierto') {
    return { text: it.missing === 1 ? 'Falta 1' : `Faltan ${it.missing}`, cls: 'text-brand border-brand/45' }
  }
  if (it.kind === 'amistoso') return { text: 'Completo', cls: 'text-content border-border-strong' }
  return { text: 'Programado', cls: 'text-content border-border-strong' }
}

// Filas de agenda (partidos de torneo, cuadro, amistosos y torneos anotados). Las usan Inicio y Mis partidos.
export default function AgendaList({ items }) {
  return (
    <div className="rounded-xl bg-surface border border-border overflow-hidden">
      {items.map((it, i) => {
        const { dow, num } = dayParts(it.date)
        const tag = TAG[it.kind]
        const p = pill(it)
        return (
          <Link key={it.id} to={it.href}
            className={`flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 no-underline hover:bg-surface-alt transition-colors ${i > 0 ? 'border-t border-border' : ''}`}>
            <span className="w-10 sm:w-12 shrink-0 text-center">
              <span className="block font-sans text-[9.5px] font-bold tracking-wider text-muted">{dow}</span>
              <span className="block font-condensed font-bold text-[17px] text-white leading-tight">{num}</span>
            </span>
            <span className="w-px self-stretch bg-border hidden sm:block" />
            <span className="flex-1 min-w-0">
              <span className={`block font-sans text-[9.5px] font-extrabold tracking-wider ${tag.cls}`}>{tag.label}</span>
              <span className="block font-sans font-bold text-[14px] text-white truncate">{title(it)}</span>
              <span className="block font-sans text-[12px] text-secondary truncate">{detail(it)}</span>
            </span>
            <span className={`shrink-0 font-sans text-[11px] font-bold px-2.5 py-1 rounded-full border ${p.cls}`}>{p.text}</span>
            <ChevronRight size={16} className="text-dim shrink-0 hidden sm:block" />
          </Link>
        )
      })}
    </div>
  )
}
