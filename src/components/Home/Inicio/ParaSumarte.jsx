import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Swords, Ticket } from 'lucide-react'
import { api } from '../../../utils/api'
import { useGeolocation } from '../../../hooks/useGeolocation'
import FriendlyOpenCard from '../../Friendly/FriendlyOpenCard'
import EventCard from '../EventCard'
import SignupFooter from '../SignupFooter'

const MAX = 6
const RADIUS_KM = 15

function Tab({ on, onClick, icon, label, n }) {
  const Icon = icon
  return (
    <button type="button" role="tab" aria-selected={on} onClick={onClick}
      className={`h-9 px-3.5 rounded-full inline-flex items-center gap-2 font-sans text-[12.5px] cursor-pointer transition-colors ${on ? 'bg-white text-(color:--color-base) font-bold border-0' : 'bg-transparent border border-border-strong text-content font-semibold hover:text-white'}`}>
      <Icon size={14} />{label}
      <span className={`text-[10.5px] font-bold rounded-full px-1.5 ${on ? 'bg-(--color-base) text-white' : 'bg-border-mid text-secondary'}`}>{n}</span>
    </button>
  )
}

// Amistosos con lugar libre (cerca si hay permiso de ubicación) y torneos con inscripción abierta.
export default function ParaSumarte({ signup = [], onOpenTournament }) {
  const [geo] = useGeolocation()
  const [result, setResult] = useState({ key: null, rows: null })
  const [tab, setTab] = useState(null)
  const coords = geo.status === 'done' ? geo.coords : null
  const key = coords ? `${coords.lat},${coords.lon}` : 'all'

  useEffect(() => {
    let cancelled = false
    const [lat, lon] = key === 'all' ? [] : key.split(',')
    api.friendlies.list({ lat, lon, radius_km: lat ? RADIUS_KM : null })
      .then((rows) => { if (!cancelled) setResult({ key, rows: rows.filter((m) => !m.viewer?.team) }) })
      .catch(() => { if (!cancelled) setResult({ key, rows: [] }) })
    return () => { cancelled = true }
  }, [key])

  const friendlies = result.rows
  const loading = friendlies === null
  const active = tab ?? (friendlies?.length === 0 && signup.length > 0 ? 'torneos' : 'partidos')
  const near = result.key !== 'all' && result.key !== null

  return (
    <section aria-labelledby="para-sumarte" className="mt-9 min-h-60">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <h2 id="para-sumarte" className="m-0 font-sans text-[11px] font-bold tracking-[2px] text-muted">{near ? 'PARA SUMARTE CERCA' : 'PARA SUMARTE'}</h2>
        <div role="tablist" className="flex flex-wrap gap-1.5">
          <Tab on={active === 'partidos'} onClick={() => setTab('partidos')} icon={Swords} label="Partidos abiertos" n={friendlies?.length ?? '…'} />
          <Tab on={active === 'torneos'} onClick={() => setTab('torneos')} icon={Ticket} label="Torneos con inscripción" n={signup.length} />
        </div>
      </div>

      {active === 'partidos' && loading && <div className="flex justify-center py-8 text-muted"><Loader2 size={18} className="animate-spin" /></div>}

      {active === 'partidos' && friendlies?.length === 0 && (
        <p className="m-0 font-sans text-[13px] text-secondary">
          {near ? `No hay partidos abiertos a menos de ${RADIUS_KM} km.` : 'No hay partidos abiertos.'}{' '}
          <Link to="/amistosos/nuevo" className="text-brand font-bold no-underline hover:underline">Armá uno</Link> y sumá jugadores.
        </p>
      )}
      {active === 'partidos' && friendlies?.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {friendlies.slice(0, MAX).map((m) => <FriendlyOpenCard key={m.id} m={m} />)}
          </div>
          <Link to="/partidos" className="inline-block mt-3 font-sans text-[13px] font-bold text-brand no-underline hover:underline">
            {friendlies.length > MAX ? `Ver los ${friendlies.length} partidos →` : 'Ver en Partidos →'}
          </Link>
        </>
      )}

      {active === 'torneos' && signup.length === 0 && (
        <p className="m-0 font-sans text-[13px] text-secondary">No hay torneos con inscripción abierta ahora.</p>
      )}
      {active === 'torneos' && signup.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {signup.slice(0, MAX).map((t) => (
              <EventCard key={t.id} t={t} className="h-full w-full" onClick={() => onOpenTournament(t.id)} footer={<SignupFooter t={t} />} />
            ))}
          </div>
          <Link to="/torneos" className="inline-block mt-3 font-sans text-[13px] font-bold text-brand no-underline hover:underline">Ver en Torneos →</Link>
        </>
      )}
    </section>
  )
}
