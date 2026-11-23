import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import SectionTabs from '../Shell/SectionTabs'
import { useSummary } from '../../hooks/useSummary'
import { useAuth } from '../../context/useAuth'

const Explorar   = lazy(() => import('./Explorar'))
const MisTorneos = lazy(() => import('./MisTorneos'))
const Organizar  = lazy(() => import('./Organizar'))

const VIEWS = { explorar: Explorar, mios: MisTorneos, organizar: Organizar }

export default function TorneosView({ tab = 'explorar' }) {
  const { isLoggedIn } = useAuth()
  const summary = useSummary()
  const tabs = [
    { label: 'Explorar', to: '/torneos', end: true },
    ...(isLoggedIn ? [
      { label: 'Mis torneos', to: '/torneos/mios' },
      { label: 'Organizar', to: '/torneos/organizar', badge: summary?.pending?.registrations ?? 0 },
    ] : []),
  ]
  const View = VIEWS[tab] ?? Explorar
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-7 pt-6 sm:pt-8 pb-10">
      <SectionTabs title="Torneos" tabs={tabs} />
      <Suspense fallback={<div className="min-h-[50vh] flex justify-center pt-10"><Loader2 size={20} className="animate-spin text-muted" /></div>}>
        <View />
      </Suspense>
    </div>
  )
}
