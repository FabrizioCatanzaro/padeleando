import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import SectionTabs from '../Shell/SectionTabs'
import { useAuth } from '../../context/useAuth'
import { Spinner } from './parts'

const Jugadores     = lazy(() => import('./Jugadores'))
const Organizadores = lazy(() => import('./Organizadores'))
const Clubes        = lazy(() => import('./Clubes'))

const TABS = [
  { label: 'Jugadores',     to: '/padeleros/jugadores' },
  { label: 'Organizadores', to: '/padeleros/organizadores' },
  { label: 'Clubes',        to: '/padeleros/clubes' },
  { label: 'Feed',    soon: true },
  { label: 'Ranking', soon: true },
]

const VIEWS = { jugadores: Jugadores, organizadores: Organizadores, clubes: Clubes }

export default function PadelerosView({ tab = 'jugadores' }) {
  const { isLoggedIn } = useAuth()
  const View = VIEWS[tab] ?? Jugadores
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-7 pt-6 sm:pt-8 pb-10">
      <SectionTabs title="Padeleros" tabs={TABS} />
      {tab === 'jugadores' && !isLoggedIn ? (
        <p className="font-sans text-[13px] text-secondary min-h-[40vh]">
          <Link to="/login?redirect=/padeleros/jugadores" className="text-brand font-bold no-underline hover:underline">Iniciá sesión</Link> para ver con quién jugaste y a quién seguir.
        </p>
      ) : (
        <Suspense fallback={<Spinner />}><View /></Suspense>
      )}
    </div>
  )
}
