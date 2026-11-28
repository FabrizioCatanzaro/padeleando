import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import TournamentRow from '../../shared/tournament/TournamentRow'
import FriendlyOpenCard from '../../Friendly/FriendlyOpenCard'
import { cardModel, countLabel } from '../../../utils/tournamentCard'
import { shortDayLabel, todayLocalStr } from '../scheduleGrid'

const SHOWN = 3

function Slot({ t, m }) {
  if (t.signup_open) return <span className="font-bold text-green">Inscripción abierta</span>
  if (m.status === 'active' || m.status === 'live') return <span className="text-content">{countLabel(t.match_count ?? 0, 'partido jugado', 'partidos jugados')}</span>
  return null
}

export function ClubTournamentRow({ t, first }) {
  const m = cardModel(t, { fallbackCreated: true })
  return (
    <TournamentRow m={m} to={`/cat/${t.group_id}/torneo/${t.id}`} first={first} slot={<Slot t={t} m={m} />}
      meta={<span className="truncate">{[t.group_name, t.owner_username && `@${t.owner_username}`].filter(Boolean).join(' · ')}</span>} />
  )
}

function MoreLink({ to, children }) {
  return (
    <Link to={to} className="self-start inline-flex items-center gap-1.5 text-sm font-bold text-brand no-underline hover:underline py-2">
      {children}<ChevronRight size={15} aria-hidden="true" />
    </Link>
  )
}

const dayName = (date) => (date === todayLocalStr() ? 'Hoy' : shortDayLabel(date))

// Lo que se juega en el club: unos pocos de cada tipo y el enlace a la lista completa
export default function ClubEvents({ club, events, todos }) {
  const friendlies = events.friendlies ?? []
  const [tab, setTab] = useState(() => (todos.length || !friendlies.length ? 'torneos' : 'amistosos'))
  const shown = [...(events.ongoing ?? []), ...(events.upcoming ?? []), ...(events.past ?? [])].slice(0, SHOWN)
  const tabs = [
    { id: 'torneos', label: 'Torneos', n: todos.length },
    { id: 'amistosos', label: 'Amistosos', n: friendlies.length },
    { id: 'abiertas', label: 'Canchas abiertas', soon: true },
  ]

  return (
    <section aria-labelledby="club-ev">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3.5">
        <h2 id="club-ev" className="m-0 font-condensed font-bold text-[15px] text-white">Qué se juega en el club</h2>
        <div role="tablist" aria-label="Tipo de evento" className="flex gap-1.5 flex-wrap">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold cursor-pointer border ${
                tab === t.id ? 'bg-brand text-base border-brand' : 'bg-transparent text-content border-border-strong hover:text-white'
              }`}>
              {t.label}
              {t.soon
                ? <span className="text-[10px] font-bold bg-premium text-premium-ink rounded px-1.5 py-px">Pronto</span>
                : <span className="opacity-70">{t.n}</span>}
            </button>
          ))}
        </div>
      </div>

      {tab === 'torneos' && (shown.length ? (
        <div className="flex flex-col">
          <div className="rounded-xl border border-border-mid bg-surface overflow-hidden">
            {shown.map((t, i) => <ClubTournamentRow key={t.id} t={t} first={i === 0} />)}
          </div>
          {todos.length > SHOWN && <MoreLink to={`/club/${club.id}/torneos`}>Ver los {todos.length} torneos del club</MoreLink>}
          {todos.length <= SHOWN && <MoreLink to={`/club/${club.id}/torneos`}>Ver categorías y torneos</MoreLink>}
        </div>
      ) : <p className="m-0 text-sm text-secondary">Todavía no se jugaron torneos públicos en este club.</p>)}

      {tab === 'amistosos' && (friendlies.length ? (
        <div className="flex flex-col">
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {friendlies.slice(0, 4).map((m) => (
              <div key={m.id} className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-secondary">{dayName(m.date)}</span>
                <FriendlyOpenCard m={m} />
              </div>
            ))}
          </div>
          <MoreLink to={`/partidos?club=${encodeURIComponent(club.name)}`}>
            {friendlies.length > 4 ? `Ver los ${friendlies.length} amistosos abiertos` : 'Ver amistosos en Partidos'}
          </MoreLink>
        </div>
      ) : (
        <p className="m-0 text-sm text-secondary">
          No hay amistosos abiertos en este club. <Link to="/amistosos/nuevo" className="text-brand font-semibold">Armá uno</Link>.
        </p>
      ))}

      {tab === 'abiertas' && (
        <div className="rounded-xl border border-border-mid bg-surface p-4 sm:p-5 flex flex-col gap-3">
          <p className="m-0 text-sm text-soft leading-relaxed max-w-[62ch]">
            Un organizador reserva dos horas o más y se anotan varios jugadores. Las parejas rotan cada partido: es para divertirse y practicar.
          </p>
          <p className="m-0 text-[13px] text-secondary">Muy pronto vas a poder anotarte desde acá.</p>
        </div>
      )}
    </section>
  )
}
