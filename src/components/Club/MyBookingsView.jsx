import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import { api } from '../../utils/api'
import { formatMoney } from '../../utils/money'
import { fmtDate, fmtDateTime, groupBookings } from '../../utils/bookings'
import { useToast } from '../../context/useToast'
import Btn from '../shared/Btn'

const FILTERS = [
  { id: 'pending',   label: 'PENDIENTES' },
  { id: 'confirmed', label: 'CONFIRMADAS' },
  { id: 'rejected',  label: 'RECHAZADAS' },
]

// "Mis reservas": el reverso de ClubBookingManage.jsx -- mismo patrón visual
// (tarjetas agrupadas por group_id, filtros por estado), pero del lado del
// jugador: en vez de "quién reservó" muestra EN QUÉ CLUB, y en vez de
// aprobar/rechazar deja cancelar la reserva propia (pendiente o confirmada).
// Vive en la solapa "RESERVAS" del perfil propio (ver ProfileView.jsx) --
// nunca se monta en el perfil de otra persona. No refetchea después de
// cancelar -- misma disciplina de caché de siempre.
export default function MyBookingsView() {
  const { showToast } = useToast()
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filter, setFilter]   = useState('pending')

  useEffect(() => {
    let cancelled = false
    api.bookings.mine()
      .then((data) => { if (!cancelled) { setRows(data); setError(null) } })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const byStatus = useMemo(() => {
    const groups = groupBookings(rows)
    const byKey = (g) => `${g.date} ${g.startTime}`
    return {
      pending:   groups.filter((g) => g.status === 'pending').sort((a, b) => byKey(a).localeCompare(byKey(b))),
      confirmed: groups.filter((g) => g.status === 'confirmed').sort((a, b) => byKey(a).localeCompare(byKey(b))),
      rejected:  groups.filter((g) => g.status === 'rejected').sort((a, b) => (b.decided_at ?? '').localeCompare(a.decided_at ?? '')),
    }
  }, [rows])

  async function cancel(groupId, reason) {
    const result = await api.bookings.cancelMine(groupId, { decision_reason: reason || undefined })
    setRows((rs) => rs.map((r) => (
      r.group_id === groupId
        ? { ...r, status: 'rejected', decision_reason: result.decision_reason, decided_at: new Date().toISOString() }
        : r
    )))
    showToast('Reserva cancelada')
  }

  if (loading) return <p className="text-xs font-mono text-dim">Cargando tus reservas...</p>
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
          No tenés reservas {filter === 'pending' ? 'pendientes' : filter === 'confirmed' ? 'confirmadas' : 'rechazadas'}.
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {list.map((g) => (
          <MyBookingCard key={g.group_id} g={g} onCancel={cancel} showToast={showToast} />
        ))}
      </div>
    </div>
  )
}

function MyBookingCard({ g, onCancel, showToast }) {
  const [busy, setBusy]             = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason]         = useState('')

  async function submitCancel() {
    setBusy(true)
    try {
      await onCancel(g.group_id, reason.trim())
      setCancelling(false)
    } catch (e) { showToast(e.message, 'error') }
    finally { setBusy(false) }
  }

  return (
    <div className="border border-border-mid rounded-lg px-3.5 py-3">
      <Link to={`/club/${g.club_id}`} className="flex items-center gap-2 mb-1.5 no-underline group">
        {g.club_photo_url ? (
          <img src={g.club_photo_url} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
        ) : (
          <div className="w-6 h-6 rounded bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
            <LayoutGrid size={12} />
          </div>
        )}
        <span className="text-[13px] text-white font-sans font-semibold group-hover:text-brand transition-colors truncate">
          {g.club_name}
        </span>
      </Link>
      <div className="text-[13px] text-white font-sans">
        {fmtDate(g.date)} · {g.startTime} – {g.endTime} hs
      </div>
      <div className="text-[11px] font-mono text-dim mt-0.5">
        {g.court_name ? `${g.court_name} · ` : ''}{g.slotCount} {g.slotCount === 1 ? 'turno' : 'turnos'}
        {g.totalPrice != null ? ` · ${formatMoney(g.totalPrice)}` : ''}
      </div>
      <div className="text-[10.5px] font-mono text-dim mt-1">
        Solicitado el {fmtDateTime(g.created_at)}
        {g.decided_at && ` · Decidido el ${fmtDateTime(g.decided_at)}`}
      </div>
      {g.status === 'rejected' && g.decision_reason && (
        <div className="text-[11px] font-mono text-dim mt-1.5">Motivo: {g.decision_reason}</div>
      )}

      {(g.status === 'pending' || g.status === 'confirmed') && !cancelling && (
        <div className="flex gap-2 mt-3">
          <Btn variant="danger" size="sm" onClick={() => setCancelling(true)}>
            {g.status === 'pending' ? 'CANCELAR SOLICITUD' : 'CANCELAR RESERVA'}
          </Btn>
        </div>
      )}

      {cancelling && (
        <div className="mt-3">
          <label className="block text-[10px] font-mono tracking-widest text-muted mb-1.5">MOTIVO (OPCIONAL)</label>
          <textarea
            className="w-full bg-surface border border-border-mid text-white px-3 py-2 rounded-sm text-sm outline-none font-sans"
            rows={2} value={reason} maxLength={200}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: cambié de planes"
          />
          <div className="flex gap-2 mt-2">
            <Btn variant="primary" size="sm" onClick={submitCancel} loading={busy}>CONFIRMAR CANCELACIÓN</Btn>
            <Btn size="sm" onClick={() => { setCancelling(false); setReason('') }}>VOLVER</Btn>
          </div>
        </div>
      )}
    </div>
  )
}
