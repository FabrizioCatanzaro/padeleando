import { ChevronRight, Lock } from 'lucide-react';
import ClubTile from './ClubTile';
import { LevelTag } from './tournament/CardBits';
import { roleWords, dateLabel } from '../../utils/homePanel';
import { fmtHora } from '../../utils/helpers';
import { countLabel, levelShort } from '../../utils/tournamentCard';

export default function CategoryRow({ g, next = null, live = false, eager = false, third = false, onClick }) {
  const meta = roleWords(g.role, third);
  const raw  = next ? dateLabel(next.event_date) : null;
  const day  = raw ? raw.charAt(0) + raw.slice(1).toLowerCase() : null;
  const hora = next ? fmtHora(next.event_time) : '';
  const facts = [
    countLabel(g.player_count ?? 0, 'jugador', 'jugadores'),
    countLabel(g.tournament_count ?? 0, 'torneo', 'torneos'),
  ].join(', ');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className="flex items-center gap-3.5 px-4 py-3 border-b border-border last:border-0 bg-surface hover:bg-surface-alt transition-colors cursor-pointer outline-none focus-visible:bg-surface-alt focus-visible:outline-2 focus-visible:outline-brand focus-visible:-outline-offset-2"
    >
      <ClubTile photo={g.club_photo_url} emojis={g.emojis} name={g.club_name} eager={eager} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <LevelTag level={levelShort(g.level)} />
          <span className="font-sans font-bold text-[15.5px] text-white leading-tight truncate">{g.name}</span>
          {live && (
            <span className="inline-flex items-center gap-1.5 font-sans text-[12px] font-semibold text-danger shrink-0">
              <span className="w-[7px] h-[7px] rounded-full bg-current animate-pulse motion-reduce:animate-none" />En vivo
            </span>
          )}
          {g.is_public === false && <Lock size={12} className="text-secondary shrink-0" aria-label="Privada" />}
        </div>

        <div className="flex items-center gap-2 font-sans text-[12.5px] text-secondary mt-1 min-w-0 whitespace-nowrap">
          {(g.owner_name || g.owner_username) && <span className="text-content truncate shrink-0 max-w-[40%]">{g.owner_name ?? `@${g.owner_username}`}</span>}
          <span className="text-muted shrink-0">{facts}</span>
          {g.club_name && <span className="truncate">{g.club_name}</span>}
        </div>
      </div>

      {day && (
        <span className="hidden sm:block font-sans text-[12.5px] font-semibold text-content shrink-0 text-right whitespace-nowrap">
          {day}{hora && `, ${hora}`}
        </span>
      )}
      <span className={`font-sans text-[11.5px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0 ${meta.cls}`}>
        {meta.tag}
      </span>
      <ChevronRight size={15} className="text-dim shrink-0 hidden sm:block" aria-hidden="true" />
    </div>
  );
}
