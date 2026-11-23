import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import PlayerAvatar from '../shared/PlayerAvatar'
import AdBanner from '../shared/AdBanner'
import ShareAppModal from '../shared/ShareAppModal'
import { FollowButton, PersonRow, Spinner, SECTION_TITLE, FIELD } from './parts'

function togetherText(c) {
  if (c.juntos && c.rival) return `${c.juntos} de pareja · ${c.rival} de rival`
  if (c.juntos) return `${c.juntos} ${c.juntos === 1 ? 'partido juntos' : 'partidos juntos'}`
  return `Rival en ${c.rival} ${c.rival === 1 ? 'partido' : 'partidos'}`
}

function Companion({ c }) {
  const inner = (
    <>
      <PlayerAvatar name={c.name} src={c.avatar_url} size={36} />
      <span className="min-w-0">
        <span className="block font-sans font-bold text-[13px] text-white truncate">{c.name}</span>
        <span className="block font-sans text-[11px] text-secondary">{togetherText(c)}</span>
      </span>
    </>
  )
  const cls = 'flex items-center gap-2.5 p-3 rounded-xl border border-border-mid bg-surface no-underline min-w-0'
  return c.username
    ? <Link to={`/u/${c.username}`} className={`${cls} hover:border-border-strong transition-colors`}>{inner}</Link>
    : <div className={cls}>{inner}</div>
}

function Suggested({ p }) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl border border-border-mid bg-surface">
      <div className="flex items-center gap-3">
        <PlayerAvatar name={p.name} src={p.avatar_url} size={48} />
        <span className="flex-1 min-w-0">
          <span className="block font-sans font-bold text-[14px] text-white truncate">{p.name}</span>
          <span className="block font-sans text-[12px] text-secondary truncate">@{p.username}</span>
        </span>
        {p.category && <span className="font-condensed font-bold text-[13px] text-brand">{p.category}</span>}
      </div>
      <p className="m-0 font-sans text-[12px] text-secondary truncate">
        {p.club_name ? `Juega en ${p.club_name}` : `${p.shared} ${p.shared === 1 ? 'torneo' : 'torneos'} en común`}
      </p>
      <div className="flex gap-4 font-sans text-[12px] text-secondary">
        <span><b className="text-white">{p.partidos}</b> partidos</span>
        {p.win_pct != null && <span><b className="text-white">{p.win_pct}%</b> ganados</span>}
      </div>
      <div className="flex gap-2">
        <FollowButton username={p.username} className="flex-1" />
        <Link to={`/u/${p.username}`} className="flex-1 h-9 rounded-lg border border-border-strong text-content font-sans text-[12px] font-bold inline-flex items-center justify-center no-underline hover:text-white">Ver perfil</Link>
      </div>
    </div>
  )
}

function useSearch(q) {
  const [result, setResult] = useState({ q: '', rows: [] })
  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) return
    let cancelled = false
    const id = setTimeout(() => {
      api.auth.search(needle).then((rows) => { if (!cancelled) setResult({ q: needle, rows }) }).catch(() => {})
    }, 300)
    return () => { cancelled = true; clearTimeout(id) }
  }, [q])
  return q.trim().length < 2 ? null : result.q === q.trim() ? result.rows : undefined
}

