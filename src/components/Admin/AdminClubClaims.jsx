import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Phone, Check, X, ImageOff } from 'lucide-react'
import { api } from '../../utils/api'
import { useToast } from '../../context/useToast'
import Loader from '../Loader/Loader'
import PlayerAvatar from '../shared/PlayerAvatar'

const TABS = [
  { key: 'pending',  label: 'PENDIENTES' },
  { key: 'approved', label: 'APROBADAS' },
  { key: 'rejected', label: 'RECHAZADAS' },
]

const RELATIONSHIP_LABEL = {
  dueno:     'Dice ser el dueño',
  encargado: 'Dice ser encargado',
  otro:      'Otra relación',
}

function Photo({ url, label }) {
  if (!url) {
    return (
      <div className="aspect-square rounded-lg bg-base border border-border-mid flex items-center justify-center">
        <ImageOff size={16} className="text-muted" />
      </div>
    )
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block group">
      <div className="aspect-square rounded-lg overflow-hidden border border-border-mid">
        <img src={url} alt={label} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
      </div>
      <div className="text-[9.5px] font-mono text-muted tracking-wide mt-1 truncate">{label}</div>
    </a>
  )
}

function ClaimCard({ claim, onAction, busy }) {
  const isPending = claim.status === 'pending'
  const [rejecting, setRejecting]   = useState(false)
  const [reason, setReason]         = useState('')

  function startReject() { setRejecting(true) }
  function cancelReject() { setRejecting(false); setReason('') }
  function confirmReject() {
    if (!reason.trim()) return
    onAction(claim, 'reject', reason.trim())
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck size={18} className="text-brand shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-condensed font-bold text-lg text-white truncate">{claim.club_name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border-strong text-muted shrink-0">
                {RELATIONSHIP_LABEL[claim.relationship] ?? claim.relationship}
              </span>
            </div>
            <Link to={`/club/${claim.club_id}`} className="text-[11px] font-mono text-dim hover:text-brand transition-colors">
              ver club →
            </Link>
          </div>
        </div>
        {claim.status !== 'pending' && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${claim.status === 'approved' ? 'text-green border-green/40' : 'text-danger border-danger/40'}`}>
            {claim.status === 'approved' ? 'APROBADO' : 'RECHAZADO'}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5 mt-3 text-sm text-secondary font-sans">
        <div>{claim.full_name}</div>
        <div className="flex items-center gap-2"><Phone size={13} className="text-muted shrink-0" />{claim.phone}</div>
        {claim.note && <div className="text-xs text-dim italic mt-0.5">“{claim.note}”</div>}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <Photo url={claim.photo_front_url}  label="Frente" />
        <Photo url={claim.photo_proof_url}  label="Vínculo" />
        <Photo url={claim.photo_social_url} label="Red social" />
      </div>

      {claim.status === 'rejected' && claim.rejection_reason && (
        <div className="mt-3 text-[11.5px] text-danger border border-danger/30 rounded-lg px-3 py-2">
          Motivo: {claim.rejection_reason}
        </div>
      )}

      {isPending && rejecting && (
        <div className="mt-3">
          <label className="block text-[10px] font-mono tracking-widest text-muted mb-1.5">MOTIVO DEL RECHAZO (se lo enviamos al reclamante)</label>
          <textarea
            autoFocus
            className="w-full bg-base border border-border-mid text-white px-3 py-2 rounded-sm text-sm outline-none font-sans resize-none"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: las fotos no coinciden con el club, no se pudo verificar el vínculo..."
          />
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <Link to={`/u/${claim.requester_username}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
          <PlayerAvatar name={claim.requester_name} src={claim.requester_avatar_url} size={22} />
          <span className="text-muted text-[11px] font-mono truncate">@{claim.requester_username}</span>
        </Link>
        {isPending && (
          <div className="flex gap-2">
            {rejecting ? (
              <>
                <button disabled={busy} onClick={cancelReject}
                  className="text-[11px] font-condensed font-bold tracking-widest text-muted px-2.5 py-1.5 rounded cursor-pointer disabled:opacity-50">
                  CANCELAR
                </button>
                <button disabled={busy || !reason.trim()} onClick={confirmReject}
                  className="inline-flex items-center gap-1 text-[11px] font-condensed font-bold tracking-widest text-danger border border-danger/40 hover:bg-danger/10 px-2.5 py-1.5 rounded cursor-pointer disabled:opacity-50">
                  <X size={12} /> CONFIRMAR RECHAZO
                </button>
              </>
            ) : (
              <>
                <button disabled={busy} onClick={startReject}
                  className="inline-flex items-center gap-1 text-[11px] font-condensed font-bold tracking-widest text-danger border border-danger/40 hover:bg-danger/10 px-2.5 py-1.5 rounded cursor-pointer disabled:opacity-50">
                  <X size={12} /> RECHAZAR
                </button>
                <button disabled={busy} onClick={() => onAction(claim, 'approve')}
                  className="inline-flex items-center gap-1 text-[11px] font-condensed font-bold tracking-widest text-base bg-brand hover:opacity-90 px-2.5 py-1.5 rounded cursor-pointer disabled:opacity-50">
                  <Check size={12} /> APROBAR
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminClubClaims() {
  const { showToast } = useToast()
  const [tab, setTab]         = useState('pending')
  const [claims, setClaims]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [busyId, setBusyId]   = useState(null)

  const fetchClaims = useCallback(async (status) => {
    setLoading(true)
    try {
      setClaims(await api.clubs.claims.list(status))
      setError(null)
    } catch (e) { setError(e.message) }
    finally     { setLoading(false) }
  }, [])

  useEffect(() => { fetchClaims(tab) }, [tab, fetchClaims])

  async function onAction(claim, action, rejectionReason) {
    setBusyId(claim.id)
    try {
      await api.clubs.claims.respond(claim.id, action, rejectionReason)
      showToast(action === 'approve' ? 'Club asignado al reclamante' : 'Reclamo rechazado', action === 'approve' ? 'success' : 'info')
      await fetchClaims(tab)
    } catch (e) { setError(e.message) }
    finally     { setBusyId(null) }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <Link to="/admin" className="inline-flex items-center gap-1 text-muted hover:text-white text-xs font-mono mb-3 transition-colors">
        <ArrowLeft size={12} /> Dashboard
      </Link>

      <h1 className="font-condensed font-black text-2xl tracking-widest text-white mb-1">
        RECLAMOS DE CLUB <span className="text-brand">/ ADMIN</span>
      </h1>
      <p className="text-muted text-xs font-mono mb-5">Verificá quién dice ser el dueño de cada club antes de darle el panel</p>

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
          {claims.length === 0 && <p className="text-muted text-xs font-mono py-8 text-center">Sin reclamos.</p>}
          {claims.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} onAction={onAction} busy={busyId === claim.id} />
          ))}
        </div>
      )}
    </div>
  )
}
