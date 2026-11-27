import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import PlayerAvatar from '../shared/PlayerAvatar'
import { FORMAT_NAME, shortDay, levelTag, cld } from './landingFormat'

// Con pocas cards el carrusel no se mueve: no hay con qué completar la vuelta.
const MIN_TO_SCROLL = 3

function ChampionCard({ c, hidden = false }) {
  const level = levelTag(c.level)
  const pair = c.players.map((p) => p.name).filter(Boolean).join(' & ')
  return (
    <Link to={`/view/${c.tournament_id}`} tabIndex={hidden ? -1 : undefined}
      className="relative w-[300px] md:w-[360px] min-h-[318px] shrink-0 rounded-[22px] overflow-hidden bg-land-graphite-2 border border-land-line-2 flex flex-col no-underline">
      {c.cover_url && (
        <>
          <img src={cld(c.cover_url, 720)} alt="" width="360" height="318" loading="lazy" decoding="async"
            className="absolute inset-0 w-full h-full object-cover" />
          <span className="absolute inset-0 bg-linear-to-b from-land-night/30 via-land-night/80 to-land-night/95" aria-hidden="true" />
        </>
      )}
      <div className="relative p-[22px] flex flex-col gap-3.5 flex-1">
        <div className="flex justify-between items-center gap-2">
          <div className="flex gap-1.5 min-w-0">
            {level && <span className="font-sans text-[13px] font-extrabold px-2.5 py-1 rounded-full bg-land-lime text-land-ink">{level}</span>}
            <span className="font-sans text-[13px] font-semibold px-2.5 py-1 rounded-full bg-land-text/12 text-land-text">{FORMAT_NAME[c.format] ?? 'Torneo'}</span>
          </div>
          {c.date && <span className="font-sans text-[13px] text-land-text/75 shrink-0">{shortDay(c.date)}</span>}
        </div>
        <div className="flex items-center mt-1.5">
          {c.players.map((p, i) => (
            <span key={i} className={`rounded-full border-[3px] ${c.cover_url ? 'border-land-night' : 'border-land-graphite-2'} ${i ? '-ml-3' : ''}`}>
              <PlayerAvatar name={p.name ?? '?'} src={p.avatar_url} size={56} />
            </span>
          ))}
          <span className="ml-3 w-[38px] h-[38px] rounded-full bg-premium/18 text-premium-hi flex items-center justify-center" aria-hidden="true"><Trophy size={19} /></span>
        </div>
        <div className="font-condensed font-bold text-[18px] md:text-[19px] leading-[1.3] text-land-text">{pair}</div>
        <div className="font-sans text-[14px] text-land-text/75">{[c.tournament_name, c.club_name].filter(Boolean).join(' · ')}</div>
        <div className="mt-auto pt-3.5 border-t border-land-text/12 flex justify-between items-center gap-2.5 font-sans text-[13px]">
          <span className="text-land-soft truncate">Organizó <strong className="font-semibold text-land-text/90">{c.organizer?.name ?? c.group_name}</strong></span>
          {c.score && <span className="font-condensed font-bold text-[15px] text-land-lime whitespace-nowrap">{c.score}</span>}
        </div>
      </div>
    </Link>
  )
}

export default function ChampionsCarousel({ champions }) {
  if (!champions?.length) return null
  const loop = champions.length >= MIN_TO_SCROLL
  return (
    <section className="bg-land-graphite text-land-text py-16 md:py-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-12 mb-11">
        <h2 className="land-reveal m-0 font-condensed font-bold text-[30px] md:text-[46px] leading-[1.06] tracking-[-0.02em]">Últimos campeones</h2>
        <p className="land-reveal land-reveal-2 mt-4 mb-0 max-w-[560px] font-sans text-[17px] md:text-[19px] leading-[1.55] text-land-soft">Cada título de liga, americano o copa queda en el perfil de la pareja que lo ganó.</p>
      </div>
      {loop ? (
        <div className="land-marquee">
          <div className="land-track flex gap-5 w-max">
            {champions.map((c) => <ChampionCard key={c.tournament_id} c={c} />)}
            <div className="land-dup flex gap-5" aria-hidden="true">
              {champions.map((c) => <ChampionCard key={`dup-${c.tournament_id}`} c={c} hidden />)}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-[1200px] px-5 md:px-12 flex gap-5 overflow-x-auto">
          {champions.map((c) => <ChampionCard key={c.tournament_id} c={c} />)}
        </div>
      )}
    </section>
  )
}
