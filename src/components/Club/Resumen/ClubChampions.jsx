import { Link } from 'react-router-dom'
import PlayerAvatar from '../../shared/PlayerAvatar'
import { levelShort } from '../../../utils/tournamentCard'

export default function ClubChampions({ club, champions }) {
  if (!champions?.length) return null
  return (
    <section aria-labelledby="club-champs">
      <div className="flex justify-between items-baseline gap-3 mb-3.5">
        <h2 id="club-champs" className="m-0 font-condensed font-bold text-[15px] text-white">Campeones recientes</h2>
        <Link to={`/club/${club.id}/torneos`} className="text-[13px] font-bold text-brand no-underline hover:underline">Ver torneos</Link>
      </div>
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
        {champions.map((c) => {
          const names = c.players.map((p) => p.name).filter(Boolean)
          return (
            <Link key={c.tournament_id} to={`/cat/${c.group_id}/torneo/${c.tournament_id}`}
              className="block rounded-xl border border-border-mid bg-surface p-4 no-underline hover:border-border-strong transition-colors">
              <div className="flex mb-3">
                {c.players.map((p, i) => (
                  <span key={i} className={`rounded-full ring-2 ring-surface ${i ? '-ml-1.5' : ''}`}>
                    <PlayerAvatar name={p.name} src={p.avatar_url} size={38} />
                  </span>
                ))}
              </div>
              <div className="font-bold text-white text-[15px]">{names.join(' y ')}</div>
              <div className="text-[13px] text-secondary mt-1">{[c.tournament_name, levelShort(c.level)].filter(Boolean).join(' · ')}</div>
              <div className="text-[12px] text-premium mt-2">{c.score ? `Campeones · ${c.score} en la final` : 'Campeones'}</div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
