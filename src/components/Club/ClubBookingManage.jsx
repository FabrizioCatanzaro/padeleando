import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Phone } from 'lucide-react'
import { api } from '../../utils/api'
import { whatsappLink } from './clubForm'
import { formatMoney } from '../../utils/money'
import { fmtDate, fmtDateTime, groupBookings } from '../../utils/bookings'
import { useToast } from '../../context/useToast'
import Btn from '../shared/Btn'

const FILTERS = [
  { id: 'pending',   label: 'PENDIENTES' },
  { id: 'confirmed', label: 'CONFIRMADAS' },
  { id: 'rejected',  label: 'RECHAZADAS' },
]

// Gestión de reservas del dueño: aprobar/rechazar pendientes y liberar
// (cancelar) confirmadas. No refetchea después de decidir -- cada decisión
// se aplica sobre el estado local (mismo criterio de caché de siempre).
export default function ClubBookingManage({ club, onPendingCountChange }) {
  const { showToast } = useToast()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filter, setFilter]   = useState('pending')

  // `loading` arranca en `true` (ver useState de arriba) -- no hace falta
  // volver a ponerlo acá, esta pantalla se monta de nuevo por cada club.
  useEffect(() => {
    let cancelled = false
    api.clubs.bookings.manage(club.id)
      .then((data) => { if (!cancelled) { setRows(data); setError(null) } })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [club.id])

  const byStatus = useMemo(() => {
    const groups = groupBookings(rows)
    const byKey = (g) => `${g.date} ${g.startTime}`
    return {
      pending:   groups.filter((g) => g.status === 'pending').sort((a, b) => byKey(a).localeCompare(byKey(b))),
      confirmed: groups.filter((g) => g.status === 'confirmed').sort((a, b) => byKey(a).localeCompare(byKey(b))),
      rejected:  groups.filter((g) => g.status === 'rejected').sort((a, b) => (b.decided_at ?? '').localeCompare(a.decided_at ?? '')),
    }
  }, [rows])

  // El badge de la solapa RESERVAS vive en ClubProfileView (junto al resto
  // del club) -- se le avisa cada vez que cambia el conteo de pendientes acá
  // adentro (fetch inicial o después de decidir una), para que se actualice
  // al instante y no sólo la próxima vez que se recargue el club entero.
  const pendingCount = byStatus.pending.length
  useEffect(() => {
    onPendingCountChange?.(pendingCount)
  }, [pendingCount, onPendingCountChange])

  async function decide(groupId, status, decisionReason) {
    const result = await api.clubs.bookings.decide(club.id, groupId, { status, decision_reason: decisionReason })
    const bumped = new Set(result?.bumped_group_ids ?? [])
    const decidedAt = new Date().toISOString()
    const bumpedReason = 'El club confirmó otra reserva para este mismo horario.'
    setRows((rs) => rs.map((r) => (
      r.group_id === groupId
        ? { ...r, status, decision_reason: decisionReason ?? null, decided_at: decidedAt }
        : bumped.has(r.group_id)
          ? { ...r, status: 'rejected', decision_reason: bumpedReason, decided_at: decidedAt }
          : r
    )))
    showToast(
      status === 'confirmed' && bumped.size > 0
        ? `Turno confirmado. Se rechazaron ${bumped.size} solicitud${bumped.size === 1 ? '' : 'es'} pendiente${bumped.size === 1 ? '' : 's'} que se superponían, y se les avisó.`
        : status === 'confirmed' ? 'Turno confirmado' : 'Turno actualizado'
    )
  }

  if (loading) return <p className="text-xs font-mono text-dim">Cargando reservas...</p>
  if (error)   return <p className="text-xs font-mono text-danger">{error}</p>

  const list = byStatus[filter]

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-condensed font-bold tracking-wide border cursor-pointer transition-colors ${
              filter === f.id ? 'bg-brand text-base border-brand' : 'bg-transparent text-muted border-border-mid hover:text-white'
            }`}>
            {f.label}{byStatus[f.id].length > 0 ? ` (${byStatus[f.id].length})` : ''}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <p className="text-[12.5px] text-dim">
          No hay reservas {filter === 'pending' ? 'pendientes' : filter === 'confirmed' ? 'confirmadas' : 'rechazadas'}.
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {list.map((g) => (
          <BookingCard key={g.group_id} g={g} onDecide={decide} showToast={showToast} />
        ))}
      </div>
    </div>
  )
}

function BookingCard({ g, onDecide, showToast }) {
  const [busy, setBusy]           = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason]       = useState('')

  async function confirm() {
    setBusy(true)
    try { await onDecide(g.group_id, 'confirmed', null) }
    catch (e) { showToast(e.message, 'error') }
    finally { setBusy(false) }
  }

  async function submitReject() {
    if (!reason.trim()) return
    setBusy(true)
    try {
      await onDecide(g.group_id, 'rejected', reason.trim())
      setRejecting(false)
    } catch (e) { showToast(e.message, 'error') }
    finally { setBusy(false) }
  }

  // Si la hizo un usuario logueado (no un invitado), el dueño tiene que poder
  // ir a su perfil -- el nombre que llegó en la reserva puede no coincidir
  // con el de su cuenta (lo escribe a mano cada vez), así que el link usa el
  // @username real, no el guest_name.
  const waHref  = g.guest_contact ? whatsappLink(g.guest_contact) : ''
  const telHref = g.guest_contact ? `tel:${g.guest_contact.replace(/[^\d+]/g, '')}` : null

  return (
    <div className="border border-border-mid rounded-lg px-3.5 py-3">
      <div className="text-[13px] text-white font-sans">
        {fmtDate(g.date)} · {g.startTime} – {g.endTime} hs
      </div>
      <div className="text-[11px] font-mono text-dim mt-0.5">
        {g.court_name ? `${g.court_name} · ` : ''}{g.slotCount} {g.slotCount === 1 ? 'turno' : 'turnos'}
        {g.totalPrice != null ? ` · ${formatMoney(g.totalPrice)}` : ''}
      </div>
      <div className="text-[12px] text-muted font-sans mt-1.5 flex items-center gap-1.5 flex-wrap">
        {g.user_id && g.user_username ? (
          <Link to={`/u/${g.user_username}`} className="text-brand hover:underline font-semibold">{g.guest_name}</Link>
        ) : (
          <span>{g.guest_name}</span>
        )}
        {g.guest_contact && (
          <>
            <span className="opacity-40">·</span>
            {waHref ? (
              <a href={waHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
                <MessageCircle size={12} /> {g.guest_contact}
              </a>
            ) : telHref ? (
              <a href={telHref} className="inline-flex items-center gap-1 text-brand hover:underline">
                <Phone size={12} /> {g.guest_contact}
              </a>
            ) : (
              <span>{g.guest_contact}</span>
            )}
          </>
        )}
      </div>
      <div className="text-[10.5px] font-mono text-dim mt-1">
        Solicitado el {fmtDateTime(g.created_at)}
        {g.decided_at && ` · Decidido el ${fmtDateTime(g.decided_at)}`}
      </div>
      {g.status === 'rejected' && g.decision_reason && (
        <div className="text-[11px] font-mono text-dim mt-1.5">Motivo: {g.decision_reason}</div>
      )}

      {g.status === 'pending' && g.other_pending_count > 0 && (
        <div className="border border-premium/40 bg-premium/10 rounded-md px-2.5 py-2 mt-2.5">
          <p className="text-[11px] font-mono text-premium leading-relaxed">
            ⚠ Hay {g.other_pending_count} solicitud{g.other_pending_count === 1 ? '' : 'es'} más pendiente{g.other_pending_count === 1 ? '' : 's'} para este mismo horario. Si confirmás ésta, las demás se rechazan automáticamente y se les avisa a quienes reservaron.
          </p>
        </div>
      )}

      {g.status === 'pending' && !rejecting && (
        <div className="flex gap-2 mt-3">
          <Btn variant="primary" size="sm" onClick={confirm} loading={busy}>CONFIRMAR</Btn>
          <Btn variant="danger" size="sm" onClick={() => setRejecting(true)}>RECHAZAR</Btn>
        </div>
      )}

      {g.status === 'confirmed' && !rejecting && (
        <div className="flex gap-2 mt-3">
          <Btn variant="danger" size="sm" onClick={() => setRejecting(true)}>LIBERAR TURNO</Btn>
        </div>
      )}

      {rejecting && (
        <div className="mt-3">
          <label className="block text-[10px] font-mono tracking-widest text-muted mb-1.5">
            {g.status === 'confirmed' ? 'MOTIVO DE LA LIBERACIÓN (*)' : 'MOTIVO DEL RECHAZO (*)'}
          </label>
          <textarea
            className="w-full bg-surface border border-border-mid text-white px-3 py-2 rounded-sm text-sm outline-none font-sans"
            rows={2} value={reason} maxLength={200}
            onChange={(e) => setReason(e.target.value)}
            placeholder={g.status === 'confirmed' ? 'Ej: el club canceló por lluvia' : 'Ej: el horario ya no está disponible'}
          />
          <div className="flex gap-2 mt-2">
            <Btn variant="primary" size="sm" onClick={submitReject} loading={busy} disabled={!reason.trim()}>
              {g.status === 'confirmed' ? 'CONFIRMAR LIBERACIÓN' : 'CONFIRMAR RECHAZO'}
            </Btn>
            <Btn size="sm" onClick={() => { setRejecting(false); setReason('') }}>CANCELAR</Btn>
          </div>
        </div>
      )}
    </div>
  )
}
