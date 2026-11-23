import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Loader2, LogIn, Check } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { isFilled, matchMeta, playerName } from '../../utils/friendlies'
import Btn from '../shared/Btn'
import PlayerAvatar from '../shared/PlayerAvatar'
import { DayBlock, StatusChip } from './parts'

export default function FriendlyInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn } = useAuth()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useDocumentTitle('Invitación a un amistoso')

  useEffect(() => {
    api.friendlies.inviteInfo(token)
      .then(setData)
      .catch((e) => setError(e.status === 404 ? 'Este link ya se usó o no existe.' : e.message))
  }, [token, isLoggedIn])

  async function claim() {
    setBusy(true)
    try {
      const { id } = await api.friendlies.claim(token)
      showToast(data.match.status === 'confirmado' ? 'Listo: el amistoso ya suma a tu perfil' : 'Listo: ya estás en el partido')
      navigate(`/amistoso/${id}`, { replace: true })
    } catch (e) {
      showToast(e.message, 'error')
      setBusy(false)
    }
  }

  if (error) return <p className="max-w-xl mx-auto px-4 py-10 text-[14px] text-secondary">{error}</p>
  if (!data) return <div className="min-h-screen flex justify-center pt-16"><Loader2 size={20} className="animate-spin text-muted" /></div>

  const { match: m, slot } = data
  const back = encodeURIComponent(location.pathname)
  const team = (t) => (
    <div className="flex-1 min-w-0 flex flex-col gap-2">
      <span className="text-[10px] tracking-[0.14em] text-secondary font-bold">EQUIPO {t}</span>
      {m.players.filter((p) => p.team === t).map((p) => {
        const mine = p.team === slot.team && p.position === slot.position
        const name = isFilled(p) ? playerName(p) : 'Lugar libre'
        return (
          <div key={`${p.team}${p.position}`}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${mine ? 'bg-brand/10 border border-brand/40' : ''}`}>
            <PlayerAvatar name={name} src={p.user?.avatar_url} size={28} />
            <span className={`text-[13px] truncate ${mine ? 'text-brand font-bold' : isFilled(p) ? 'text-white' : 'text-muted'}`}>
              {name}
            </span>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-12 font-sans flex flex-col gap-5">
      <div>
        <div className="text-[11px] tracking-[0.18em] text-secondary font-bold">INVITACIÓN</div>
        <h1 className="m-0 mt-1 font-condensed font-extrabold text-[26px] text-white leading-tight">Tu lugar en un amistoso</h1>
        <p className="m-0 mt-2 text-[14px] text-content leading-snug">
          {m.creator?.name ?? 'El creador'} te anotó como <strong className="text-white">{slot.guest_name}</strong>.
          Vinculá el lugar a tu cuenta para que el partido sume a tu perfil.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-3.5 flex flex-col gap-3">
        <div className="flex gap-3">
          <DayBlock date={m.date} time={m.start_time} />
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-semibold text-white truncate">{m.club.name}</span>
              <StatusChip status={m.status} />
            </div>
            <span className="text-[12px] text-secondary">{matchMeta(m)}</span>
            {m.result && (
              <span className="text-[13px] text-white font-bold">
                Resultado: equipo 1 {m.result.score1} - {m.result.score2} equipo 2
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3 pt-3 border-t border-border">
          {team(1)}
          {team(2)}
        </div>
      </div>

      {data.error ? (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-[14px] text-secondary">{data.error}.</p>
          {data.error === 'Ya estás en este partido' && (
            <Btn size="lg" full onClick={() => navigate(`/amistoso/${m.id}`)}>Ver el partido</Btn>
          )}
        </div>
      ) : isLoggedIn ? (
        <Btn variant="primary" size="lg" full icon={Check} disabled={busy} onClick={claim}>
          {busy ? 'VINCULANDO…' : 'ES MI LUGAR: VINCULARLO'}
        </Btn>
      ) : (
        <div className="flex flex-col gap-2.5">
          <p className="m-0 text-[13px] text-secondary">Necesitás una cuenta. Después volvés a esta pantalla.</p>
          <Btn variant="primary" size="lg" full icon={LogIn} onClick={() => navigate(`/login?redirect=${back}`)}>INICIAR SESIÓN</Btn>
          <Btn size="lg" full onClick={() => navigate(`/register?redirect=${back}`)}>Crear cuenta gratis</Btn>
        </div>
      )}

      <Link to="/partidos" className="text-[13px] text-muted no-underline hover:text-brand self-center">Ver partidos abiertos</Link>
    </div>
  )
}
