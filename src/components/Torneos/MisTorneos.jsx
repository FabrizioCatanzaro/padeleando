import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Search, Loader2 } from 'lucide-react'
import { api } from '../../utils/api'
import { FORMAT_LABEL, FORMAT_CLS, ROLE_LABEL, roleOf, phaseOf, statusLine, detailLine } from '../../utils/tournamentList'
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

function Row({ t, phase, first }) {
  const role = roleOf(t)
  const status = statusLine(t, phase)
  return (
    <Link to={`/cat/${t.group_id}/torneo/${t.id}`}
      className={`flex items-center gap-3 sm:gap-4 px-3.5 sm:px-4 py-3.5 no-underline hover:bg-surface-alt transition-colors ${first ? '' : 'border-t border-border'}`}>
      <span className={`hidden sm:block w-22 shrink-0 font-sans text-[10px] font-extrabold tracking-wider ${FORMAT_CLS[t.format]}`}>{FORMAT_LABEL[t.format]}</span>
      <span className="flex-1 min-w-0">
        <span className={`sm:hidden block font-sans text-[9.5px] font-extrabold tracking-wider ${FORMAT_CLS[t.format]}`}>{FORMAT_LABEL[t.format]}</span>
        <span className="block font-sans font-bold text-[15px] text-white truncate">{t.name}</span>
        <span className="flex items-center gap-2 mt-1 min-w-0">
          <span className="shrink-0 max-w-[60%] truncate font-sans text-[11px] font-semibold text-content bg-surface-alt border border-border-mid rounded-md px-2 py-0.5">{t.group_name}</span>
          {t.club_name && <span className="font-sans text-[12px] text-secondary truncate">{t.club_name}</span>}
        </span>
        <span className="md:hidden flex items-center gap-1.5 mt-1 font-sans text-[12px]">
          <span className={`font-bold ${status.cls}`}>{status.text}</span>
          <span className="text-secondary truncate">· {detailLine(t)}</span>
        </span>
      </span>
      <span className="hidden md:block w-48 shrink-0">
        <span className={`block font-sans text-[12px] font-bold ${status.cls}`}>{status.text}</span>
        <span className="block font-sans text-[12px] text-secondary mt-0.5 truncate">{detailLine(t)}</span>
      </span>
      <span className="hidden sm:block w-34 shrink-0 text-right">
        <span className={`font-sans text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${ROLE_PILL[role]}`}>{ROLE_LABEL[role]}</span>
      </span>
      <ChevronRight size={16} className="text-dim shrink-0" />
    </Link>
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
                {shown.map((t, i) => <Row key={t.id} t={t} phase={s.id} first={i === 0} />)}
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
