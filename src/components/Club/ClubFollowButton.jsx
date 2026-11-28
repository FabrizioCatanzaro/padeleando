import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, BellRing } from 'lucide-react'
import { api } from '../../utils/api'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'

// Seguir avisa cuando un torneo del club abre la inscripción
export default function ClubFollowButton({ club, onChange }) {
  const { isLoggedIn } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [busy, setBusy] = useState(false)
  const on = !!club.is_following

  async function toggle() {
    if (!isLoggedIn) { navigate(`/login?redirect=${encodeURIComponent(pathname)}`); return }
    setBusy(true)
    try {
      const state = on ? await api.clubs.unfollow(club.id) : await api.clubs.follow(club.id)
      onChange?.(state)
      if (!on) showToast('Te avisamos cuando un torneo del club abra la inscripción')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={on}
      className={`shrink-0 inline-flex items-center gap-2 rounded-[10px] px-4 h-[46px] text-sm font-semibold cursor-pointer border transition-colors disabled:opacity-60 ${
        on ? 'bg-photo-ink text-photo-shade border-photo-ink' : 'bg-photo-shade/45 text-photo-ink border-photo-ink/35 hover:bg-photo-shade/65'
      }`}>
      {on ? <BellRing size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />}
      {on ? 'Siguiendo' : 'Seguir'}
    </button>
  )
}
