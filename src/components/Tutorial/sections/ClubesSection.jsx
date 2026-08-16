import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function ClubesSection() {
  return (
    <TutorialSection
      title="Clubes"
      description="Un club es el lugar donde se juega. Asociarlo a tu categoría ubica los torneos en el mapa, los muestra en el perfil del club y te arma la estadística de dónde jugás más seguido."
    >
      <TutorialMedia caption="Perfil de un club" name="club-perfil" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Asociar un club
      </h3>
      <Bullets
        items={[
          'Al editar la categoría podés elegir un club: pasa a ser el club por defecto de los torneos nuevos.',
          'Cada torneo puede tener otro club, si esa fecha se jugó en otro lado.',
          'Es opcional: una categoría sin club funciona igual.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        El perfil del club
      </h3>
      <Bullets
        items={[
          'Muestra las canchas, los horarios, el contacto y las redes.',
          'Lista los torneos que se juegan ahí, así alguien que busca dónde jugar los encuentra.',
          'Se puede compartir como cualquier otra página.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Si tu club no está
      </h3>
      <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
        Podés pedir que lo demos de alta desde el selector de club. Cargás los datos y la solicitud
        queda pendiente de revisión; cuando la resolvemos te llega una notificación.
      </p>

      <Note>
        Los clubes los damos de alta nosotros, no se crean solos. Es para que no se llene de
        duplicados y de lugares que no existen.
      </Note>

      <p className="text-content text-[14px] font-sans leading-relaxed">
        Desde la pantalla principal también podés ver los clubes cercanos a tu ubicación, en un
        radio de 20 km.
      </p>
    </TutorialSection>
  )
}
