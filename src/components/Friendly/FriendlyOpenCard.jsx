import { Link } from 'react-router-dom'
import { Lock, Plus } from 'lucide-react'
import { formatMoney } from '../../utils/money'
import { freeCount, isFilled, playerName, STYLE_LABEL } from '../../utils/friendlies'
import PlayerAvatar from '../shared/PlayerAvatar'
import { LevelChip } from './parts'

function Slot({ p }) {
  if (!isFilled(p)) return (
    <span className="flex items-center gap-2 h-9 px-2 rounded-[10px] border border-dashed border-brand/45">
      <span className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-brand" aria-hidden="true"><Plus size={13} strokeWidth={3} /></span>
      <span className="font-sans text-[12px] font-semibold text-brand">Libre</span>
    </span>
  )
  return (
    <span className="flex items-center gap-2 h-9 px-2 rounded-[10px] border border-border-mid bg-surface-alt min-w-0">
      <PlayerAvatar name={playerName(p)} src={p.user?.avatar_url ?? null} size={24} />
      <span className="flex-1 min-w-0 font-sans text-[12px] font-semibold text-white truncate">{playerName(p)}</span>
      {p.user?.category && <span className="font-sans text-[10px] font-bold text-dim shrink-0">{p.user.category}</span>}
    </span>
  )
}

function Team({ players, team }) {
  const slots = [1, 2].map((pos) => players.find((p) => p.team === team && p.position === pos) ?? { team, position: pos })
  return (
    <span className="flex-1 min-w-0 flex flex-col gap-1.5">
      {slots.map((p) => <Slot key={p.position} p={p} />)}
    </span>
  )
}

// Tarjeta de Partidos › Explorar: los dos equipos con sus lugares libres, como en el detalle "duelo".
export default function FriendlyOpenCard({ m }) {
  const libres = freeCount(m.players)
  const where = [m.club.name, m.court_label, m.distance_km != null && `a ${m.distance_km} km`].filter(Boolean).join(' · ')
  return (
    <Link to={`/amistoso/${m.id}`}
      className="flex flex-col gap-3 p-4 rounded-2xl bg-surface border border-border-mid no-underline hover:border-border-strong transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-condensed font-bold text-[20px] text-white leading-none">{m.start_time}</span>
            <span className="font-sans text-[12px] text-secondary">{m.duration_minutes} min</span>
          </div>
          <div className="font-sans text-[12px] text-secondary mt-1.5 truncate">{where}</div>
        </div>
        {m.price_per_person != null && (
          <div className="text-right shrink-0">
            <div className="font-sans font-bold text-[14px] text-white">{formatMoney(m.price_per_person)}</div>
            <div className="font-sans text-[11px] text-muted">por persona</div>
          </div>
        )}
      </div>

      <div className="flex items-stretch gap-2.5">
        <Team players={m.players} team={1} />
        <Team players={m.players} team={2} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {m.style && <span className="font-sans text-[11px] font-semibold text-content border border-border-strong rounded-full px-2.5 py-0.5">{STYLE_LABEL[m.style]}</span>}
        <LevelChip level={m.level} />
        {m.visibility === 'link' && (
          <span className="inline-flex items-center gap-1 font-sans text-[11px] font-semibold text-brand"><Lock size={11} strokeWidth={2.5} />Privado</span>
        )}
        <span className="flex-1" />
        <span className="font-sans text-[12px] font-extrabold text-brand">{libres === 1 ? 'Falta 1' : `Faltan ${libres}`}</span>
        {m.viewer?.team
          ? <span className="h-9 px-3 rounded-[9px] border border-green/40 text-green font-sans font-bold text-[12px] inline-flex items-center">Estás anotado</span>
          : <span className="h-9 px-4 rounded-[9px] bg-brand text-black font-sans font-extrabold text-[12px] inline-flex items-center">Sumarme</span>}
      </div>
    </Link>
  )
}
