import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function FotosSection() {
  return (
    <TutorialSection
      title="Fotos del torneo"
      description="Cada torneo puede tener su galería: las fotos de la fecha quedan guardadas junto a los resultados, en vez de perderse en el chat del grupo."
      steps={[
        {
          label: 'Entrá al torneo',
          text: 'En el bloque de fotos vas a ver el botón para subir. Aparece si podés administrar ese torneo.',
        },
        {
          label: 'Elegí las imágenes',
          text: 'Podés subir varias de una. Cada una admite una descripción opcional.',
        },
        {
          label: 'Elegí la portada',
          text: 'Una de las fotos se puede marcar como portada del torneo.',
        },
      ]}
    >
      <TutorialMedia caption="Galería de fotos del torneo" name="torneo-fotos" />

      <Note>
        Es una función Premium, y se evalúa contra el dueño de la categoría: si el dueño tiene plan
        Básico, un co-organizador Premium tampoco va a poder subir fotos.
      </Note>

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Cosas a tener en cuenta
      </h3>
      <Bullets
        items={[
          'Hasta 12 fotos por torneo.',
          'La galería se ve en la vista pública, así que cualquiera con el link puede mirarla.',
          'Podés editar la descripción, cambiar la portada o borrar una foto cuando quieras.',
          'Si dejás de ser Premium, las fotos que ya subiste siguen ahí y se siguen viendo: lo único que se cierra es el botón de subir más.',
        ]}
      />
    </TutorialSection>
  )
}
