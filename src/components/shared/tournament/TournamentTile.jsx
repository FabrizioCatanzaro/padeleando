import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import PlayerAvatar from '../PlayerAvatar'
import ClubTile from '../ClubTile'
import { DateChip } from './DateStub'
import { CardTags, StatusText } from './CardBits'
import { formatPhoto } from '../../../utils/tournamentCard'

/** Card con foto: flyer, portada de la galería o la foto del formato. */
export default function TournamentTile({ m, to, footer = null, className = '' }) {
  const src = m.image ?? formatPhoto(m.format)
  const place = [m.clubName, m.place].filter(Boolean).join(', ')
  return (
    <article className={`relative grid grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[108px_minmax(0,1fr)] gap-3.5 p-3 rounded-[14px] bg-surface border border-border hover:border-border-strong transition-colors has-[a.tile-link:focus-visible]:outline-2 has-[a.tile-link:focus-visible]:outline-brand ${className}`}>
      <span className="relative w-24 sm:w-27 h-32 sm:h-36 rounded-[10px] overflow-hidden bg-surface-alt">
        <img src={src} alt="" width="108" height="144" loading="lazy"
          className={`w-full h-full object-cover ${m.status === 'finished' ? 'grayscale-[.85] brightness-80' : ''}`} />
        <DateChip day={m.day} live={m.status === 'live'} />
      </span>

      <span className="min-w-0 flex flex-col">
        <span className="flex items-center justify-between gap-2">
          <CardTags m={m} />
          <StatusText status={m.statusText} className="shrink-0 text-[12px]" />
        </span>
        <Link to={to} className="tile-link font-sans font-bold text-[16px] text-white leading-tight mt-2 mb-1 line-clamp-2 no-underline outline-none after:absolute after:inset-0 after:content-['']">{m.name}</Link>
        {m.ownerName && (
          <span className="flex items-center gap-1.5 mt-1 font-sans text-[12.5px] min-w-0 whitespace-nowrap">
            <PlayerAvatar name={m.ownerName} src={m.ownerAvatar} size={18} />
            <span className="text-content truncate shrink-0 max-w-[55%]">{m.ownerName}</span>
            {m.groupName && <span className="text-muted truncate">{m.groupName}</span>}
          </span>
        )}
        {place && (
          <span className="flex items-center gap-1.5 mt-1 font-sans text-[12.5px] text-secondary min-w-0 whitespace-nowrap">
            {m.clubPhoto
              ? <ClubTile photo={m.clubPhoto} name={m.clubName} size={18} round />
              : <MapPin size={14} className="shrink-0 text-muted mx-0.5" aria-hidden="true" />}
            <span className="truncate">{place}</span>
          </span>
        )}
        {footer && <span className="mt-auto pt-3"><span className="block pt-2.5 border-t border-border font-sans text-[12.5px]">{footer}</span></span>}
      </span>
    </article>
  )
}
