import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'

export default function CrearTorneoSection() {
  return (
    <TutorialSection
      title="Crear un torneo"
      description='Un torneo en Padeleando es una fecha específica dentro de una categoría donde se juegan partidos. Podés personalizarlo con nombre y descripción.'
      steps={[
        {
          label: 'Ir a la categoría',
          text: 'Desde la pantalla de tu categoría, presioná el botón "NUEVO TORNEO" (el primero en la grilla de tus categorías).',
        },
        {
          label: 'Elegir el Modo de juego',
          text: 'Seleccioná el formato que vas a utilizar, no lo podés cambiar una vez creada. Para entender las diferencias entre los modos, revisá la sección "Modo Liga vs Modo Americano" de este tutorial.',
        },
        {
          label: 'Completar el nombre',
          text: 'El nombre es obligatorio y debe tener entre 2 y 30 caracteres.',
        },
        {
          label: 'Agregar jugadores/parejas',
          text: 'Dependiendo si tu elección fue "Modo Liga" o "Modo Americano", deberás agregar jugadores o parejas para el torneo. En el "Modo Liga", al no tener restricciones por número de jugadores (mínimo 4), podés formar parejas libremente para cada torneo o asignar parejas fijas en el siguiente paso. En el "Modo Americano", directamente tenés que agregar parejas fijas para el torneo: se juega con un mínimo de 8 parejas (16 jugadores), pero si todavía no las tenés a todas podés crearlo igual como BORRADOR y completar las parejas restantes desde GESTIÓN dentro del torneo.',
        },
        {
          label: 'Crear torneo',
          text: 'Dentro de un torneo podés crear tantos partidos como quieras a excepción del "Modo Americano" que permite como máximo 2 partidos por pareja en la Fase Previa. Una vez creado el torneo, podés editar su nombre y compartir el link de "solo visualización" para que los jugadores puedan ver en tiempo real la tabla de posiciones, los resultados y sus estadísticas.',
        },
      ]}
    >
      <TutorialMedia caption="Formulario de creación de torneo" name="nuevo-torneo-informacion" />
      <TutorialMedia caption="Paso de jugadores del asistente" name="nuevo-torneo-jugadores" />
      <TutorialMedia caption="Los torneos de la categoría, con sus filtros" name="categoria-buscador-torneos" />
    </TutorialSection>
  )
}
