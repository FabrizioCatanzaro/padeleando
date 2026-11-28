import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react'
import { api } from '../../utils/api'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { categoryRows, organizerRows } from '../../utils/clubPage'
import { FORMAT_META } from '../../utils/tournamentCard'
import { STATES, filterTournaments, countByState, groupByMonth, filterOptions } from '../../utils/clubTournaments'
import { ClubTournamentRow } from './Resumen/ClubEvents'
import ClubTile from '../shared/ClubTile'
import AdBanner from '../shared/AdBanner'
import AdInline from '../shared/AdInline'
import Loader from '../Loader/Loader'
import LazyNotFound from '../NotFound/LazyNotFound'

const PAGE = 10
const SELECT = 'h-10 bg-surface border border-border-strong rounded-lg text-white text-[13px] font-sans pl-3 pr-8 cursor-pointer'
const monthTitle = (key) => {
  const [y, m] = key.split('-').map(Number)
  const s = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function Select({ label, value, onChange, children }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT}>{children}</select>
    </label>
  )
}

// Todos los torneos públicos jugados en el club, con filtros; reemplaza las pestañas Agenda y Categorías
export default function ClubTournamentsView() {
  const { id } = useParams()
  const [club, setClub] = useState(null)
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)
  const [f, setF] = useState({ estado: 'todos', formato: '', grupo: '', organizador: '', anio: '' })
  const [shown, setShown] = useState(PAGE)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.clubs.get(id), api.clubs.events(id)])
      .then(([c, e]) => { if (!cancelled) { setClub(c); setEvents(e) } })
      .catch((e) => { if (!cancelled) setError(e.status === 404 ? 'notfound' : e.message) })
    return () => { cancelled = true }
  }, [id])

  useDocumentTitle(club ? `Torneos en ${club.name}` : 'Torneos del club')

  const todos = useMemo(() => (events ? [...events.ongoing, ...events.upcoming, ...events.past] : []), [events])
  const options = useMemo(() => filterOptions(todos), [todos])
  const list = useMemo(() => filterTournaments(todos, f), [todos, f])
  const counts = useMemo(() => countByState(todos, f), [todos, f])
  const categorias = useMemo(() => categoryRows(todos), [todos])
  const organizadores = useMemo(() => organizerRows(todos), [todos])
  const groups = groupByMonth(list.slice(0, shown))

  if (error === 'notfound') return <LazyNotFound subject="club" />
  if (error) return <p className="text-danger text-sm p-6">{error}</p>
  if (!club || !events) return <Loader minHeight="100vh" />

  const set = (patch) => { setF((x) => ({ ...x, ...patch })); setShown(PAGE) }
  const since = club.created_at ? new Date(club.created_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : null

  return (
    <div className="bg-base text-content font-sans px-4 sm:px-7 pt-6 pb-16 min-h-screen">
      <Link to={`/club/${club.id}`} className="inline-flex items-center gap-2.5 text-sm text-content no-underline hover:text-white">
        <ChevronLeft size={16} aria-hidden="true" />
        <span className="w-8 h-8 rounded-lg bg-surface border border-border-mid overflow-hidden flex items-center justify-center">
          {club.photo_url ? <img src={club.photo_url} alt="" width="32" height="32" className="w-full h-full object-contain" /> : <Building2 size={15} className="text-border-strong" />}
        </span>
        {club.name}
      </Link>
      <h1 className="m-0 mt-5 font-condensed font-black text-[26px] sm:text-[30px] text-white">Torneos en el club</h1>
      <p className="m-0 mt-1.5 text-sm text-secondary">
        {[`${todos.length} ${todos.length === 1 ? 'torneo' : 'torneos'}`, since && `desde ${since}`,
          `${categorias.length} ${categorias.length === 1 ? 'categoría' : 'categorías'}`,
          `${organizadores.length} ${organizadores.length === 1 ? 'organizador' : 'organizadores'}`].filter(Boolean).join(' · ')}
      </p>

      <div className="flex flex-wrap gap-7 mt-6 items-start">
        <div className="flex-[999_1_520px] min-w-0">
          <div role="tablist" aria-label="Estado" className="flex gap-1.5 flex-wrap">
            {STATES.map((s) => (
              <button key={s.id} type="button" role="tab" aria-selected={f.estado === s.id} onClick={() => set({ estado: s.id })}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold cursor-pointer border ${
                  f.estado === s.id ? 'bg-brand text-base border-brand' : 'bg-transparent text-content border-border-strong hover:text-white'
                }`}>
                {s.label}<span className="opacity-70">{counts[s.id]}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap mt-3">
            {options.formatos.length > 1 && (
              <Select label="Formato" value={f.formato} onChange={(v) => set({ formato: v })}>
                <option value="">Todos los formatos</option>
                {options.formatos.map((x) => <option key={x} value={x}>{FORMAT_META[x]?.label ?? x}</option>)}
              </Select>
            )}
            {options.grupos.length > 1 && (
              <Select label="Categoría" value={f.grupo} onChange={(v) => set({ grupo: v })}>
                <option value="">Todas las categorías</option>
                {options.grupos.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </Select>
            )}
            {options.organizadores.length > 1 && (
              <Select label="Organizador" value={f.organizador} onChange={(v) => set({ organizador: v })}>
                <option value="">Todos los organizadores</option>
                {options.organizadores.map((u) => <option key={u} value={u}>@{u}</option>)}
              </Select>
            )}
            {options.anios.length > 1 && (
              <Select label="Año" value={f.anio} onChange={(v) => set({ anio: v })}>
                <option value="">Todos los años</option>
                {options.anios.map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            )}
          </div>

          {list.length === 0 && (
            <p className="m-0 mt-8 text-sm text-secondary">
              {todos.length ? 'Ningún torneo coincide con los filtros.' : 'Todavía no se jugaron torneos públicos en este club.'}
            </p>
          )}

          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`m-${g.key}`} className="mt-7">
              <h2 id={`m-${g.key}`} className="m-0 mb-2.5 pb-2 border-b border-border font-condensed font-bold text-[13px] text-soft">{monthTitle(g.key)}</h2>
              <div className="rounded-xl border border-border-mid bg-surface overflow-hidden">
                {g.items.map((t, i) => <ClubTournamentRow key={t.id} t={t} first={i === 0} />)}
              </div>
            </section>
          ))}

          {list.length > 0 && (
            <div className="flex flex-col items-center gap-2.5 mt-8">
              <span className="text-[13px] text-secondary">Mostrando {Math.min(shown, list.length)} de {list.length}</span>
              {shown < list.length && (
                <button type="button" onClick={() => setShown((n) => n + PAGE)}
                  className="h-11 px-5 rounded-[10px] border border-border-strong bg-transparent text-white text-sm font-bold cursor-pointer hover:border-soft">
                  Cargar {Math.min(PAGE, list.length - shown)} más
                </button>
              )}
            </div>
          )}
        </div>

        <aside aria-label="Categorías del club" className="flex-[1_1_280px] min-w-0 lg:max-w-[300px] flex flex-col gap-3.5">
          {categorias.length > 0 && (
            <section aria-labelledby="club-cats" className="rounded-xl border border-border-mid bg-surface p-4 sm:p-5">
              <h2 id="club-cats" className="m-0 mb-1.5 font-condensed font-bold text-[13px] text-white">Categorías que juegan acá</h2>
              {categorias.map((c) => (
                <Link key={c.id} to={`/cat/${c.id}`} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 no-underline group">
                  <ClubTile emojis={c.emojis} name={c.name} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white truncate group-hover:text-brand">{c.name}</span>
                    <span className="block text-[12px] text-secondary truncate">{[c.owner_username && `@${c.owner_username}`, `${c.jornadas} ${c.jornadas === 1 ? 'torneo' : 'torneos'}`].filter(Boolean).join(' · ')}</span>
                  </span>
                  <ChevronRight size={15} className="text-dim shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </section>
          )}
          <div className="hidden xl:block"><AdBanner /></div>
        </aside>
        <AdInline className="w-full" />
      </div>
    </div>
  )
}
