import { Link } from 'react-router-dom'
import PlayerAvatar from '../../shared/PlayerAvatar'
import { userHasRole } from '../../../utils/plan'

function Stat({ value, label, brand }) {
  return (
    <div>
      <div className={`font-condensed font-bold text-[18px] leading-none ${brand ? 'text-brand' : 'text-white'}`}>{value}</div>
      <div className="font-sans text-[9.5px] font-bold tracking-[1.5px] text-muted mt-1.5">{label}</div>
    </div>
  )
}

export default function ResumenCard({ user, stats }) {
  return (
    <div className="p-4.5 rounded-2xl bg-surface border border-border-mid">
      <div className="flex items-center gap-3">
        <PlayerAvatar name={user?.name} src={user?.avatar_url ?? null} size={44} premium={userHasRole(user, 'jugador')} />
        <div className="min-w-0">
          <div className="font-sans font-bold text-[14px] text-white truncate">{user?.name}</div>
          <div className="font-sans text-[12px] text-secondary truncate">@{user?.username}{user?.category && ` · ${user.category}`}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4 min-h-[37px]">
        {stats && (
          <>
            <Stat value={stats.partidos} label="PARTIDOS" />
            <Stat value={stats.win_pct != null ? `${stats.win_pct}%` : '—'} label="GANADOS" brand />
            <Stat value={stats.titulos} label="TÍTULOS" />
          </>
        )}
      </div>
      <Link to={`/u/${user?.username}`} className="inline-block mt-4 font-sans text-[12px] font-bold text-brand no-underline hover:underline">Ver mi perfil →</Link>
    </div>
  )
}
