import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function EncontrarSection() {
  return (
    <TutorialSection
      title="Encontrar categorías y jugadores"
      description="Desde la pantalla principal podés buscar gente, categorías y clubes, ver qué hay cerca tuyo y guardar las categorías que seguís aunque no juegues en ellas."
    >
      <TutorialMedia caption="Buscador de la pantalla principal" name="buscador-home" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        El buscador
      </h3>
      <Bullets
        items={[
          'Busca al mismo tiempo jugadores, categorías y clubes.',
          'A los jugadores los encontrás por nombre o por @usuario.',
          'Sólo aparecen las categorías públicas. Las privadas no salen ni en la búsqueda ni en los listados.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Favoritas
      </h3>
      <Bullets
        items={[
          'Cualquier categoría pública se puede agregar a favoritas.',
          'Quedan juntas en la pantalla principal, para entrar rápido a ver cómo va la fecha.',
          'No hace falta jugar ahí: es para seguir la categoría de al lado, la de otra división o la del club.',
          'No podés marcar como favorita una categoría tuya, ni una privada.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Cerca tuyo
      </h3>
      <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
        Si le das permiso de ubicación, la pantalla principal te muestra los clubes en un radio de
        20 km. Sirve para encontrar dónde se está jugando sin conocer a nadie todavía.
      </p>

      <Note>
        Tu pantalla principal separa las categorías que creaste, en las que participás, las que
        co-organizás y las favoritas, así no se mezclan a medida que se acumulan.
      </Note>
    </TutorialSection>
  )
}
