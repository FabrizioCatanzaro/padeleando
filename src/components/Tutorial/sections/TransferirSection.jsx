import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function TransferirSection() {
  return (
    <TutorialSection
      title="Transferir una categoría"
      description="Si dejás de organizar, podés pasarle la categoría a otra persona sin perder nada de lo jugado. La transferencia cambia quién es el dueño: los torneos, los resultados, los jugadores y las fotos quedan intactos."
      steps={[
        {
          label: 'Entrá a la categoría',
          text: 'La opción "Transferir propiedad" está en el menú de la categoría y sólo la ve el dueño.',
        },
        {
          label: 'Elegí a quién',
          text: 'Por @usuario o email, o generando un link de transferencia para mandarle por donde quieras.',
        },
        {
          label: 'Esperá a que acepte',
          text: 'La transferencia queda pendiente hasta que la otra persona la confirme. Mientras tanto, seguís siendo el dueño y todo funciona normal.',
        },
        {
          label: 'Listo',
          text: 'Cuando acepta, pasa a ser el dueño y vos quedás automáticamente como co-organizador, así podés seguir cargando resultados.',
        },
      ]}
    >
      <TutorialMedia caption="Transferir la propiedad de la categoría" name="categoria-transferencia" />

      <Note>
        Es irreversible. Una vez que la otra persona acepta, no podés recuperar la propiedad por tu
        cuenta: se la tiene que transferir de vuelta. Confirmá bien de qué categoría se trata y a
        quién se la estás pasando.
      </Note>

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Mientras está pendiente
      </h3>
      <Bullets
        items={[
          'Podés cancelarla cuando quieras, y el link deja de funcionar.',
          'No podés iniciar una segunda transferencia: primero cancelá la que está pendiente.',
          'Si la categoría cambia de dueño por otro camino antes de que acepte, la transferencia se cancela sola.',
          'La otra persona puede rechazarla. En ese caso no cambia nada y podés volver a intentarlo.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Qué cambia al aceptar
      </h3>
      <Bullets
        items={[
          'El nuevo dueño pasa a controlar el nombre, la descripción, la privacidad, los co-organizadores y la eliminación de la categoría.',
          'También resuelve las solicitudes de los jugadores que piden unirse a un torneo.',
          'Vos quedás como co-organizador: seguís administrando los torneos, pero ya no la categoría.',
          'Si el nuevo dueño ya era co-organizador, deja de serlo (pasa a dueño, que puede todo).',
          'Los límites del plan pasan a medirse contra el plan del nuevo dueño.',
        ]}
      />

      <p className="text-content text-[14px] font-sans leading-relaxed">
        No es lo mismo que sumar un co-organizador: ahí compartís la gestión de los torneos y seguís
        siendo el dueño. Transferir es entregar la categoría.
      </p>
    </TutorialSection>
  )
}
