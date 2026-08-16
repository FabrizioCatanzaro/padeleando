import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function CargarPartidoSection() {
  return (
    <TutorialSection
      title="Cargar un partido en detalle"
      description="El resultado se puede cargar de la forma más simple, con un solo número por lado, o con todo el detalle: sets, cancha y cronómetro. Cuanto más cargues, más completas quedan las estadísticas de todos."
    >
      <TutorialMedia caption="Formulario de carga de un partido" name="torneo-nuevo-partido" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Formato del partido
      </h3>
      <Bullets
        items={[
          'Sin elegir formato: cargás directamente los games de cada lado (como si fuera a 1 set). Es lo más rápido y sirve para los partidos cortos de una liga.',
          '1 set: cargás el set y el resultado sale de ahí.',
          '3 sets: al mejor de tres. Los sets van apareciendo a medida que los completás, y el partido se cierra solo cuando alguien gana dos.',
        ]}
      />

      <Note>
        En pádel no existe el empate, así que el formulario no te deja guardar un resultado igualado. Si
        te pasa, revisá el marcador: falta cargar algo.
      </Note>

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Cancha y cronómetro
      </h3>
      <Bullets
        items={[
          'Cancha: en qué cancha se jugó. Aparece en la lista de partidos y en la imagen del fixture, útil cuando hay varias en paralelo. Solo se puede elegir si el torneo se juega en un club que tiene cargadas sus canchas. Si no, el campo queda oculto.',
          'Cronómetro: el botón "Iniciar" arranca a contar y queda visible para todos. Al frenarlo, la duración queda guardada con el partido.',
          'Un partido con el cronómetro corriendo se muestra como en vivo, también para los que están mirando desde el link público.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Por qué conviene cargar el detalle
      </h3>
      <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
        Varias estadísticas se calculan sólo con lo que se cargó. Los sets ganados y los partidos
        que se fueron al tercero necesitan el formato de 3 sets; el tiempo en cancha necesita el
        cronómetro. Si en tu grupo nadie los usa, esos bloques van a aparecer vacíos en todos los
        perfiles.
      </p>

      <p className="text-content text-[14px] font-sans leading-relaxed">
        Podés corregir o borrar un partido cargado en cualquier momento: la tabla de posiciones se
        recalcula sola.
      </p>
    </TutorialSection>
  )
}
