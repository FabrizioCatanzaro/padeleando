import { Link } from 'react-router-dom'
import { Lock, MapPin, Navigation } from 'lucide-react'
import ClubTile from '../ClubTile'
import PlayerAvatar from '../PlayerAvatar'
import { LevelTag } from '../tournament/CardBits'
import { countLabel, dateParts, levelShort } from '../../../utils/tournamentCard'

/** Card de categoría con el mismo lenguaje que la de torneo. */
export default function CategoryTile({ g, to, badge = null, className = '' }) {
  const level = levelShort(g.level)
  const place = [g.club_name, g.location_name].filter(Boolean).join(', ')
  const next = dateParts(g.next_date)
  const counts = [
    g.player_count != null && countLabel(g.player_count, 'jugador', 'jugadores'),
    g.tournament_count != null && countLabel(g.tournament_count, 'torneo', 'torneos'),
  ].filter(Boolean).join(', ')
  return (
    <article className={`relative grid grid-cols-[64px_minmax(0,1fr)] gap-3.5 p-3 rounded-[14px] bg-surface border border-border hover:border-border-strong transition-colors has-[a.tile-link:focus-visible]:outline-2 has-[a.tile-link:focus-visible]:outline-brand ${className}`}>
      <ClubTile photo={g.club_photo_url} emojis={g.emojis} name={g.club_name ?? g.name} size={64} />

      <span className="min-w-0 flex flex-col">
        {(level || g.is_public === false) && (
          <span className="flex items-center gap-1.5 mb-1.5">
            <LevelTag level={level} />
            {g.is_public === false && <span className="inline-flex items-center gap-1 font-sans text-[12px] font-semibold text-secondary"><Lock size={12} aria-hidden="true" />Privada</span>}
          </span>
        )}
        <Link to={to} className="tile-link font-sans font-bold text-[16px] text-white leading-tight line-clamp-2 no-underline outline-none after:absolute after:inset-0 after:content-['']">{g.name}</Link>
        {g.description && <span className="font-sans text-[12.5px] text-secondary mt-1 line-clamp-2">{g.description}</span>}
        {(g.owner_name || g.owner_username) && (
          <span className="flex items-center gap-1.5 mt-1.5 font-sans text-[12.5px] text-content min-w-0 whitespace-nowrap">
            <PlayerAvatar name={g.owner_name ?? g.owner_username} src={g.owner_avatar_url} size={18} />
            <span className="truncate">{g.owner_name ?? `@${g.owner_username}`}</span>
          </span>
        )}
        {place && (
          <span className="flex items-center gap-1.5 mt-1 font-sans text-[12.5px] text-secondary min-w-0 whitespace-nowrap">
            <MapPin size={14} className="shrink-0 text-muted mx-0.5" aria-hidden="true" />
            <span className="truncate">{place}</span>
          </span>
        )}
        {(counts || next || g.distance_km != null || badge) && (
          <span className="mt-auto pt-3">
            <span className="flex items-center justify-between gap-2 pt-2.5 border-t border-border font-sans text-[12.5px]">
              <span className="text-secondary truncate">{counts}</span>
              <span className="flex items-center gap-2 shrink-0">
                {next && <span className="font-semibold text-white">Próximo: {next.dow} {next.day} {next.month}</span>}
                {g.distance_km != null && <span className="inline-flex items-center gap-1 font-semibold text-brand"><Navigation size={12} aria-hidden="true" />{g.distance_km} km</span>}
                {badge && <span className="font-bold text-green border border-green/35 rounded-full px-2 py-0.5">{badge}</span>}
              </span>
            </span>
          </span>
        )}
      </span>
    </article>
  )
}
