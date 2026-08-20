import { Users, User, Flame, Trophy, Building2, Ticket } from 'lucide-react';
import FadeInCard from '../shared/FadeInCard';
import ClubTile from '../shared/ClubTile';
import {
  fmt, fmtHora, tournamentDisplayStatus, isAmericanoDraft, isLive, TOURNAMENT_STATUS_META,
} from '../../utils/helpers';
import { resolveSignup, showsSignup, formatPrice, CONTACT_META, contactHref } from '../../utils/signup';

// El acento vertical de 3px reemplazó a la franja de 28px con el formato
// rotado: esa columna se comía el ancho en mobile y fijaba dos colores a mano,
// uno de ellos (#63b3ed) fuera del theme.
const ACCENT = {
  draft:    'bg-brand',
  upcoming: 'bg-cyan',
  active:   'bg-green',
  live:     'bg-danger',
  finished: 'bg-border-strong',
};

const STATUS_TEXT = {
  draft: 'text-brand', upcoming: 'text-cyan', active: 'text-green',
  live: 'text-danger', finished: 'text-muted',
};

export default function TournamentCard({ t, group, delay = 0, onClick }) {
  const isAmericano = t.format === 'americano';
  const count     = isAmericano ? t.pair_count : t.player_count;
  const CountIcon = isAmericano ? Users : User;

  const status = tournamentDisplayStatus({
    status: t.status,
    hasLiveMatch: isLive(t),
    hasPlayed: (t.match_count ?? 0) > 0,
    isDraft: isAmericanoDraft({ format: t.format, pairCount: t.pair_count }),
  });
  const meta = TOURNAMENT_STATUS_META[status];
  const StatusIcon = meta.icon;

  // La inscripción se hereda de la categoría, así que sin las guardas de
  // showsSignup la insignia aparecería en todas las jornadas.
  const signup = resolveSignup(t, group, group?.owner_social_links);
  const showSignup = showsSignup(t, signup);
  const price = formatPrice(signup.price, signup.unit);
  const contacts = (signup.contacts ?? []).slice(0, 3);

  return (
    <FadeInCard
      delay={delay}
      className="border border-border-mid rounded-xl cursor-pointer overflow-hidden card-link flex"
      style={{ background: 'linear-gradient(150deg, var(--color-surface) 0%, var(--color-border) 100%)' }}
      onClick={onClick}
    >
      <span className={`w-[3px] shrink-0 ${ACCENT[status]}`} aria-hidden="true" />

      <div className="px-4 py-3.5 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-condensed font-bold text-[9px] tracking-widest px-1.5 py-1 rounded-sm shrink-0 border ${
                isAmericano ? 'text-brand border-brand/35' : 'text-cyan border-cyan/35'
              }`}>
                {isAmericano ? 'AMERICANO' : 'LIGA'}
              </span>
              <span className="font-condensed font-bold text-[17px] text-white leading-tight">{t.name}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-1.5 font-mono text-[11.5px] text-muted">
              <span className={`inline-flex items-center gap-1.5 ${STATUS_TEXT[status]}`}>
                {StatusIcon
                  ? <StatusIcon size={11} className="shrink-0" />
                  : <span className={`w-1.5 h-1.5 rounded-full bg-current shrink-0 ${meta.pulse ? 'animate-pulse' : ''}`} />}
                {meta.label}
              </span>
              {count > 0 && (
                <><span className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1"><CountIcon size={10} className="shrink-0" />{count}</span></>
              )}
              {t.match_count > 0 && (
                <><span className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1"><Flame size={10} className="shrink-0" />{t.match_count}</span></>
              )}
              {!isAmericano && t.mode && (
                <><span className="opacity-40">·</span>
                <span>{t.mode === 'pairs' ? 'en parejas' : 'equipos libres'}</span></>
              )}
              {t.club_name && (
                <><span className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1.5 text-secondary min-w-0">
                  {t.club_photo_url
                    ? <ClubTile photo={t.club_photo_url} name={t.club_name} size={20} round />
                    : <Building2 size={10} className="shrink-0" />}
                  <span className="truncate">{t.club_name}</span>
                </span></>
              )}
            </div>
          </div>

          <div className="font-mono text-[11.5px] text-dim shrink-0 text-right leading-relaxed">
            {fmt(t.event_date ?? t.created_at)}
            {t.event_time && <><br /><span className="text-brand">{fmtHora(t.event_time)}</span></>}
          </div>
        </div>

        {/* Ganador e inscripción comparten renglón: son estados excluyentes
            —te anotás antes, ganás después— y así la tarjeta no cambia de alto. */}
        {t.status === 'finished' && t.winner_label && (
          <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border font-mono text-[12px] text-brand">
            <Trophy size={12} className="shrink-0" />
            <span className="text-muted">Ganó</span>
            <span className="font-condensed font-bold">{t.winner_label}</span>
          </div>
        )}

        {showSignup && (
          <div className="flex items-center gap-2.5 flex-wrap mt-2.5 pt-2.5 border-t border-border">
            <span className="inline-flex items-center gap-1.5 font-condensed font-bold text-[9px] tracking-widest bg-brand text-base px-2 py-1 rounded-sm shrink-0">
              <Ticket size={10} />INSCRIPCIÓN ABIERTA
            </span>
            {price && <span className="font-condensed font-bold text-[13.5px] text-brand">{price}</span>}
            {contacts.length > 0 && (
              <span className="flex items-center gap-1.5 ml-auto">
                {contacts.map((c) => {
                  const cm = CONTACT_META[c.type];
                  const href = contactHref(c, t.name);
                  if (!cm || !href) return null;
                  const Icon = cm.icon;
                  return (
                    <a
                      key={c.type}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 border border-border-strong rounded-full px-2 py-1 font-mono text-[10px] text-secondary hover:border-brand hover:text-brand transition-colors no-underline"
                    >
                      <Icon size={10} />{cm.label}
                    </a>
                  );
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </FadeInCard>
  );
}
