import { Link } from 'react-router-dom'
import { MapPin, Plus } from 'lucide-react'
import { formatPrice } from '../../utils/signup'
import { formatMoney } from '../../utils/money'
import { freeCount, isFilled, playerName } from '../../utils/friendlies'
import { DISPONIBILIDAD } from '../Registration/format'
import PlayerAvatar from '../shared/PlayerAvatar'
import { FORMAT_NAME, dateBlock, levelTag } from './landingFormat'

const MAX_TOURNAMENTS = 3

function TournamentRow({ t }) {
  const block = dateBlock(t.event_date)
  const level = levelTag(t.signup?.level)
  const price = formatPrice(t.signup?.price, t.signup?.unit)
  const cupo = DISPONIBILIDAD[t.signup?.availability]
  const where = [t.club_name, t.club_location_name].filter(Boolean).join(', ')
  return (
    <Link to={`/view/${t.id}`}
      className="land-reveal grid grid-cols-[56px_minmax(0,1fr)] md:grid-cols-[76px_minmax(0,1fr)_auto] gap-3.5 md:gap-[22px] items-center p-5 md:px-[22px] rounded-[18px] bg-land-graphite border border-land-line no-underline hover:border-land-line-2 transition-colors">
      <div className="text-center rounded-xl bg-land-graphite-2 py-2.5">
        {block ? (
          <>
            <div className="font-sans text-[12px] font-semibold text-land-soft">{block.dow}</div>
            <div className="font-condensed font-extrabold text-[24px] md:text-[26px] leading-[1.1] text-land-text">{block.day}</div>
            <div className="font-sans text-[12px] text-land-soft">{block.month}</div>
          </>
        ) : <div className="font-sans text-[12px] font-semibold text-land-soft py-3">A definir</div>}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="font-sans text-[12px] font-bold px-2.5 py-[3px] rounded-full bg-land-lime text-land-ink">{FORMAT_NAME[t.format] ?? 'Torneo'}</span>
          {level && <span className="font-sans text-[12px] font-bold px-2.5 py-[3px] rounded-full border border-land-line-2 text-land-text/85">{level}</span>}
          {cupo && <span className={`font-sans text-[11px] font-bold px-2.5 py-[3px] rounded-full border ${cupo.color}`}>{cupo.label}</span>}
        </div>
        <div className="font-sans font-bold text-[17px] md:text-[18px] text-land-text truncate">{t.name}</div>
        <div className="flex items-center gap-1.5 mt-1 font-sans text-[14px] text-land-soft min-w-0">
          {where && <><MapPin size={14} className="shrink-0" aria-hidden="true" /><span className="truncate">{where}</span></>}
          {!where && <span className="truncate">{t.group_name}</span>}
        </div>
        {price && <div className="mt-1.5 font-sans text-[14px] font-semibold text-land-text/85">{price}</div>}
      </div>
      <span className="hidden md:inline-flex items-center h-11 px-[18px] rounded-full border border-land-lime font-sans font-bold text-[14px] text-land-lime">Inscribirme</span>
    </Link>
  )
}

function FriendlyCard({ m }) {
  const libres = freeCount(m.players)
  const block = dateBlock(m.date)
  const slots = [1, 2].flatMap((team) => [1, 2].map((position) => m.players.find((p) => p.team === team && p.position === position) ?? { team, position }))
  return (
    <Link to={`/amistoso/${m.id}`} className="land-reveal land-reveal-2 block p-5 rounded-[18px] bg-land-night border border-land-night-line no-underline hover:border-land-night-soft/40 transition-colors min-w-[84%] md:min-w-0 snap-start">
      <div className="flex justify-between items-center gap-2">
        <span className="font-sans text-[13px] font-extrabold text-land-ink bg-land-cyan px-2.5 py-1 rounded-full">{libres === 1 ? 'Falta 1' : `Faltan ${libres}`}</span>
        {m.level && <span className="font-sans text-[13px] text-land-night-soft">{m.level}</span>}
      </div>
      <div className="mt-3.5 font-sans font-bold text-[17px] text-land-text first-letter:uppercase">{block ? `${block.dow} ${block.day} ${block.month}` : ''}, {m.start_time} h</div>
      <div className="mt-1 font-sans text-[14px] text-land-night-soft truncate">{[m.club?.name, `${m.duration_minutes} min`].filter(Boolean).join(' · ')}</div>
      <div className="flex items-center justify-between gap-2 mt-4">
        <div className="flex gap-2">
          {slots.map((p) => isFilled(p)
            ? <PlayerAvatar key={`${p.team}${p.position}`} name={playerName(p)} src={p.user?.avatar_url ?? null} size={40} />
            : <span key={`${p.team}${p.position}`} className="w-10 h-10 rounded-full flex items-center justify-center border-[1.5px] border-dashed border-land-cyan text-land-cyan" aria-label="Lugar libre"><Plus size={16} strokeWidth={2.4} /></span>)}
        </div>
        {m.price_per_person != null && <span className="font-sans text-[13px] text-land-night-soft text-right">{formatMoney(m.price_per_person)}<br />por persona</span>}
      </div>
    </Link>
  )
}

