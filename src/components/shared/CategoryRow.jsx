import { ChevronRight, Building2, Lock, Radio } from 'lucide-react';
import ClubTile from './ClubTile';
import { roleWords, dateLabel } from '../../utils/homePanel';
import { fmtHora } from '../../utils/helpers';

const Dot = () => <span className="opacity-40">·</span>;

export default function CategoryRow({ g, next = null, live = false, eager = false, third = false, onClick }) {
  const meta = roleWords(g.role, third);
  const day  = next ? dateLabel(next.event_date) : null;
  const hora = next ? fmtHora(next.event_time) : '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className="flex items-center gap-3.5 px-4 py-3 border-b border-border last:border-0 bg-surface hover:bg-surface-alt transition-colors cursor-pointer outline-none focus-visible:bg-surface-alt"
    >
      <ClubTile photo={g.club_photo_url} emojis={g.emojis} name={g.club_name} eager={eager} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-condensed font-bold text-[15.5px] text-white leading-tight">{g.name}</span>
          {live && (
            <span className="inline-flex items-center gap-1 font-mono text-[9px] tracking-widest text-green border border-green/40 rounded-full px-1.5 py-0.5 shrink-0">
              <Radio size={9} />EN VIVO
            </span>
          )}
          {g.is_public === false && <Lock size={11} className="text-yellow-400/60 shrink-0" />}
        </div>

        <div className="flex items-center gap-2 flex-wrap font-mono text-[11.5px] text-muted mt-1">
          {g.owner_username && <><span>@{g.owner_username}</span><Dot /></>}
          <span>{g.player_count ?? 0} {g.player_count === 1 ? 'jugador' : 'jugadores'}</span>
          <Dot />
          <span>{g.tournament_count ?? 0} {g.tournament_count === 1 ? 'torneo' : 'torneos'}</span>
          {g.club_name && (
            <>
              <Dot />
              <span className="inline-flex items-center gap-1 text-secondary min-w-0">
                <Building2 size={10} className="shrink-0" />
                <span className="truncate">{g.club_name}</span>
              </span>
            </>
          )}
        </div>
      </div>

      {day && (
        <span className="hidden sm:block font-mono text-[11px] text-dim shrink-0 text-right whitespace-nowrap">
          {day}{hora && ` · ${hora}`}
        </span>
      )}
      <span className={`font-condensed font-bold text-[9.5px] tracking-widest px-2 py-1 rounded shrink-0 ${meta.cls}`}>
        {meta.tag}
      </span>
      <ChevronRight size={15} className="text-dim shrink-0 hidden sm:block" />
    </div>
  );
}
