import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Building2, MapPin, Phone, MessageCircle, Check, X, Clock, Pencil } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../context/useToast'
import { scheduleLines, clubChanges } from '../Club/clubForm'
import Loader from '../Loader/Loader'
import PlayerAvatar from '../shared/PlayerAvatar'
import MapPreview from '../shared/MapPreview'
import MapPicker from '../shared/MapPicker'

const TABS = [
  { key: 'pending',  label: 'PENDIENTES' },
  { key: 'approved', label: 'APROBADAS' },
  { key: 'rejected', label: 'RECHAZADAS' },
]

function RequestCard({ req, onAction, busy }) {
  const d = req.proposed_data ?? {}
  const horarios = scheduleLines(d.schedule)
  const social = (d.social_links ?? []).filter((s) => s.url)
  const isPending = req.status === 'pending'
  const isEdit = !!req.club_id
  // "Antes" = snapshot al crear la solicitud (previous_data); current_data es fallback
  // para solicitudes viejas sin snapshot. El nombre viaja en req.name (columna aparte).
  const before = req.previous_data ?? req.current_data ?? {}
  const changes = isEdit ? clubChanges(before, { ...d, name: req.name }) : []

  // Ubicación efectiva: la propuesta, o la reubicada por el admin (override) antes de aprobar.
  const [override, setOverride] = useState(null)
  const [showMap,  setShowMap]  = useState(false)
  const lat      = override?.lat ?? d.lat
  const lon      = override?.lon ?? d.lon
  const locName  = override?.location_name ?? d.location_name
  const hasPin   = lat != null && lon != null

  function onMapConfirm(newLat, newLon, displayName) {
    setOverride({ lat: newLat, lon: newLon, location_name: displayName || locName })
    setShowMap(false)
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 size={18} className="text-brand shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-condensed font-bold text-lg text-white truncate">{req.name}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${isEdit ? 'text-cyan border-cyan/40' : 'text-muted border-border-strong'}`}>
                {isEdit ? 'EDICIÓN' : 'ALTA'}
              </span>
            </div>
            {isEdit && (
              <Link to={`/club/${req.club_id}`} className="text-[11px] font-mono text-dim hover:text-brand transition-colors">
                editar club existente →
              </Link>
            )}
          </div>
        </div>
        {req.status !== 'pending' && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${req.status === 'approved' ? 'text-green border-green/40' : 'text-danger border-danger/40'}`}>
            {req.status === 'approved' ? 'APROBADA' : 'RECHAZADA'}
          </span>
        )}
      </div>

      {isEdit ? (
        <div className="mt-3 flex flex-col gap-2.5">
          {changes.length === 0 ? (
            <div className="text-xs font-mono text-muted">No se detectaron cambios respecto al club actual.</div>
          ) : changes.map((c, i) => (
            <div key={i}>
              <div className="text-[10px] font-mono text-muted tracking-widest mb-1">{c.label.toUpperCase()}</div>
              <div className="flex items-start gap-2 flex-wrap text-sm font-sans">
                <span className="text-dim line-through">{c.before || '—'}</span>
                <span className="text-muted shrink-0">→</span>
                <span className="text-green">{c.after || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mt-3 text-sm text-secondary font-sans">
          {locName && <div className="flex items-center gap-2"><MapPin size={13} className="text-muted shrink-0" />{locName}</div>}
          {d.contact_phone && <div className="flex items-center gap-2"><Phone size={13} className="text-muted shrink-0" />{d.contact_phone}</div>}
          {d.contact_whatsapp && <div className="flex items-center gap-2"><MessageCircle size={13} className="text-muted shrink-0" />{d.contact_whatsapp}</div>}
          {d.courts != null && d.courts !== '' && <div className="text-muted text-xs font-mono">{d.courts} canchas</div>}
          {horarios.map((l, i) => <div key={i} className="flex items-center gap-2 text-xs text-muted"><Clock size={12} />{l}</div>)}
          {social.length > 0 && <div className="text-xs text-muted font-mono truncate">{social.map((s) => `${s.platform}: ${s.url}`).join(' · ')}</div>}
        </div>
      )}

      {isPending && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-muted tracking-widest">
              UBICACIÓN {override && <span className="text-brand">(ajustada)</span>}
            </span>
            {hasPin && (
              <button onClick={() => setShowMap(true)}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-dim hover:text-brand transition-colors bg-transparent border-none cursor-pointer">
                <Pencil size={11} /> AJUSTAR
              </button>
            )}
          </div>
          {hasPin ? (
            <MapPreview lat={lat} lon={lon} height={140} />
          ) : (
            <div className="text-[11px] font-mono text-danger border border-danger/40 rounded px-2 py-1.5">
              Sin coordenadas. Ajustá la ubicación antes de aprobar.
              <button onClick={() => setShowMap(true)} className="ml-1 underline text-brand bg-transparent border-none cursor-pointer">marcar en el mapa</button>
            </div>
          )}
        </div>
      )}

      {showMap && (
        <MapPicker initialLat={lat} initialLon={lon} onConfirm={onMapConfirm} onClose={() => setShowMap(false)} />
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <Link to={`/u/${req.requester_username}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
          <PlayerAvatar name={req.requester_name} src={req.requester_avatar_url} size={22} />
          <span className="text-muted text-[11px] font-mono truncate">@{req.requester_username}</span>
        </Link>
        {req.created_club_id && (
          <Link to={`/club/${req.created_club_id}`} className="text-[11px] font-mono text-brand hover:underline">ver club →</Link>
        )}
        {isPending && (
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => onAction(req, 'reject')}
              className="inline-flex items-center gap-1 text-[11px] font-condensed font-bold tracking-widest text-danger border border-danger/40 hover:bg-danger/10 px-2.5 py-1.5 rounded cursor-pointer disabled:opacity-50">
              <X size={12} /> RECHAZAR
            </button>
            <button disabled={busy} onClick={() => onAction(req, 'approve', override)}
              className="inline-flex items-center gap-1 text-[11px] font-condensed font-bold tracking-widest text-base bg-brand hover:opacity-90 px-2.5 py-1.5 rounded cursor-pointer disabled:opacity-50">
              <Check size={12} /> APROBAR
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminClubRequests() {
  const { showToast } = useToast()
  const [tab, setTab]       = useState('pending')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [busyId, setBusyId] = useState(null)

  const fetchRequests = useCallback(async (status) => {
    setLoading(true)
    try {
      setRequests(await api.clubs.requests.list(status))
      setError(null)
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }, [])

  useEffect(() => { fetchRequests(tab) }, [tab, fetchRequests])

  async function onAction(req, action, override) {
    setBusyId(req.id)
    try {
      await api.clubs.requests.respond(req.id, action, action === 'approve' ? override : undefined)
      const okMsg = req.club_id ? 'Cambios aplicados al club' : 'Club creado a partir de la solicitud'
      showToast(action === 'approve' ? okMsg : 'Solicitud rechazada', action === 'approve' ? 'success' : 'info')
      await fetchRequests(tab)
    } catch (e) { setError(e.message) }
    finally     { setBusyId(null) }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <Link to="/admin" className="inline-flex items-center gap-1 text-muted hover:text-white text-xs font-mono mb-3 transition-colors">
        <ArrowLeft size={12} /> Dashboard
      </Link>

      <h1 className="font-condensed font-black text-2xl tracking-widest text-white mb-1">
        SOLICITUDES DE CLUB <span className="text-brand">/ ADMIN</span>
      </h1>
      <p className="text-muted text-xs font-mono mb-5">Revisá y aprobá los clubes propuestos por usuarios</p>

      <div className="grid grid-cols-3 gap-1 mb-5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-[10px] sm:text-[11px] font-condensed font-bold tracking-wide sm:tracking-widest px-2 py-1.5 rounded transition-colors ${tab === t.key ? 'bg-brand text-base' : 'bg-surface border border-border text-muted hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-danger text-xs font-mono mb-3">{error}</p>}

      {loading ? <Loader /> : (
        <div className="flex flex-col gap-3">
          {requests.length === 0 && <p className="text-muted text-xs font-mono py-8 text-center">Sin solicitudes.</p>}
          {requests.map((req) => (
            <RequestCard key={req.id} req={req} onAction={onAction} busy={busyId === req.id} />
          ))}
        </div>
      )}
    </div>
  )
}
