import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'

export default function FinalizarSection() {
  return (
    <TutorialSection
      title="Finalizar un torneo"
      description="Finalizar un torneo cierra oficialmente esa fecha de juego y congela sus resultados en la tabla de posiciones. Un torneo finalizado no puede editarse hasta que se vuelva a reanudar."
      steps={[
        {
          label: 'Cargar todos los resultados',
          text: 'Antes de finalizar, asegurate de que todos los partidos del torneo tengan resultados cargados. Podés editar los marcadores haciendo clic en cada partido.',
        },
        {
          label: 'Buscar el botón "Finalizar torneo"',
          text: 'Dentro de la vista del torneo, en la solapa de "Gestión", encontrás el botón para finalizarla. Solo el organizador o co-organizador del torneo puede hacerlo.',
        },
        {
          label: 'Confirmar',
          text: 'Se te pedirá confirmar la acción. Una vez finalizada, los puntos quedan registrados definitivamente en la tabla acumulada del torneo.',
        },
      ]}
    >
      <TutorialMedia caption="Un torneo finalizado, con su campeón" name="torneo-liga-finalizado" />
    </TutorialSection>
  )
}
