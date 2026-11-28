import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../utils/api'
import PlayerAvatar from '../../shared/PlayerAvatar'

const MAX = 3

function companionReason(c) {
  if (c.juntos > 0) return `Jugaron ${c.juntos} ${c.juntos === 1 ? 'partido' : 'partidos'} juntos`
  return `Rival en ${c.rival} ${c.rival === 1 ? 'partido' : 'partidos'}`
}

// Primero con quien jugaste, después sugeridos de tus torneos y por último organizadores activos.
function buildToFollow(data, limit = MAX) {
  const out = []
  const seen = new Set()
  const add = (p, reason) => {
    if (!p.username || seen.has(p.username) || out.length >= limit) return
    seen.add(p.username)
    out.push({ username: p.username, name: p.name, avatar_url: p.avatar_url, reason })
  }
  for (const c of data.companions ?? []) if (!c.is_following) add(c, companionReason(c))
  for (const s of data.suggested ?? []) {
    add(s, [s.category, s.club_name ? `juega en ${s.club_name}` : `${s.shared} ${s.shared === 1 ? 'torneo' : 'torneos'} en común`].filter(Boolean).join(' · '))
  }
  for (const o of data.organizers ?? []) {
    if (!o.is_following) add(o, o.clubs?.[0] ? `Organiza en ${o.clubs[0]}` : `Organiza ${o.group_name}`)
  }
  return out
}

function FollowPill({ username }) {
  const [state, setState] = useState('idle')
  async function follow() {
    setState('busy')
    try { await api.follows.follow(username); setState('done') } catch { setState('idle') }
  }
  if (state === 'done') return <span className="font-sans text-[11px] font-bold text-secondary">Siguiendo</span>
  return (
    <button type="button" onClick={follow} disabled={state === 'busy'}
      className="h-[30px] px-3 rounded-full border-0 bg-surface-alt text-brand font-sans text-[11px] font-extrabold cursor-pointer hover:bg-border-mid disabled:opacity-60">
      Seguir
    </button>
  )
}

export default function ParaSeguir() {
  const [people, setPeople] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.padeleros.players()
      .then((d) => { if (!cancelled) setPeople(buildToFollow(d)) })
      .catch(() => { if (!cancelled) setPeople([]) })
    return () => { cancelled = true }
  }, [])

  if (!people?.length) return null

  return (
    <section aria-labelledby="para-seguir">
      <div className="flex items-baseline justify-between mb-1">
        <h2 id="para-seguir" className="m-0 font-sans text-[11px] font-bold tracking-[2px] text-muted">PADELEROS PARA SEGUIR</h2>
        <Link to="/padeleros/jugadores" className="font-sans text-[12px] font-bold text-brand no-underline hover:underline">Ver más</Link>
      </div>
      {people.map((p) => (
        <div key={p.username} className="flex items-center gap-3 py-2">
          <Link to={`/u/${p.username}`} className="flex flex-1 min-w-0 items-center gap-3 no-underline group">
            <PlayerAvatar name={p.name} src={p.avatar_url} size={34} />
            <span className="min-w-0">
              <span className="block font-sans font-bold text-[13px] text-white truncate group-hover:text-brand transition-colors">{p.name}</span>
              <span className="block font-sans text-[11px] text-secondary truncate">{p.reason}</span>
            </span>
          </Link>
          <FollowPill username={p.username} />
        </div>
      ))}
    </section>
  )
}
