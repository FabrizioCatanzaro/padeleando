import { Trophy } from 'lucide-react'
import ClubTile from '../shared/ClubTile'
import TournamentRow from '../shared/tournament/TournamentRow'
import { cardModel, countLabel } from '../../utils/tournamentCard'
import { resolveSignup, showsSignup, formatPrice } from '../../utils/signup'

const byPairs = (t) => t.format !== 'liga'

function Slot({ t, m, group }) {
  if (t.status === 'finished' && t.winner_label) {
    return (
      <span className="flex items-start gap-2 font-bold text-brand">
        <Trophy size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
        <span className="line-clamp-2">{t.winner_label}</span>
      </span>
    )
  }
  // La inscripción se hereda de la categoría: sin showsSignup aparecería en todos los torneos.
  const signup = resolveSignup(t, group, group?.owner_profile)
  if (showsSignup(t, signup)) {
    const price = formatPrice(signup.price, signup.unit)
    return (
      <span className="block">
        <span className="block font-bold text-green">Inscripción abierta</span>
        {price && <span className="block text-secondary mt-0.5">{price}</span>}
      </span>
    )
  }
  if (m.status === 'active' || m.status === 'live') {
    return <span className="text-content">{countLabel(t.match_count ?? 0, 'partido jugado', 'partidos jugados')}</span>
  }
  if (m.status !== 'finished' && !(byPairs(t) ? t.pair_count : t.player_count)) {
    return <span className="text-secondary">{byPairs(t) ? 'Todavía sin parejas' : 'Todavía sin jugadores'}</span>
  }
  return null
}

export default function GroupTournamentRow({ t, group, to, first }) {
  const m = cardModel(t, { group, fallbackCreated: true })
  const count = byPairs(t) ? t.pair_count : t.player_count
  return (
    <TournamentRow
      m={m}
      to={to}
      first={first}
      slot={<Slot t={t} m={m} group={group} />}
      meta={(
        <>
          {t.club_name && (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <ClubTile photo={t.club_photo_url} name={t.club_name} size={18} round />
              <span className="truncate">{t.club_name}</span>
            </span>
          )}
          {count > 0 && !t.roster_hidden && (
            <span className="text-muted shrink-0">{byPairs(t) ? countLabel(count, 'pareja', 'parejas') : countLabel(count, 'jugador', 'jugadores')}</span>
          )}
        </>
      )}
    />
  )
}
