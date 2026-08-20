import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  MapPin, MessageCircle, Instagram, Facebook, Globe, Building2,
  ChevronLeft, Navigation, Phone, Radio,
} from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { whatsappLink, socialUrl } from './clubForm'
import { categoryRows, organizerRows, missingFields, eventDate } from '../../utils/clubPage'
import courtBg from '../../assets/padelcourt.webp'
import Loader from '../Loader/Loader'
import LazyNotFound from '../NotFound/LazyNotFound'
import ClubRequestModal from './ClubRequestModal'
import ClubEditModal from './ClubEditModal'
import ClubAgenda from './ClubAgenda'
import ClubCategories from './ClubCategories'
import ClubInfo from './ClubInfo'

const SOCIAL_ICON = { instagram: Instagram, facebook: Facebook, website: Globe }
const SOCIAL_LABEL = { instagram: 'Instagram', facebook: 'Facebook', website: 'Sitio web' }

// Link a la app de mapas según la plataforma (Apple Maps en iOS/Mac, Google Maps
// en el resto). Usa coordenadas si las hay; si no, el nombre de la ubicación.
function mapsUrl(club) {
  const hasCoords = club.lat != null && club.lon != null
  if (!hasCoords && !club.location_name) return null
  const isApple = /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent)
  const label = encodeURIComponent(club.name || 'Club')
  if (isApple) {
    return hasCoords
      ? `https://maps.apple.com/?ll=${club.lat},${club.lon}&q=${label}`
      : `https://maps.apple.com/?q=${encodeURIComponent(club.location_name)}`
  }
  return hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${club.lat},${club.lon}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(club.location_name)}`
}

const TABS = [
  { id: 'agenda', label: 'AGENDA' },
  { id: 'cats',   label: 'CATEGORÍAS' },
  { id: 'info',   label: 'INFO' },
]

export default function ClubProfileView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [club, setClub]     = useState(null)
  const [events, setEvents] = useState({ upcoming: [], ongoing: [], past: [] })
  const [tab, setTab]       = useState('agenda')
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [showEditRequest, setShowEditRequest] = useState(false)
  const [showEditClub, setShowEditClub] = useState(false)

  function handlePedir() {
    if (isAdmin) { setShowEditClub(true); return }
    if (!isLoggedIn) { navigate('/login'); return }
    setShowEditRequest(true)
  }

  const fetchData = useCallback(async (clubId) => {
    setLoading(true)
    try {
      const [c, e] = await Promise.all([api.clubs.get(clubId), api.clubs.events(clubId)])
      setClub(c); setEvents(e); setError(null)
    } catch (err) {
      setError(err.status === 404 ? 'notfound' : err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(id) }, [id, fetchData])

  useDocumentTitle(error === 'notfound' ? 'Club no encontrado' : club?.name)

  const todos = useMemo(
    () => [...(events.ongoing ?? []), ...(events.upcoming ?? []), ...(events.past ?? [])],
    [events],
  )
  const categorias    = useMemo(() => categoryRows(todos), [todos])
  const organizadores = useMemo(() => organizerRows(todos), [todos])

  if (loading) return <Loader />
  if (error === 'notfound') return <LazyNotFound subject="club" />
  if (error)   return <p className="text-danger text-sm font-mono p-6">{error}</p>
  if (!club)   return null

  const maps   = mapsUrl(club)
  const social = (club.social_links ?? []).filter((s) => s.url)
  const stats  = club.stats ?? {}
  const desde  = club.created_at ? new Date(club.created_at).getFullYear() : null
  const faltan = missingFields(club)

  // Lo que se está jugando gana sobre lo que viene: es lo único de la página
  // que caduca en horas.
  const proximo = events.ongoing?.[0] ?? events.upcoming?.[0] ?? null
  const enVivo  = (events.ongoing?.length ?? 0) > 0
  const pd      = proximo ? eventDate(proximo) : null

  const rail = [
    { v: stats.torneos ?? 0,    k: 'Torneos' },
    { v: stats.partidos ?? 0,   k: 'Partidos' },
    { v: stats.jugadores ?? 0,  k: 'Jugadores' },
    { v: stats.categorias ?? 0, k: 'Categorías' },
    { v: club.courts ?? '—',    k: 'Canchas', off: club.courts == null },
    { v: desde ?? '—',          k: 'Desde',   off: !desde },
  ]

  return (
    <div className="bg-base text-content font-sans pb-15">
      {/* Cabecera: la misma foto de cancha para todos los clubes. El texto que
          va encima usa blanco literal y no `text-white`: ese token lo invierte
          el tema claro y sobre una foto oscura quedaría tinta sobre tinta. */}
      <div className="relative overflow-hidden border-b border-border">
        <img
          src={courtBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          style={{ filter: 'grayscale(25%) brightness(0.8) contrast(0.95)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.6))' }} />

        <div className="absolute top-4 left-4 z-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ color: '#fff' }}
            className="inline-flex items-center gap-1 bg-black/50 backdrop-blur text-xs font-mono px-2.5 py-1.5 rounded hover:bg-black/70 transition-colors cursor-pointer border-none"
          >
            <ChevronLeft size={13} /> Volver
          </button>
        </div>

        <div className="relative px-5 sm:px-6 pt-16 pb-5 flex items-end gap-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-surface border border-border-strong overflow-hidden shrink-0 flex items-center justify-center shadow-lg shadow-black/40">
            {club.photo_url
              ? <img src={club.photo_url} alt={club.name} className="w-full h-full object-contain" />
              : <Building2 size={34} className="text-border-strong" />}
          </div>
          <div className="min-w-0 pb-1">
            <h1
              style={{ color: '#fff' }}
              className="font-condensed font-black text-[24px] sm:text-[30px] tracking-wide leading-none m-0"
            >
              {club.name}
            </h1>
            {club.location_name && (
              maps ? (
                <a
                  href={maps} target="_blank" rel="noreferrer"
                  style={{ color: '#c9c9c9' }}
                  className="group inline-flex items-center gap-1.5 text-[13px] mt-2 transition-colors hover:opacity-80"
                >
                  <MapPin size={13} className="shrink-0" />
                  <span className="underline-offset-2 group-hover:underline">{club.location_name}</span>
                  <Navigation size={12} className="shrink-0 opacity-60" />
                </a>
              ) : (
                <div style={{ color: '#c9c9c9' }} className="flex items-center gap-1.5 text-[13px] mt-2">
                  <MapPin size={13} className="shrink-0" /><span className="truncate">{club.location_name}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Acciones: lo que la gente viene a hacer. Sólo sale el botón que tiene
          un dato detrás, así un club a medio cargar no muestra botones muertos. */}
      <div className="flex flex-wrap gap-2 px-5 sm:px-6 py-4">
        {maps && (
          <a
            href={maps} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-brand text-base border border-brand px-3.5 py-2 rounded-lg text-[12.5px] font-semibold cursor-pointer transition-opacity hover:opacity-90"
          >
            <Navigation size={13} /> Cómo llegar
          </a>
        )}
        {club.contact_whatsapp && (
          <a
            href={whatsappLink(club.contact_whatsapp)} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-transparent border border-border-strong text-content px-3.5 py-2 rounded-lg text-[12.5px] cursor-pointer hover:border-soft hover:text-white transition-colors"
          >
            <MessageCircle size={13} /> WhatsApp
          </a>
        )}
        {club.contact_phone && (
          <a
            href={`tel:${club.contact_phone}`}
            className="inline-flex items-center gap-2 bg-transparent border border-border-strong text-content px-3.5 py-2 rounded-lg text-[12.5px] cursor-pointer hover:border-soft hover:text-white transition-colors"
          >
            <Phone size={13} /> Llamar
          </a>
        )}
        {social.map((s) => {
          const Icon = SOCIAL_ICON[s.platform] ?? Globe
          return (
            <a
              key={s.platform} href={socialUrl(s)} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-transparent border border-border-strong text-content px-3.5 py-2 rounded-lg text-[12.5px] cursor-pointer hover:border-soft hover:text-white transition-colors"
            >
              <Icon size={13} /> {SOCIAL_LABEL[s.platform] ?? 'Sitio'}
            </a>
          )
        })}
      </div>

      {/* Riel: la escala del club, que hasta ahora no se percibía en ningún lado. */}
      <div className="grid grid-cols-3 sm:grid-cols-6 border-y border-border">
        {rail.map((r, i) => (
          <div
            key={r.k}
            className={`px-3.5 py-3 min-w-0 border-border ${i % 3 === 2 ? 'sm:border-r' : 'border-r'} ${i === rail.length - 1 ? 'sm:border-r-0' : ''}`}
          >
            <div className={`font-condensed font-black text-[19px] leading-none tabular-nums truncate ${r.off ? 'text-muted' : 'text-white'}`}>
              {r.v}
            </div>
            <div className="text-[9px] tracking-[0.12em] text-muted mt-1.5 uppercase truncate">{r.k}</div>
          </div>
        ))}
      </div>

      {/* El cartel va encima de las solapas, no adentro de una: si hay algo
          jugándose ahora no puede depender de que elijas la pestaña correcta. */}
      {proximo && (
        <div className="px-5 sm:px-6 pt-4">
          <Link
            to={`/cat/${proximo.group_id}/torneo/${proximo.id}`}
            className="flex items-center gap-4 flex-wrap rounded-xl px-4 py-3.5"
            style={{
              borderWidth: 1, borderStyle: 'solid',
              borderColor: enVivo
                ? 'color-mix(in srgb, var(--color-green) 38%, transparent)'
                : 'color-mix(in srgb, var(--color-brand) 32%, transparent)',
              background: enVivo
                ? 'color-mix(in srgb, var(--color-green) 8%, transparent)'
                : 'color-mix(in srgb, var(--color-brand) 7%, transparent)',
            }}
          >
            <div className="shrink-0 text-center min-w-[60px]">
              <div className={`font-condensed font-black text-[30px] leading-none ${enVivo ? 'text-green' : 'text-brand'}`}>
                {pd ? String(pd.getDate()).padStart(2, '0') : '--'}
              </div>
              <div className="text-[9.5px] tracking-[0.15em] text-muted mt-1 uppercase">
                {pd ? pd.toLocaleDateString('es-AR', { month: 'long' }) : ''}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <span className={`inline-flex items-center gap-1.5 font-condensed font-bold text-[9px] tracking-[0.12em] px-2 py-[3px] rounded-[5px] ${
                enVivo ? 'text-green border border-green/40' : 'bg-brand text-base'
              }`}>
                {enVivo && <Radio size={9} />}
                {enVivo ? 'SE ESTÁ JUGANDO' : 'LO PRÓXIMO'}
              </span>
              <div className="font-condensed font-bold text-[18px] text-white leading-tight mt-2">{proximo.name}</div>
              <div className="text-[11.5px] text-muted mt-1.5 truncate">
                {proximo.format === 'americano' ? 'AMERICANO' : 'LIGA'}
                {proximo.group_name && <><span className="opacity-40"> · </span>{proximo.group_name}</>}
                {proximo.owner_username && <><span className="opacity-40"> · </span>@{proximo.owner_username}</>}
              </div>
            </div>
            <span className={`shrink-0 inline-flex items-center px-3.5 py-2 rounded-lg text-[12.5px] font-semibold ${
              enVivo ? 'bg-brand text-base' : 'border border-border-strong text-content'
            }`}>
              {enVivo ? 'Ver el vivo' : 'Ver el torneo'}
            </span>
          </Link>
        </div>
      )}

      <div className="flex border-b border-border px-2 mt-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`bg-transparent border-0 px-3.5 py-3.5 font-condensed font-bold text-[12.5px] tracking-wide cursor-pointer border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              tab === t.id ? 'text-brand border-b-brand' : 'text-muted border-b-transparent hover:text-brand'
            }`}
          >
            {t.label}
            {t.id === 'agenda' && todos.length > 0 && (
              <span className={`text-[9.5px] rounded px-1.5 py-0.5 ${tab === t.id ? 'bg-brand text-base' : 'bg-border-mid text-secondary'}`}>
                {todos.length}
              </span>
            )}
            {t.id === 'cats' && categorias.length > 0 && (
              <span className={`text-[9.5px] rounded px-1.5 py-0.5 ${tab === t.id ? 'bg-brand text-base' : 'bg-border-mid text-secondary'}`}>
                {categorias.length}
              </span>
            )}
            {/* Un punto en vez de un número: no es una cantidad que valga la
                pena leer, es un aviso de que ahí adentro hay algo por completar. */}
            {t.id === 'info' && faltan > 0 && (
              <span
                aria-label={`${faltan} datos sin cargar`}
                title={`${faltan} ${faltan === 1 ? 'dato' : 'datos'} sin cargar`}
                className="w-1.5 h-1.5 rounded-full bg-premium"
              />
            )}
          </button>
        ))}
      </div>

      <div className="px-5 sm:px-6 py-5">
        {tab === 'agenda' && <ClubAgenda events={events} todos={todos} />}
        {tab === 'cats'   && <ClubCategories categorias={categorias} organizadores={organizadores} />}
        {tab === 'info'   && (
          <ClubInfo club={club} mapsUrl={maps} desde={desde} admin={isAdmin} onPedir={handlePedir} />
        )}
      </div>

      {showEditRequest && (
        <ClubRequestModal club={club} onClose={() => setShowEditRequest(false)} />
      )}

      {showEditClub && (
        <ClubEditModal
          club={club}
          onClose={() => setShowEditClub(false)}
          onSaved={() => fetchData(id)}
        />
      )}
    </div>
  )
}
