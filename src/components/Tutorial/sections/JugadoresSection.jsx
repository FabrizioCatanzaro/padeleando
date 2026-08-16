import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'

export default function JugadoresSection() {
  return (
    <TutorialSection
      title="Agregar, editar y eliminar jugadores o parejas"
      description="Desde la pestaña de gestión de un torneo podés administrar los participantes: agregar nuevos jugadores o parejas, editar sus nombres, y eliminarlos si es necesario."
      steps={[
        {
          label: 'Acceder a la gestión del torneo',
          text: 'Dentro de un torneo, buscá la pestaña o sección de gestión de jugadores/parejas.',
        },
        {
          label: 'Agregar un jugador o pareja',
          text: 'Usá el campo de ingreso para escribir el nombre del jugador o de la pareja y confirmá con el botón correspondiente.',
        },
        {
          label: 'Editar un nombre',
          text: 'Hacé clic en el ícono de lápiz junto al nombre que querés cambiar. Editalo y guardá los cambios.',
        },
        {
          label: 'Eliminar un jugador o pareja',
          text: 'Hacé clic en el ícono de eliminar (papelera o X) junto al jugador o pareja. Se te pedirá confirmar antes de borrarlo.',
        },
      ]}
    >
      <TutorialMedia caption="Panel de gestión del torneo" name="americano-gestion" />
      <TutorialMedia caption="Paso de jugadores al crear el torneo" name="nuevo-torneo-jugadores" />
    </TutorialSection>
  )
}
