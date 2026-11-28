import { lazy, Suspense, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { parseScheduleToGrid, openStatus, openStatusLabel } from './scheduleGrid'
import { priceFrom } from '../../utils/clubProfile'
import Loader from '../Loader/Loader'
import LazyNotFound from '../NotFound/LazyNotFound'
import ClubRequestModal from './ClubRequestModal'
import ClubClaimModal from './ClubClaimModal'
import ClubHero from './Resumen/ClubHero'
import ClubNextUp from './Resumen/ClubNextUp'
import ClubEvents from './Resumen/ClubEvents'
import ClubFreeToday from './Resumen/ClubFreeToday'
import ClubActivityCharts from './Resumen/ClubActivityCharts'
import ClubCourts from './Resumen/ClubCourts'
import ClubChampions from './Resumen/ClubChampions'
import ClubAside from './Resumen/ClubAside'
import ClubFollowButton from './ClubFollowButton'
import ClubGallery from './ClubGallery'
import PremiumModal from '../shared/PremiumModal'
import AdBanner from '../shared/AdBanner'
import AdInline from '../shared/AdInline'

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

const ClubBooking = lazy(() => import('./ClubBooking'))
const ClubBookingManage = lazy(() => import('./ClubBookingManage'))

const BASE_TABS = [
  { id: 'resumen',  label: 'Resumen' },
  { id: 'reservar', label: 'Reservar' },
]
// Solo quien gestiona las reservas ve la pestaña de gestión
const MANAGE_TAB = { id: 'gestion', label: 'Gestión de reservas' }
const TAB_IDS = ['resumen', 'reservar', 'fotos', 'gestion']

export default function ClubProfileView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLoggedIn, user } = useAuth()
  const { showToast } = useToast()
  const isAdmin = user?.role === 'admin'
  const [club, setClub]     = useState(null)
  const [events, setEvents] = useState({ upcoming: [], ongoing: [], past: [] })
  const [tab, setTab]       = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    return TAB_IDS.includes(t) ? t : 'resumen'
  })
  const tabsRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [showEditRequest, setShowEditRequest] = useState(false)
  const [showClaim, setShowClaim] = useState(false)
  const [showMpPremium, setShowMpPremium] = useState(false)

  const handlePendingBookingsChange = useCallback((pending_bookings_count) => {
    setClub((c) => (c && c.pending_bookings_count !== pending_bookings_count ? { ...c, pending_bookings_count } : c))
  }, [])

  // El dueño verificado edita directo como un admin; el resto solo sugiere cambios
  const canManage = isAdmin || !!club?.is_owner
  // Lo calcula el back (can_manage_bookings): el admin solo gestiona clubes sin dueño
  const canManageBookings = !!club?.can_manage_bookings
  const photoCount = club?.photos?.length ?? 0
  const tabs = useMemo(() => [
    ...BASE_TABS,
    ...(photoCount ? [{ id: 'fotos', label: 'Fotos' }] : []),
    ...(canManageBookings ? [MANAGE_TAB] : []),
  ], [canManageBookings, photoCount])
  const grid = useMemo(() => parseScheduleToGrid(club?.schedule), [club?.schedule])
  function handlePedir() {
    if (canManage) { navigate(`/club/${id}/editar`); return }
    if (!isLoggedIn) { navigate('/login'); return }
    setShowEditRequest(true)
  }

  function handleReclamar() {
    if (!isLoggedIn) { navigate('/login'); return }
    setShowClaim(true)
  }

  const fetchData = useCallback(async (clubId, { silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const [c, e] = await Promise.all([api.clubs.get(clubId), api.clubs.events(clubId)])
      setClub(c); setEvents(e); setError(null)
    } catch (err) {
      setError(err.status === 404 ? 'notfound' : err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(id) }, [id, fetchData])

  // Vuelve a pedir el club, sin loader, al cambiar de sesión: is_owner y has_owner dependen de la cookie
  const viewerKey  = user?.id ?? null
  const prevViewer = useRef(viewerKey)
  useEffect(() => {
    if (prevViewer.current === viewerKey) return
    prevViewer.current = viewerKey
    fetchData(id, { silent: true })
  }, [viewerKey, id, fetchData])

  // Vuelta de Mercado Pago: OAuth Connect (?mp=) o pago de una reserva (?pago=).
  // Se limpia el query param para no repetir el toast si recargan la página.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mp = params.get('mp')
    const pago = params.get('pago')
    if (!mp && !pago) return
    if (mp === 'connected') { showToast('Mercado Pago vinculado'); fetchData(id, { silent: true }) }
    else if (mp === 'error') showToast('No se pudo vincular Mercado Pago. Probá de nuevo.', 'error')
    else if (pago === 'exito') showToast('Pago recibido. Tu turno se confirma en cuanto Mercado Pago lo acredite.')
    else if (pago === 'pendiente') showToast('Tu pago quedó pendiente en Mercado Pago.')
    else if (pago === 'error') showToast('El pago no se pudo completar.', 'error')
    navigate(`/club/${id}`, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleConectarMp() {
    try {
      const { authorize_url } = await api.clubs.mercadopago.connect(club.id)
      window.location.href = authorize_url
    } catch (e) {
      if (e.data?.code === 'plan_limit') setShowMpPremium(true)
      else showToast(e.message, 'error')
    }
  }

  async function handleDesconectarMp() {
    try {
      await api.clubs.mercadopago.disconnect(club.id)
      setClub((c) => (c ? { ...c, mp_connected: false } : c))
      showToast('Mercado Pago desvinculado')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  useDocumentTitle(error === 'notfound' ? 'Club no encontrado' : club?.name)

  const todos = useMemo(
    () => [...(events.ongoing ?? []), ...(events.upcoming ?? []), ...(events.past ?? [])],
    [events],
  )

  if (loading) return <Loader minHeight="100vh" />
  if (error === 'notfound') return <LazyNotFound subject="club" />
  if (error)   return <p className="text-danger text-sm p-6">{error}</p>
  if (!club)   return null

  const maps   = mapsUrl(club)
  const stats  = club.stats ?? {}
  const desde  = club.created_at ? new Date(club.created_at).getFullYear() : null
  const activeCourts = (club.courts_list ?? []).filter((c) => c.active)
  const bookable = !!club.has_owner && activeCourts.length > 0 && !!grid
  const st = openStatus(grid)
  const status = st ? { open: st.open, label: openStatusLabel(st) } : null
  const canchasCount = activeCourts.length || club.courts
  const rail = [
    { v: stats.torneos ?? 0, k: 'Torneos' },
    { v: events.activity?.jugadores_total ?? stats.jugadores ?? 0, k: 'Jugadores' },
    { v: stats.partidos ?? 0, k: 'Partidos' },
    { v: canchasCount ?? '—', k: 'Canchas', off: canchasCount == null },
    { v: club.followers_count ?? 0, k: 'Seguidores' },
    { v: desde ?? '—', k: 'En Padeleando desde', off: !desde },
  ]

  function goReservar() {
    setTab('reservar')
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="bg-base text-content font-sans pb-15">
      <ClubHero club={club} maps={maps} status={status} price={priceFrom(activeCourts)}
        canManage={canManage} bookable={bookable} onReservar={goReservar}
        follow={<ClubFollowButton club={club} onChange={(st) => setClub((c) => ({ ...c, ...st }))} />} />

      <div className="grid grid-cols-3 sm:grid-cols-6 border-b border-border">
        {rail.map((r) => (
          <div key={r.k} className="px-4 py-3.5 min-w-0 border-r border-b sm:border-b-0 border-border">
            <div className={`font-condensed font-black text-[20px] leading-none tabular-nums truncate ${r.off ? 'text-muted' : 'text-white'}`}>{r.v}</div>
            <div className="text-[12px] text-secondary mt-1.5 truncate">{r.k}</div>
          </div>
        ))}
      </div>

      <div ref={tabsRef} role="tablist" aria-label="Secciones del club" className="scroll-mt-16 flex gap-1 border-b border-border px-3 sm:px-5 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`bg-transparent border-0 px-3 py-4 font-condensed font-bold text-[13px] cursor-pointer border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              tab === t.id ? 'text-brand border-b-brand' : 'text-muted border-b-transparent hover:text-brand'
            }`}>
            {t.label}
            {t.id === 'fotos' && (
              <span className={`font-sans text-[11px] rounded px-1.5 py-0.5 ${tab === t.id ? 'bg-brand text-base' : 'bg-border-mid text-secondary'}`}>{photoCount}</span>
            )}
            {t.id === 'gestion' && club.pending_bookings_count > 0 && (
              <span className={`font-sans text-[11px] rounded px-1.5 py-0.5 ${tab === t.id ? 'bg-brand text-base' : 'bg-border-mid text-secondary'}`}>
                {club.pending_bookings_count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 sm:px-7 py-6">
        {tab === 'resumen' && (
          <div className="flex flex-wrap gap-7 items-start">
            <div className="flex-[999_1_520px] min-w-0 flex flex-col gap-9">
              <ClubNextUp events={events} />
              <ClubEvents club={club} events={events} todos={todos} />
              {bookable && <ClubFreeToday club={club} grid={grid} courts={activeCourts} onReservar={goReservar} />}
              <ClubActivityCharts club={club} activity={events.activity} grid={grid} showOccupancy={canManageBookings && bookable} />
              <ClubCourts club={club} canManage={canManage} />
              <ClubChampions club={club} champions={events.champions} />
              {photoCount > 0 && (
                <section aria-labelledby="club-photos">
                  <div className="flex justify-between items-baseline gap-3 mb-3.5">
                    <h2 id="club-photos" className="m-0 font-condensed font-bold text-[15px] text-white">Fotos</h2>
                    {photoCount > 4 && (
                      <button type="button" onClick={() => setTab('fotos')} className="text-[13px] font-bold text-brand bg-transparent border-0 p-0 cursor-pointer hover:underline">
                        Ver las {photoCount} fotos
                      </button>
                    )}
                  </div>
                  <ClubGallery photos={club.photos} max={4} onMore={() => setTab('fotos')} />
                </section>
              )}
              <section aria-labelledby="club-rank" className="rounded-xl border border-border-mid bg-surface p-4 sm:p-5 flex items-start gap-3">
                <span className="text-[11px] font-bold text-premium-ink bg-premium rounded px-2 py-0.5 shrink-0">Próximamente</span>
                <span className="min-w-0">
                  <h2 id="club-rank" className="m-0 font-condensed font-bold text-[15px] text-white">Ranking del club</h2>
                  <p className="m-0 mt-1 text-[13px] text-secondary leading-relaxed">Muy pronto vas a ver quiénes suman más puntos jugando en este club.</p>
                </span>
              </section>
            </div>
            <ClubAside club={club} grid={grid} maps={maps} admin={isAdmin} canManage={canManage}
              onPedir={handlePedir} onReclamar={handleReclamar}
              onConectarMp={handleConectarMp} onDesconectarMp={handleDesconectarMp} onPedirPremiumMp={() => setShowMpPremium(true)} />
            <AdInline className="w-full mt-2" />
          </div>
        )}
        {tab === 'fotos' && <ClubGallery photos={club.photos} />}
        <Suspense fallback={<Loader minHeight="60vh" />}>
          {tab === 'reservar' && (
            <>
              <ClubBooking club={club} canManage={canManageBookings} />
              <div className="mt-10 flex justify-center"><div className="w-full max-w-[300px]"><AdBanner /></div></div>
            </>
          )}
          {tab === 'gestion' && canManageBookings && <ClubBookingManage club={club} onPendingCountChange={handlePendingBookingsChange} />}
        </Suspense>
      </div>

      {showEditRequest && (
        <ClubRequestModal club={club} onClose={() => setShowEditRequest(false)} />
      )}

      {showClaim && (
        <ClubClaimModal
          club={club}
          onClose={() => setShowClaim(false)}
          onSubmitted={() => fetchData(id)}
        />
      )}

      {showMpPremium && (
        <PremiumModal focus="club" reason="Vincular Mercado Pago" onClose={() => setShowMpPremium(false)} />
      )}
    </div>
  )
}
