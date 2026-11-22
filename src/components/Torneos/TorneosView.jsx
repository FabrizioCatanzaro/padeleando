import { Compass, ListChecks, LayoutGrid } from 'lucide-react'
import SectionTabs from '../Shell/SectionTabs'
import ComingSoon from '../Shell/ComingSoon'

const TABS = [
  { label: 'Explorar',    to: '/torneos', end: true },
  { label: 'Mis torneos', to: '/torneos/mios' },
  { label: 'Organizar',   to: '/torneos/organizar' },
]

const CONTENT = {
  explorar: {
    icon: Compass,
    title: 'Torneos con inscripción abierta',
    text: 'Acá vas a encontrar los torneos para anotarte cerca tuyo. Mientras tanto están en Inicio, en "Anotate a jugar".',
    linkTo: '/#descubrir', linkLabel: 'Ver en Inicio',
  },
  mios: {
    icon: ListChecks,
    title: 'Todos tus torneos en una lista',
    text: 'Los torneos que jugás y los que organizás, separados en en curso, próximos y finalizados. Mientras tanto, entrá por tus categorías.',
    linkTo: '/#categorias', linkLabel: 'Ver mis categorías',
  },
  organizar: {
    icon: LayoutGrid,
    title: 'Tus categorías e inscripciones',
    text: 'Desde acá vas a gestionar tus categorías, aprobar inscripciones y ver el uso de tu plan. Mientras tanto, tus categorías siguen en Inicio.',
    linkTo: '/#categorias', linkLabel: 'Ver mis categorías',
  },
}

export default function TorneosView({ tab = 'explorar' }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-7 pt-6 sm:pt-8 pb-10">
      <SectionTabs title="Torneos" tabs={TABS} />
      <ComingSoon {...CONTENT[tab]} />
    </div>
  )
}
