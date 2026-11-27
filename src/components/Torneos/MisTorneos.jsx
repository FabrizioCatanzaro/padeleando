import { useEffect, useMemo, useState } from 'react'
import { Search, Loader2, Trophy } from 'lucide-react'
import { api } from '../../utils/api'
import { ROLE_LABEL, roleOf, phaseOf, detailLine } from '../../utils/tournamentList'
import { cardModel } from '../../utils/tournamentCard'
import TournamentRow from '../shared/tournament/TournamentRow'
import AdInline from '../shared/AdInline'
import AdRail from '../shared/AdRail'

const SECTIONS = [
  { id: 'en_curso',    title: 'EN CURSO' },
  { id: 'proximos',    title: 'PRÓXIMOS' },
  { id: 'finalizados', title: 'FINALIZADOS' },
]
const FINISHED_STEP = 5
const SELECT = 'h-10 px-3 rounded-lg border border-border-mid bg-surface text-content font-sans text-[13px] cursor-pointer outline-none focus:border-border-strong'
const ROLE_PILL = { jugas: 'text-content border-border-strong', organizas: 'text-cyan border-cyan/40', ambos: 'text-brand border-brand/40' }

function Row({ t, first }) {
  const role = roleOf(t)
  const m = cardModel(t)
  return (
    <TournamentRow
      m={m}
      to={`/cat/${t.group_id}/torneo/${t.id}`}
      first={first}
      meta={(
        <>
          <span className="shrink-0 max-w-[55%] truncate font-sans text-[11.5px] font-semibold text-content bg-surface-alt border border-border-mid rounded-md px-[7px] py-0.5">{t.group_name}</span>
          {t.club_name && <span className="truncate">{t.club_name}</span>}
        </>
      )}
      slot={t.won_final
        ? <span className="inline-flex items-center gap-1.5 font-bold text-brand"><Trophy size={14} aria-hidden="true" />Campeón</span>
        : <span className={t.my_registration && !t.plays ? 'text-content font-semibold' : 'text-secondary'}>{detailLine(t)}</span>}
      trailing={<span className={`font-sans text-[11.5px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${ROLE_PILL[role]}`}>{ROLE_LABEL[role]}</span>}
    />
  )
}

export default function MisTorneos() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [role, setRole] = useState('todos')
  const [format, setFormat] = useState('todos')
  const [group, setGroup] = useState('todas')
  const [q, setQ] = useState('')
  const [finishedShown, setFinishedShown] = useState(FINISHED_STEP)

  useEffect(() => {
    let cancelled = false
    api.me.tournaments()
      .then((d) => { if (!cancelled) setRows(d) })
      .catch((e) => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [])

  const groups = useMemo(() => {
    const m = new Map()
    for (const t of rows ?? []) m.set(t.group_id, t.group_name)
    return [...m].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])

  const sections = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = (rows ?? []).filter((t) => {
      if (role === 'juego' && !t.plays && !t.my_registration) return false
      if (role === 'organizo' && !t.manages) return false
      if (format !== 'todos' && t.format !== format) return false
      if (group !== 'todas' && t.group_id !== group) return false
      if (needle && !`${t.name} ${t.group_name} ${t.club_name ?? ''}`.toLowerCase().includes(needle)) return false
      return true
    })
    const by = { en_curso: [], proximos: [], finalizados: [] }
    for (const t of list) by[phaseOf(t)].push(t)
    by.proximos.reverse()
    return by
  }, [rows, role, format, group, q])

  if (error) return <p className="font-sans text-[13px] text-danger">{error}</p>
  if (!rows) return <div className="min-h-[50vh] flex justify-center pt-10"><Loader2 size={20} className="animate-spin text-muted" /></div>
  if (rows.length === 0) return (
    <p className="font-sans text-[13px] text-secondary min-h-[40vh]">Todavía no jugás ni organizás torneos. Anotate a uno desde Explorar o creá una categoría.</p>
  )

  const total = SECTIONS.reduce((n, s) => n + sections[s.id].length, 0)

  return (
    <AdRail>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <div role="group" aria-label="Rol" className="flex p-0.5 rounded-lg border border-border-mid bg-surface">
            {[['todos', 'Todos'], ['juego', 'Juego'], ['organizo', 'Organizo']].map(([id, label]) => (
              <button key={id} type="button" aria-pressed={role === id} onClick={() => setRole(id)}
                className={`h-9 px-3.5 rounded-md border-0 font-sans text-[12.5px] cursor-pointer transition-colors ${role === id ? 'bg-white text-(color:--color-base) font-bold' : 'bg-transparent text-content font-semibold hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="mt-formato">Formato</label>
          <select id="mt-formato" className={SELECT} value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="todos">Formato: todos</option>
            <option value="liga">Liga</option>
            <option value="americano">Americano</option>
            <option value="copa">Copa</option>
          </select>
          {groups.length > 1 && (
            <>
              <label className="sr-only" htmlFor="mt-categoria">Categoría</label>
              <select id="mt-categoria" className={`${SELECT} max-w-56`} value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="todas">Categoría: todas</option>
                {groups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </>
          )}
          <label className="relative flex-1 min-w-44 sm:max-w-64 sm:ml-auto">
            <span className="sr-only">Buscar en mis torneos</span>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en mis torneos"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-border-mid bg-surface text-white font-sans text-[13px] outline-none placeholder:text-muted focus:border-border-strong" />
          </label>
        </div>

        {total === 0 && <p className="font-sans text-[13px] text-secondary">No hay torneos con estos filtros.</p>}

        {SECTIONS.map((s) => {
          const list = sections[s.id]
          if (list.length === 0) return null
          const shown = s.id === 'finalizados' ? list.slice(0, finishedShown) : list
          return (
            <section key={s.id} aria-labelledby={`mt-${s.id}`}>
              <div className="flex items-baseline gap-2 mb-2.5">
                <h2 id={`mt-${s.id}`} className="m-0 font-sans text-[11px] font-bold tracking-[2px] text-muted">{s.title}</h2>
                <span className="font-sans text-[11px] text-muted">{list.length}</span>
              </div>
              <div className="rounded-xl bg-surface border border-border overflow-hidden">
                {shown.map((t, i) => <Row key={t.id} t={t} first={i === 0} />)}
              </div>
              {shown.length < list.length && (
                <button type="button" onClick={() => setFinishedShown((n) => n + FINISHED_STEP * 4)}
                  className="mt-2.5 min-h-11 bg-transparent border-0 p-0 font-sans text-[13px] font-bold text-brand cursor-pointer hover:underline">
                  Ver {Math.min(FINISHED_STEP * 4, list.length - shown.length)} finalizados más
                </button>
              )}
            </section>
          )
        })}
        <AdInline className="mt-4" />
      </div>
    </AdRail>
  )
}
