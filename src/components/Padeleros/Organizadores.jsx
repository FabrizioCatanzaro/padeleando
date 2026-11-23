import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import { useGeolocation } from '../../hooks/useGeolocation'
import PlayerAvatar from '../shared/PlayerAvatar'
import { shortDay, dayKey } from '../../utils/agenda'
import { FollowButton, Spinner, SECTION_TITLE } from './parts'

function lastLine(o, today) {
  if (!o.last_day) return null
  return o.last_day > today ? `Próximo torneo: ${shortDay(o.last_day)}` : `Último torneo: ${shortDay(o.last_day)}`
}

function OrganizerCard({ o, canFollow, today }) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl border border-border-mid bg-surface">
      <Link to={`/u/${o.username}`} className="flex items-center gap-3 no-underline group">
        <PlayerAvatar name={o.name} src={o.avatar_url} size={48} />
        <span className="flex-1 min-w-0">
          <span className="block font-sans font-bold text-[14px] text-white truncate group-hover:text-brand transition-colors">{o.name}</span>
          <span className="block font-sans text-[12px] text-secondary truncate">@{o.username}</span>
        </span>
        {o.distance_km != null && <span className="shrink-0 font-sans text-[11px] font-bold text-content">a {Number(o.distance_km).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km</span>}
      </Link>
      <p className="m-0 font-sans text-[12px] text-secondary truncate">{[o.group_name, o.clubs?.join(' y ')].filter(Boolean).join(' · ')}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 font-sans text-[12px] text-secondary">
        <span><b className="text-white">{o.categories}</b> {o.categories === 1 ? 'categoría' : 'categorías'}</span>
        <span><b className="text-white">{o.tournaments}</b> {o.tournaments === 1 ? 'torneo' : 'torneos'} en 90 días</span>
      </div>
      {lastLine(o, today) && <p className="m-0 font-sans text-[12px] font-bold text-white">{lastLine(o, today)}</p>}
      <div className="flex gap-2 mt-auto">
        {canFollow && <FollowButton username={o.username} initial={o.is_following} className="flex-1" />}
        <Link to={`/u/${o.username}`} className="flex-1 h-9 rounded-lg border border-border-strong text-content font-sans text-[12px] font-bold inline-flex items-center justify-center no-underline hover:text-white">Ver perfil</Link>
      </div>
    </div>
  )
}

export default function Organizadores() {
  const { isLoggedIn } = useAuth()
  const [geo, locate] = useGeolocation()
  const [near, setNear] = useState(false)
  const [result, setResult] = useState({ key: null, rows: null })
  const coords = near && geo.status === 'done' ? geo.coords : null
  const key = coords ? `${coords.lat},${coords.lon}` : 'all'

  useEffect(() => {
    let cancelled = false
    const [lat, lon] = key === 'all' ? [] : key.split(',')
    api.padeleros.organizers(lat, lon)
      .then((rows) => { if (!cancelled) setResult({ key, rows }) })
      .catch(() => { if (!cancelled) setResult({ key, rows: [] }) })
    return () => { cancelled = true }
  }, [key])

  function toggleNear() {
    const next = !near
    setNear(next)
    if (next && geo.status !== 'done') locate()
  }

  const rows = result.key === key ? result.rows : null
  const today = dayKey()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" aria-pressed={near} onClick={toggleNear}
          className={`h-10 px-3.5 rounded-lg font-sans text-[12.5px] font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors ${near ? 'border border-brand/50 bg-brand/10 text-brand' : 'border border-border-mid bg-surface text-content hover:text-white'}`}>
          <MapPin size={14} />Cerca de mí
        </button>
        {near && geo.status === 'loading' && <span className="font-sans text-[12px] text-secondary">Buscando tu ubicación…</span>}
        {near && geo.status === 'denied' && <span className="font-sans text-[12px] text-secondary">Sin permiso de ubicación: ordenamos por actividad.</span>}
        <span className="sm:ml-auto font-sans text-[12px] text-secondary">Con categorías públicas y un torneo en los últimos 90 días</span>
      </div>
      <section aria-labelledby="pd-orgs">
        <h2 id="pd-orgs" className={`${SECTION_TITLE} mb-3`}>{coords ? 'ORGANIZADORES CERCA' : 'ORGANIZADORES ACTIVOS'}</h2>
        {rows === null && <Spinner />}
        {rows?.length === 0 && <p className="m-0 font-sans text-[13px] text-secondary">No hay organizadores activos en los últimos 90 días.</p>}
        {rows?.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((o) => <OrganizerCard key={o.id} o={o} canFollow={isLoggedIn} today={today} />)}
          </div>
        )}
      </section>
    </div>
  )
}
