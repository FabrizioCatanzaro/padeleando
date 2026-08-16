import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'

export default function HistoriasSection() {
  return (
    <TutorialSection
      title="Historias para redes"
      description="Casi todo lo que muestra números tiene un botón para convertirlo en una imagen vertical, con el formato de una historia. Sirve para publicar el resultado de la fecha sin tener que sacar una captura y recortarla."
      steps={[
        {
          label: 'Buscá el botón de compartir historia',
          text: 'Está arriba de la tabla de posiciones, del cuadro, de las estadísticas y en tu perfil.',
        },
        {
          label: 'Mirá la vista previa',
          text: 'La imagen se arma con los datos reales del momento, con los colores de Padeleando.',
        },
        {
          label: 'Descargala o compartila',
          text: 'Podés bajarla al teléfono o mandarla directo por el menú de compartir del sistema.',
        },
      ]}
    >
      <TutorialMedia caption="Vista previa de una historia" name="perfil-compartir-historia" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Qué se puede convertir en historia
      </h3>
      <Bullets
        items={[
          'La tabla de posiciones de un torneo.',
          'El cuadro final de un americano, con el campeón.',
          'Las estadísticas del torneo y las históricas de la categoría.',
          'El ranking de la categoría.',
          'Tu perfil, con tus números personales.',
        ]}
      />

      <p className="text-content text-[14px] font-sans leading-relaxed">
        La imagen es una foto del momento: se genera con los datos que había cuando la creaste y no
        se actualiza después. Si el torneo sigue, generá una nueva al terminar.
      </p>
    </TutorialSection>
  )
}
