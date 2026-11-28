import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { groupBookings } from '../../utils/bookings'
import { formatMoney } from '../../utils/money'
import { DAYS, dayGridIndex, todayLocalStr } from './scheduleGrid'

// Próximas reservas propias en este club, con la opción de cancelar
export default function ClubMyBookings({ club, refreshKey }) {
  const { isLoggedIn } = useAuth()
  const { showToast } = useToast()
  const [rows, setRows] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    api.bookings.mine().then((r) => { if (!cancelled) setRows(r) }).catch(() => { if (!cancelled) setRows([]) })
    return () => { cancelled = true }
  }, [isLoggedIn, refreshKey])

  const mine = useMemo(() => {
    const today = todayLocalStr()
    return groupBookings((rows ?? []).filter((r) => r.club_id === club.id))
      .filter((g) => g.status !== 'rejected' && g.date >= today)
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
  }, [rows, club.id])

  async function cancel(groupId) {
    setBusy(groupId)
    try {
      await api.bookings.cancelMine(groupId, {})
      setRows((rs) => rs.map((r) => (r.group_id === groupId ? { ...r, status: 'rejected' } : r)))
      showToast('Reserva cancelada. El club ya recibió el aviso.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setBusy(null)
    }
  }

  if (!isLoggedIn || !mine.length) return null
  return (
    <section aria-labelledby="bk-mine" className="flex-[1_1_360px] rounded-xl border border-border-mid bg-surface p-4 sm:p-5">
      <h2 id="bk-mine" className="m-0 mb-3 font-condensed font-bold text-[15px] text-white">Tus reservas en este club</h2>
      <div className="flex flex-col gap-2">
        {mine.slice(0, 3).map((g) => (
          <div key={g.group_id} className="flex items-center gap-3.5 border border-border-mid rounded-xl px-3.5 py-3">
            <span className="w-12 text-center shrink-0">
              <span className="block text-[12px] text-secondary">{DAYS[dayGridIndex(g.date)].abbr}</span>
              <span className="block font-condensed font-black text-[18px] text-white">{Number(g.date.slice(8))}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-white text-sm">{g.startTime} a {g.endTime}{g.court_name ? ` · ${g.court_name}` : ''}</span>
              <span className={`flex items-center gap-1.5 text-[12px] mt-1 ${g.status === 'confirmed' ? 'text-green' : 'text-premium'}`}>
                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${g.status === 'confirmed' ? 'bg-green' : 'bg-premium'}`} />
                {g.status === 'confirmed' ? 'Confirmada' : 'Esperando al club'}
                {g.totalPrice != null && <span className="text-secondary"> · {formatMoney(g.totalPrice)}</span>}
              </span>
            </span>
            <button type="button" onClick={() => cancel(g.group_id)} disabled={busy === g.group_id}
              className="shrink-0 min-h-10 px-3 rounded-lg border border-border-strong bg-transparent text-content text-[13px] font-semibold cursor-pointer hover:text-white disabled:opacity-50">
              Cancelar
            </button>
          </div>
        ))}
      </div>
      <Link to="/perfil" className="inline-block mt-3 text-[13px] font-bold text-brand no-underline hover:underline">Ver todas mis reservas</Link>
    </section>
  )
}
