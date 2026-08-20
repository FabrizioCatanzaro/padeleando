import { Radio, CalendarDays, ChevronRight, Building2 } from 'lucide-react';
import { dateLabel } from '../../utils/homePanel';
import { fmtHora } from '../../utils/helpers';

export function StatRail({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border rounded-xl overflow-hidden mb-4">
      {stats.map(({ n, label, brand }) => (
        <div key={label} className="bg-surface px-4 py-3">
          <div className={`font-condensed font-bold text-[22px] leading-none ${brand ? 'text-brand' : 'text-white'}`}>
            {n.toLocaleString('es-AR')}
          </div>
          <div className="font-mono text-[9.5px] tracking-widest text-muted mt-1.5 uppercase">{label}</div>
        </div>
      ))}
    </div>
  );
}

// Lo único de la portada que caduca en minutos. Antes sólo lo veía el visitante.
export function LiveBand({ tournaments, onOpen }) {
  const t = tournaments[0];
  if (!t) return null;
  const rest = tournaments.length - 1;
  const match = t.live_matches?.[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(t.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(t.id); } }}
      className="border border-green/35 rounded-xl px-4 py-4 mb-3 bg-surface cursor-pointer hover:border-green/60 transition-colors flex items-center gap-4 flex-wrap outline-none"
    >
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center gap-2 font-condensed font-bold text-[10px] tracking-widest text-green">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green" />
          </span>
          SE ESTÁ JUGANDO AHORA
        </span>
        <div className="font-condensed font-bold text-[19px] text-white mt-2 leading-tight">
          {t.group_emojis?.length > 0 && <span className="mr-1.5">{t.group_emojis.join(' ')}</span>}
          {t.name}
        </div>
        <div className="font-mono text-[11.5px] text-secondary mt-1 truncate">
          {t.group_name}{t.club_name && ` · ${t.club_name}`}
        </div>
        {match && (
          <div className="font-mono text-[11.5px] text-soft mt-1.5 truncate">
            {match.court != null && <span className="text-dim">C{match.court} · </span>}
            {match.team1Label} vs {match.team2Label}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {rest > 0 && <span className="font-mono text-[11px] text-dim">+{rest} más</span>}
        <Radio size={16} className="text-green" />
        <ChevronRight size={16} className="text-dim" />
      </div>
    </div>
  );
}

export function NextBand({ t, onOpen }) {
  if (!t) return null;
  const day = dateLabel(t.event_date);
  const hora = fmtHora(t.event_time);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(t.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(t.id); } }}
      className="border border-border-mid rounded-xl px-4 py-3.5 mb-6 bg-surface cursor-pointer hover:border-border-strong transition-colors flex items-center gap-3.5 flex-wrap outline-none"
    >
      <CalendarDays size={16} className="text-brand shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-condensed font-bold text-[15px] text-white leading-tight">
          <span className="text-muted font-sans font-normal text-[13px] mr-1.5">Próxima:</span>
          {t.group_emojis?.length > 0 && <span className="mr-1.5">{t.group_emojis.join(' ')}</span>}
          {t.name}
        </div>
        <div className="flex items-center gap-2 flex-wrap font-mono text-[11.5px] text-muted mt-1">
          {day && <span className="text-brand">{day}{hora && ` · ${hora}`}</span>}
          {t.club_name && (
            <>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1 min-w-0">
                <Building2 size={10} className="shrink-0" /><span className="truncate">{t.club_name}</span>
              </span>
            </>
          )}
          {t.player_count > 0 && (
            <><span className="opacity-40">·</span><span>{t.player_count} anotados</span></>
          )}
        </div>
      </div>
      <ChevronRight size={16} className="text-dim shrink-0" />
    </div>
  );
}
