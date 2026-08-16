import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'

export default function CrearPartidoSection() {
  return (
    <TutorialSection
      title="Crear un partido"
      description='Una partido en Padeleando tiene la posibilidad de asignar las parejas involucradas, setear la fecha, cancha, iniciar un cronómetro y registrar los resultados.'
      steps={[
        {
          label: 'Ir a el torneo',
          text: 'Desde la pantalla de tu torneo, en la sección de partidos,presioná el botón "NUEVO PARTIDO".',
        },
        {
          label: 'Elegir las parejas',
          text: 'Seleccioná las parejas que van a jugar el partido.',
        },
        {
          label: 'Iniciá el cronómetro (opcional)',
          text: 'El cronómetro es una herramienta opcional para llevar el tiempo del partido. Podés iniciarlo, pausarlo y reiniciarlo las veces que quieras durante el partido. Si no lo querés iniciar, no se registrará el tiempo del partido pero igualmente podrás cargar el resultado al finalizarlo.',
        },
        {
          label: 'Cargá el resultado',
          text: 'Una vez finalizado el partido, podés registrar el resultado y se carga automáticamente a la tabla de posiciones.',
        },
      ]}
    >
      <TutorialMedia caption="Formulario de creación de partido" name="torneo-nuevo-partido" />
      <TutorialMedia caption="Partido registrado" name="torneo-partidos" />
    </TutorialSection>
  )
}