export default function OpenNow({ data, loading }) {
  const signup = data?.signup ?? []
  const signupIds = new Set(signup.map((t) => t.id))
  // Sin inscripciones abiertas, los próximos torneos ocupan su lugar.
  const tournaments = (signup.length ? signup : (data?.upcoming ?? []).filter((t) => !signupIds.has(t.id))).slice(0, MAX_TOURNAMENTS)
  const friendlies = data?.friendlies ?? []

  return (
    <section id="abiertos" className="bg-land-ink text-land-text py-16 md:py-28">
      <div className="mx-auto max-w-[1200px] px-5 md:px-12">
        <div className="flex flex-wrap items-end justify-between gap-5 mb-11">
          <div>
            <h2 className="land-reveal m-0 font-condensed font-bold text-[30px] md:text-[46px] leading-[1.06] tracking-[-0.02em]">Para sumarte esta semana</h2>
            <p className="land-reveal land-reveal-2 mt-4 mb-0 max-w-[560px] font-sans text-[17px] md:text-[19px] leading-[1.55] text-land-soft">Torneos con inscripción abierta y partidos a los que les falta gente.</p>
          </div>
          <Link to="/torneos" className="font-sans font-bold text-land-lime no-underline border-b border-land-lime/40 pb-0.5 hover:border-land-lime">Ver todos los torneos</Link>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-9 lg:gap-7 items-start ${loading ? 'min-h-[340px]' : ''}`}>
          <div className="flex flex-col gap-3">
            {loading && [0, 1, 2].map((i) => <div key={i} className="h-[118px] rounded-[18px] bg-land-graphite border border-land-line animate-pulse" />)}
            {!loading && tournaments.map((t) => <TournamentRow key={t.id} t={t} />)}
            {!loading && tournaments.length === 0 && (
              <div className="p-7 rounded-[18px] bg-land-graphite border border-land-line">
                <p className="m-0 font-sans text-[17px] font-semibold text-land-text">Todavía no hay torneos con inscripción abierta.</p>
                <p className="mt-1.5 mb-4 font-sans text-[15px] text-land-soft">Armá el tuyo: liga, americano o copa, y abrí la inscripción desde la app.</p>
                <Link to="/register?redirect=%2Ftorneos%2Forganizar" className="inline-flex items-center h-11 px-5 rounded-full bg-land-lime font-sans font-bold text-[14px] text-land-ink no-underline">Organizar un torneo</Link>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-sans font-bold text-[17px]">Amistosos abiertos</span>
              <Link to="/partidos" className="font-sans text-[14px] text-land-soft no-underline hover:text-land-lime">Ver partidos</Link>
            </div>
            <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible snap-x snap-mandatory -mx-5 px-5 lg:mx-0 lg:px-0 pb-2.5 lg:pb-0">
              {loading && [0, 1].map((i) => <div key={i} className="h-[190px] min-w-[84%] lg:min-w-0 rounded-[18px] bg-land-night border border-land-night-line animate-pulse" />)}
              {!loading && friendlies.map((m) => <FriendlyCard key={m.id} m={m} />)}
              {!loading && friendlies.length === 0 && (
                <div className="w-full p-5 rounded-[18px] bg-land-night border border-land-night-line">
                  <p className="m-0 font-sans text-[15px] text-land-night-soft">No hay partidos abiertos ahora. Armá uno y sumá jugadores.</p>
                  <Link to="/register?redirect=%2Famistosos%2Fnuevo" className="inline-block mt-3 font-sans font-bold text-[14px] text-land-lime no-underline">Armar un partido</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
