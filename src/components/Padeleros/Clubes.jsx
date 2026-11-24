import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapPin, Search } from 'lucide-react'
import { api } from '../../utils/api'
import { useGeolocation } from '../../hooks/useGeolocation'
import { whatsappLink } from '../Club/clubForm'
import courtBg from '../../assets/padelcourt.webp'
import ClubLogo from '../shared/ClubLogo'
import { Spinner, SECTION_TITLE, FIELD } from './parts'
import AdRail from '../shared/AdRail'

const cld = (src, w) => (src?.includes('/upload/') ? src.replace('/upload/', `/upload/f_auto,q_auto,w_${w},c_limit/`) : src)

function courtsText(c) {
  const n = c.active_courts || c.courts
  return n ? `${n} ${n === 1 ? 'cancha' : 'canchas'}` : null
}

function ClubCard({ c }) {
  const navigate = useNavigate()
  const wa = !c.bookable && whatsappLink(c.contact_whatsapp)
  const img = cld(c.header_url, 640) || courtBg
  return (
    <div className="flex flex-col rounded-2xl border border-border-mid bg-surface overflow-hidden">
      <Link to={`/club/${c.id}`} className="relative block h-28 bg-surface-alt overflow-hidden">
        <img src={img} alt="" width={640} height={224} loading="lazy" className={`w-full h-full object-cover ${c.header_url ? 'opacity-85' : 'opacity-40'}`} />
        {!c.header_url && (
          <span className="absolute inset-0 flex items-center justify-center"><ClubLogo name={c.name} src={c.photo_url} size={56} /></span>
        )}
        {c.distance_km != null && (
          <span className="absolute top-2.5 right-2.5 font-sans text-[11px] font-bold text-white bg-black/60 rounded-full px-2.5 py-0.5">
            a {Number(c.distance_km).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km
          </span>
        )}
      </Link>
      <div className="flex flex-col flex-1 gap-2.5 p-3.5">
        <div className="min-w-0">
          <Link to={`/club/${c.id}`} className="block font-sans font-bold text-[15px] text-white truncate no-underline hover:text-brand">{c.name}</Link>
          <span className="block font-sans text-[12px] text-secondary truncate mt-0.5">{[c.location_name, courtsText(c)].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`font-sans text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${c.bookable ? 'text-cyan border-cyan/40' : 'text-secondary border-border-strong'}`}>
            {c.bookable ? 'Reservas online' : 'Sin reservas online'}
          </span>
          {c.open_friendlies > 0 && (
            <span className="font-sans text-[10.5px] font-bold px-2 py-0.5 rounded-full border text-brand border-brand/40">
              {c.open_friendlies} {c.open_friendlies === 1 ? 'partido abierto' : 'partidos abiertos'}
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-auto pt-1">
          {c.bookable && (
            <button type="button" onClick={() => navigate(`/club/${c.id}?tab=reservar`)}
              className="flex-1 h-10 rounded-lg border-0 bg-brand text-black font-sans text-[12px] font-extrabold cursor-pointer">Reservar</button>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="flex-1 h-10 rounded-lg border border-border-strong bg-surface-alt text-white font-sans text-[12px] font-extrabold inline-flex items-center justify-center no-underline">Contactar</a>
          )}
          <Link to={`/club/${c.id}`} className="flex-1 h-10 rounded-lg border border-border-strong text-content font-sans text-[12px] font-bold inline-flex items-center justify-center no-underline hover:text-white">Ver club</Link>
        </div>
      </div>
    </div>
  )
}

export default function Clubes() {
  const [geo, locate] = useGeolocation()
  const [near, setNear] = useState(true)
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [result, setResult] = useState({ key: null, rows: null })

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 300)
    return () => clearTimeout(id)
  }, [q])

  const useNear = near && !debounced && geo.status === 'done'
  const key = useNear ? `near:${geo.coords.lat},${geo.coords.lon}` : `q:${debounced}`

  useEffect(() => {
    let cancelled = false
    const [kind, value] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)]
    const req = kind === 'near' ? api.clubs.nearbyStats(...value.split(',')) : api.clubs.browse(value)
    req.then((rows) => { if (!cancelled) setResult({ key, rows }) })
      .catch(() => { if (!cancelled) setResult({ key, rows: [] }) })
    return () => { cancelled = true }
  }, [key])

  function toggleNear() {
    const next = !near
    setNear(next)
    if (next && geo.status !== 'done') locate()
  }

  const rows = result.key === key ? result.rows : null
  const waitingGeo = near && !debounced && geo.status === 'loading'

  return (
    <AdRail>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative flex-1 min-w-52 sm:max-w-80">
            <span className="sr-only">Buscar club</span>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar club o localidad"
              className={`${FIELD} w-full pl-9 pr-3 text-white placeholder:text-muted`} />
          </label>
          <button type="button" aria-pressed={near} onClick={toggleNear}
            className={`h-10 px-3.5 rounded-lg font-sans text-[12.5px] font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors ${near ? 'border border-brand/50 bg-brand/10 text-brand' : 'border border-border-mid bg-surface text-content hover:text-white'}`}>
            <MapPin size={14} />Cerca
          </button>
          {near && !debounced && geo.status === 'idle' && (
            <button type="button" onClick={locate} className="h-10 bg-transparent border-0 p-0 font-sans text-[12.5px] font-bold text-brand cursor-pointer hover:underline">Usar mi ubicación</button>
          )}
          {near && !debounced && geo.status === 'denied' && <span className="font-sans text-[12px] text-secondary">Sin permiso de ubicación: mostramos todos.</span>}
        </div>
        <section aria-labelledby="pd-clubes">
          <h2 id="pd-clubes" className={`${SECTION_TITLE} mb-3`}>{useNear ? 'CLUBES A MENOS DE 20 KM' : debounced ? 'RESULTADOS' : 'CLUBES'}</h2>
          {(rows === null || waitingGeo) && <Spinner />}
          {rows?.length === 0 && !waitingGeo && <p className="m-0 font-sans text-[13px] text-secondary">{useNear ? 'No hay clubes en un radio de 20 km.' : 'No hay clubes con ese nombre.'}</p>}
          {rows?.length > 0 && !waitingGeo && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map((c) => <ClubCard key={c.id} c={c} />)}</div>
          )}
        </section>
      </div>
    </AdRail>
  )
}
