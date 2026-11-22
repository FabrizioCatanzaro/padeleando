import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Navigation, CalendarDays, Check, ChevronRight, Loader2, Search } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DATE_FILTERS, dateRange, teamNames, setsText } from '../../utils/friendlies'
import Btn from '../shared/Btn'
import FriendlyCard from './FriendlyCard'
import SectionTabs from '../Shell/SectionTabs'

const RADIUS_KM = 15
const SELECT = 'h-9 pl-8 pr-3 rounded-full border border-border-mid bg-surface text-content text-[12.5px] font-sans cursor-pointer appearance-none outline-none focus:border-border-strong'

const STATUS_ORDER = { falta_resultado: 0, por_confirmar: 1, abierto: 2, completo: 3, confirmado: 4, vencido: 5, cancelado: 6 }

function bandText(m) {
  const me = m.viewer?.team
  if (m.status === 'falta_resultado') return { title: 'Cargá el resultado', sub: `${m.club.name} · ${m.date.slice(8)}/${m.date.slice(5, 7)} ${m.start_time}` }
  const rivals = teamNames(m.players, me === 1 ? 2 : 1)
  return { title: `Confirmá el resultado${rivals ? ` vs. ${rivals}` : ''}`, sub: `${m.club.name} · ${setsText(m.pending?.sets ?? [])}` }
}

export default function FriendliesView({ tab: tabProp = 'abiertos' }) {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const { showToast } = useToast()
  const tab = tabProp === 'mios' && isLoggedIn ? 'mios' : 'abiertos'
  useDocumentTitle(tab === 'mios' ? 'Mis partidos' : 'Partidos')

  const [coords, setCoords]         = useState(null)
  const [locating, setLocating]     = useState(false)
  const [dateId, setDateId]         = useState('todas')
  const [clubQ, setClubQ]           = useState('')
  const [clubFilter, setClubFilter] = useState('')
  const [list, setList]             = useState(null)
  const [mine, setMine]             = useState(null)
  const [error, setError]           = useState(null)

  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    api.friendlies.mine()
      .then((rows) => { if (!cancelled) setMine(rows) })
      .catch(() => { if (!cancelled) setMine([]) })
    return () => { cancelled = true }
  }, [isLoggedIn])

  useEffect(() => {
    const t = setTimeout(() => setClubFilter(clubQ.trim()), 300)
    return () => clearTimeout(t)
  }, [clubQ])

  useEffect(() => {
    let cancelled = false
    const { from, to } = dateRange(dateId)
    api.friendlies.list({
      lat: coords?.lat, lon: coords?.lon, radius_km: coords ? RADIUS_KM : null,
      from, to, club: clubFilter || null,
    })
      .then((rows) => { if (!cancelled) { setList(rows); setError(null) } })
      .catch((e) => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [coords, dateId, clubFilter])

  const pendientes = useMemo(() => (mine ?? []).filter((m) => m.viewer?.needs_action), [mine])
  const mineSorted = useMemo(() => [...(mine ?? [])].sort((a, b) => {
    const s = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    return s !== 0 ? s : `${b.date} ${b.start_time}`.localeCompare(`${a.date} ${a.start_time}`)
  }), [mine])

  function toggleNear() {
    if (coords) { setCoords(null); return }
    if (!navigator.geolocation) { showToast('Tu navegador no comparte la ubicación.', 'error'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => { setCoords({ lat: c.latitude, lon: c.longitude }); setLocating(false) },
      () => { setLocating(false); showToast('No pudimos usar tu ubicación. Revisá el permiso del navegador.', 'error') },
      { timeout: 10000, maximumAge: 600000 },
    )
  }

  const crear = () => navigate(isLoggedIn ? '/amistosos/nuevo' : `/login?redirect=${encodeURIComponent('/amistosos/nuevo')}`)
  const band = pendientes[0]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-7 pt-6 sm:pt-8 pb-10 font-sans">
      <SectionTabs
        title="Partidos"
        tabs={isLoggedIn
          ? [{ label: 'Explorar', to: '/partidos', end: true }, { label: 'Mis partidos', to: '/partidos/mios', badge: pendientes.length }]
          : [{ label: 'Explorar', to: '/partidos', end: true }]}
        action={<Btn variant="primary" icon={Plus} onClick={crear}>AMISTOSO</Btn>}
      />

      {band && (
        <Link to={`/amistoso/${band.id}`}
          className="flex items-center gap-3 p-3.5 mb-5 rounded-lg bg-brand/10 border border-brand/40 no-underline hover:border-brand transition-colors">
          <span className="w-9 h-9 shrink-0 rounded-full bg-brand text-base flex items-center justify-center"><Check size={18} strokeWidth={2.5} /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] tracking-[0.16em] text-brand font-bold">TE TOCA{pendientes.length > 1 ? ` · ${pendientes.length} PENDIENTES` : ''}</span>
            <span className="block text-[14px] text-white font-semibold truncate">{bandText(band).title}</span>
            <span className="block text-[12px] text-soft truncate">{bandText(band).sub}</span>
          </span>
          <ChevronRight size={18} className="text-brand shrink-0" />
        </Link>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        {tab === 'abiertos' && (
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={Boolean(coords)} onClick={toggleNear}
              className={`h-9 px-3 rounded-full border text-[12.5px] font-sans inline-flex items-center gap-1.5 cursor-pointer transition-colors ${coords ? 'bg-brand/10 border-brand text-brand font-semibold' : 'bg-surface border-border-mid text-content hover:text-white'}`}>
              {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
              {coords ? `Cerca de mí · ${RADIUS_KM} km` : 'Cerca de mí'}
            </button>
            <label className="relative inline-flex items-center">
              <span className="sr-only">Buscar por club</span>
              <Search size={13} className="absolute left-3 text-content pointer-events-none" aria-hidden="true" />
              <input type="search" value={clubQ} onChange={(e) => setClubQ(e.target.value)} placeholder="Club" maxLength={60}
                className={`h-9 w-36 sm:w-44 pl-8 pr-3 rounded-full border text-[12.5px] font-sans outline-none transition-colors placeholder:text-muted ${clubFilter ? 'bg-brand/10 border-brand text-white' : 'bg-surface border-border-mid text-content focus:border-border-strong'}`} />
            </label>
            <label className="relative inline-flex items-center">
              <span className="sr-only">Fecha</span>
              <CalendarDays size={13} className="absolute left-3 text-content pointer-events-none" aria-hidden="true" />
              <select value={dateId} onChange={(e) => setDateId(e.target.value)} className={SELECT}>
                {DATE_FILTERS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      {tab === 'abiertos' && (
        <ListBlock rows={list} error={error}
          empty={coords || dateId !== 'todas' || clubFilter
            ? 'No hay partidos abiertos con estos filtros.'
            : 'No hay partidos abiertos por ahora. Creá uno y pasá el link.'} />
      )}
      {tab === 'mios' && <ListBlock rows={mine && mineSorted} showStatus empty="Todavía no jugaste amistosos. Creá uno o sumate a uno abierto." />}
    </div>
  )
}

function ListBlock({ rows, error, empty, showStatus = false }) {
  if (error) return <p className="text-[13px] text-danger">{error}</p>
  if (!rows) return <div className="min-h-[60vh] flex justify-center pt-10"><Loader2 size={20} className="animate-spin text-muted" /></div>
  if (rows.length === 0) return <p className="text-[13px] text-secondary min-h-[40vh]">{empty}</p>
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((m) => <FriendlyCard key={m.id} m={m} showStatus={showStatus} />)}
    </div>
  )
}
