import { House, Swords, Trophy, Users, User } from 'lucide-react'

export const NAV_ITEMS = [
  { id: 'inicio',    label: 'Inicio',    to: '/',          icon: House,  match: (p) => p === '/' },
  { id: 'partidos',  label: 'Partidos',  to: '/partidos',  icon: Swords, badge: 'friendlies', match: (p) => /^\/(partidos|amistosos?)(\/|$)/.test(p) },
  { id: 'torneos',   label: 'Torneos',   to: '/torneos',   icon: Trophy, badge: 'registrations', match: (p) => /^\/(torneos|cat|view)(\/|$)/.test(p) },
  { id: 'padeleros', label: 'Padeleros', to: '/padeleros', icon: Users,  match: (p) => /^\/(padeleros|club)(\/|$)/.test(p) },
]

export const BADGE_TONE = { friendlies: 'bg-brand', registrations: 'bg-cyan' }

export function profileItem(username) {
  const to = `/u/${username}`
  return { id: 'perfil', label: 'Perfil', to, icon: User, match: (p) => p === to }
}

const HIDE_BOTTOM_NAV = [/^\/perfil\/editar$/, /^\/amistosos\/nuevo$/, /^\/amistoso\/[^/]+\/editar$/, /^\/cat\/[^/]+\/torneo\/new$/, /^\/nivel$/]

export function showsBottomNav(pathname) {
  return !HIDE_BOTTOM_NAV.some((re) => re.test(pathname))
}
