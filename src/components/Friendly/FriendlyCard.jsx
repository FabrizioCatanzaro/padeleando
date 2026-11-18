import { Link } from 'react-router-dom'
import { formatMoney } from '../../utils/money'
import { freeCount, matchMeta } from '../../utils/friendlies'
import { DayBlock, LevelChip, MiniLineup, StatusChip } from './parts'

export default function FriendlyCard({ m, showStatus = false }) {
  const libres = freeCount(m.players)
  const needs = m.viewer?.needs_action
  return (
    <Link to={`/amistoso/${m.id}`}
      className={`flex flex-col gap-3 p-3.5 rounded-lg border no-underline transition-colors ${needs ? 'bg-brand/5 border-brand/40 hover:border-brand' : 'bg-surface border-border hover:border-border-strong'}`}>
      <div className="flex gap-3">
        <DayBlock date={m.date} time={m.start_time} />
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14px] font-semibold text-white truncate">{m.club.name}</span>
            <LevelChip level={m.level} />
          </div>
          <span className="text-[12px] text-secondary">{matchMeta(m)}</span>
          {m.price_per_person != null && (
            <span className="text-[12px] text-white">{formatMoney(m.price_per_person)} c/u</span>
          )}
          {m.distance_km != null && <span className="text-[11.5px] text-muted">A {m.distance_km} km</span>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
        <MiniLineup players={m.players} />
        {showStatus
          ? <StatusChip status={m.status} highlight={needs} extra={needs ? 'TE TOCA' : null} />
          : <span className="text-[12px] font-bold text-brand">{libres === 1 ? '1 libre' : `${libres} libres`}</span>}
      </div>
    </Link>
  )
}
