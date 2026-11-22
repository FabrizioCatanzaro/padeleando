import { Users, ClipboardList, Building2 } from 'lucide-react'
import SectionTabs from '../Shell/SectionTabs'
import ComingSoon from '../Shell/ComingSoon'

const TABS = [
  { label: 'Jugadores',     to: '/padeleros/jugadores' },
  { label: 'Organizadores', to: '/padeleros/organizadores' },
  { label: 'Clubes',        to: '/padeleros/clubes' },
  { label: 'Feed',    soon: true },
  { label: 'Ranking', soon: true },
]

const CONTENT = {
  jugadores: {
    icon: Users,
    title: 'Jugadores para seguir',
    text: 'Los que más jugaron con vos y sugeridos de tus mismos torneos. Mientras tanto, buscá jugadores con el buscador de Inicio.',
    linkTo: '/', linkLabel: 'Ir a Inicio',
  },
  organizadores: {
    icon: ClipboardList,
    title: 'Organizadores activos',
    text: 'Quienes organizan torneos cerca tuyo. Mientras tanto, encontrá categorías con el buscador de Inicio.',
    linkTo: '/', linkLabel: 'Ir a Inicio',
  },
  clubes: {
    icon: Building2,
    title: 'Clubes cerca tuyo',
    text: 'Clubes con distancia, canchas, partidos abiertos y reserva online. Mientras tanto, están en Inicio, en "Clubes cerca".',
    linkTo: '/?cerca=1', linkLabel: 'Ver clubes cerca',
  },
}

export default function PadelerosView({ tab = 'jugadores' }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-7 pt-6 sm:pt-8 pb-10">
      <SectionTabs title="Padeleros" tabs={TABS} />
      <ComingSoon {...CONTENT[tab]} />
    </div>
  )
}