export default function Jugadores() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [onlyFollowing, setOnlyFollowing] = useState(false)
  const [following, setFollowing] = useState(null)
  const [sharing, setSharing] = useState(false)
  const results = useSearch(q)

  useEffect(() => {
    let cancelled = false
    api.padeleros.players()
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [])

  function toggleFollowing() {
    const next = !onlyFollowing
    setOnlyFollowing(next)
    if (next && following === null && user?.username) {
      api.follows.following(user.username).then(setFollowing).catch(() => setFollowing([]))
    }
  }

  if (error) return <p className="font-sans text-[13px] text-danger">{error}</p>
  if (!data) return <Spinner />

  const searching = results !== null

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-10 xl:items-start">
      <div className="min-w-0 flex flex-col gap-7">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative flex-1 min-w-52 sm:max-w-80">
            <span className="sr-only">Buscar jugadores</span>
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o @usuario"
              className={`${FIELD} w-full pl-9 pr-3 text-white placeholder:text-muted`} />
          </label>
          <button type="button" aria-pressed={onlyFollowing} onClick={toggleFollowing}
            className={`h-10 px-3.5 rounded-lg font-sans text-[12.5px] font-bold cursor-pointer transition-colors ${onlyFollowing ? 'border border-brand/50 bg-brand/10 text-brand' : 'border border-border-mid bg-surface text-content hover:text-white'}`}>
            Siguiendo
          </button>
        </div>

        {searching && (
          <section aria-label="Resultados de la búsqueda">
            <h2 className={`${SECTION_TITLE} mb-2`}>RESULTADOS</h2>
            {results === undefined && <p className="m-0 font-sans text-[13px] text-secondary">Buscando…</p>}
            {results?.length === 0 && <p className="m-0 font-sans text-[13px] text-secondary">No hay jugadores con ese nombre.</p>}
            {results?.length > 0 && (
              <div className="rounded-xl border border-border bg-surface px-4">
                {results.map((u) => <PersonRow key={u.id} person={u} detail={[`@${u.username}`, u.category].filter(Boolean).join(' · ')} />)}
              </div>
            )}
          </section>
        )}

        {!searching && onlyFollowing && (
          <section aria-label="Siguiendo">
            <h2 className={`${SECTION_TITLE} mb-2`}>SIGUIENDO</h2>
            {following === null && <Spinner />}
            {following?.length === 0 && <p className="m-0 font-sans text-[13px] text-secondary">Todavía no seguís a nadie.</p>}
            {following?.length > 0 && (
              <div className="rounded-xl border border-border bg-surface px-4">
                {following.map((u) => <PersonRow key={u.id} person={u} right={<FollowButton username={u.username} initial className="px-3.5" />} />)}
              </div>
            )}
          </section>
        )}

        {!searching && !onlyFollowing && (
          <>
            <section aria-labelledby="pd-jugaste">
              <h2 id="pd-jugaste" className={`${SECTION_TITLE} mb-3`}>JUGASTE CON</h2>
              {data.companions.length === 0
                ? <p className="m-0 font-sans text-[13px] text-secondary">Cuando juegues tu primer partido, acá van a aparecer tus compañeros y rivales.</p>
                : <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">{data.companions.map((c) => <Companion key={c.key} c={c} />)}</div>}
            </section>

            <section aria-labelledby="pd-sugeridos">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h2 id="pd-sugeridos" className={SECTION_TITLE}>SUGERIDOS PARA VOS</h2>
                <span className="hidden sm:inline font-sans text-[12px] text-secondary">Jugaron tus mismos torneos</span>
              </div>
              {data.suggested.length === 0
                ? <p className="m-0 font-sans text-[13px] text-secondary">Todavía no hay sugeridos: aparecen jugadores con cuenta de tus mismos torneos públicos que no seguís. Buscá a alguien arriba.</p>
                : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.suggested.map((p) => <Suggested key={p.id} p={p} />)}</div>}
            </section>
          </>
        )}
      </div>

      <aside className="hidden xl:flex flex-col gap-5 sticky top-24" aria-label="Tu red">
        <section className="p-4 rounded-2xl bg-surface border border-border-mid">
          <h2 className={SECTION_TITLE}>TU RED</h2>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[['SIGUIENDO', data.network.following], ['SEGUIDORES', data.network.followers]].map(([label, n]) => (
              <div key={label}>
                <div className="font-condensed font-bold text-[22px] text-white">{n}</div>
                <div className="font-sans text-[10px] tracking-[1.5px] text-muted">{label}</div>
              </div>
            ))}
          </div>
        </section>
        {data.organizers.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-1">
              <h2 className={SECTION_TITLE}>ORGANIZADORES ACTIVOS</h2>
              <Link to="/padeleros/organizadores" className="font-sans text-[12px] font-bold text-brand no-underline hover:underline">Ver todos</Link>
            </div>
            {data.organizers.map((o) => (
              <PersonRow key={o.id} person={o} detail={[`${o.categories} ${o.categories === 1 ? 'categoría' : 'categorías'}`, o.clubs?.[0]].filter(Boolean).join(' · ')} />
            ))}
          </section>
        )}
        <section className="p-4 rounded-2xl bg-surface border border-border-mid">
          <h2 className={SECTION_TITLE}>TRAÉ A TU GRUPO</h2>
          <p className="m-0 mt-2 font-sans text-[13px] text-content leading-relaxed">Con más padeleros cerca hay más partidos abiertos.</p>
          <button type="button" onClick={() => setSharing(true)}
            className="w-full mt-3.5 h-10 rounded-lg border border-border-strong bg-surface-alt text-white font-sans text-[12.5px] font-bold cursor-pointer inline-flex items-center justify-center gap-2 hover:border-brand/50">
            <Users size={15} />Invitar amigos
          </button>
        </section>
        <div className="flex justify-center"><AdBanner slot="sidebar" /></div>
      </aside>
      {sharing && <ShareAppModal onClose={() => setSharing(false)} />}
    </div>
  )
}
