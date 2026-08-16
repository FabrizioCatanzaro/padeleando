import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'

export default function SeguirSection() {
  return (
    <TutorialSection
      title="Seguir jugadores"
      description="Podés seguir a la gente con la que jugás para tener sus perfiles a mano y compararte con ellos. Es público y no hace falta que te acepten."
      steps={[
        {
          label: 'Entrá al perfil de la persona',
          text: 'Desde una tabla de posiciones, una lista de partidos o el buscador, tocando su nombre.',
        },
        {
          label: 'Tocá seguir',
          text: 'Le llega una notificación y puede seguirte de vuelta desde ahí.',
        },
      ]}
    >
      <TutorialMedia caption="Botón de seguir en el perfil de un jugador" name="perfil-jugador" />
      <TutorialMedia caption="Opciones para compartir el perfil de un jugador" name="perfil-compartir" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Para qué sirve
      </h3>
      <Bullets
        items={[
          'Seguís a la gente con la que jugás y podés ver sus perfiles a mano.',
          'Tu perfil muestra a quiénes seguís y quiénes te siguen, y las dos listas son públicas.',
          'Aparece un ranking que te compara con la gente que seguís por victorias y porcentaje. Ese bloque lo ves sólo vos, en tu propio perfil.',
        ]}
      />

      <p className="text-content text-[14px] font-sans leading-relaxed">
        Seguir a alguien no te suma a sus categorías ni te da acceso a nada: es sólo para ver
        perfiles y compararte. Podés dejar de seguir cuando quieras.
      </p>
    </TutorialSection>
  )
}
