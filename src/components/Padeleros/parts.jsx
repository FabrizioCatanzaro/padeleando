import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api } from '../../utils/api'
import PlayerAvatar from '../shared/PlayerAvatar'

export const SECTION_TITLE = 'm-0 font-sans text-[11px] font-bold tracking-[2px] text-muted'
export const FIELD = 'h-10 rounded-lg border border-border-mid bg-surface font-sans text-[13px] outline-none focus:border-border-strong'

export function Spinner() {
  return <div className="min-h-[40vh] flex justify-center pt-10"><Loader2 size={20} className="animate-spin text-muted" /></div>
}

export function FollowButton({ username, initial = false, className = '' }) {
  const [following, setFollowing] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      if (following) await api.follows.unfollow(username)
      else await api.follows.follow(username)
      setFollowing(!following)
    } catch { /* el botón queda como estaba */ }
    finally { setBusy(false) }
  }

  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={following}
      className={`h-9 rounded-lg font-sans text-[12px] font-extrabold cursor-pointer disabled:opacity-60 transition-colors ${following ? 'border border-border-strong bg-transparent text-content hover:text-white' : 'border border-brand bg-brand text-black'} ${className}`}>
      {following ? 'Siguiendo' : 'Seguir'}
    </button>
  )
}

export function PersonRow({ person, detail, right = null }) {
  const body = (
    <>
      <PlayerAvatar name={person.name} src={person.avatar_url} size={40} />
      <span className="flex-1 min-w-0">
        <span className="block font-sans font-bold text-[14px] text-white truncate">{person.name}</span>
        <span className="block font-sans text-[12px] text-secondary truncate">{detail ?? (person.username ? `@${person.username}` : '')}</span>
      </span>
    </>
  )
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0">
      {person.username
        ? <Link to={`/u/${person.username}`} className="flex flex-1 min-w-0 items-center gap-3 no-underline group">{body}</Link>
        : <span className="flex flex-1 min-w-0 items-center gap-3">{body}</span>}
      {right}
    </div>
  )
}
