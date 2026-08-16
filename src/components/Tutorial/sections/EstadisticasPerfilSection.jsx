import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

const NUMEROS = [
  { label: 'Torneos', text: 'Cuántos torneos jugaste, sumando todas las categorías en las que tu cuenta está vinculada a un jugador.' },
  { label: 'Partidos', text: 'Todos los que jugaste. En los americanos también cuentan los del cuadro final, que no son partidos comunes.' },
  { label: '% victorias', text: 'Partidos ganados sobre partidos jugados. En pádel no hay empates, así que todo partido cargado suma a uno de los dos lados.' },
  { label: 'Racha actual', text: 'Victorias o derrotas seguidas, contando desde el último partido hacia atrás.' },
  { label: 'Títulos', text: 'Ligas ganadas más americanos ganados. La liga sale de quedar primero en la tabla de un torneo terminado; el americano, de ganar la final del cuadro.' },
  { label: 'Compañeros frecuentes', text: 'Con quién jugaste más veces y cómo les fue juntos.' },
  { label: 'Clubes frecuentes', text: 'Dónde jugás más seguido, según el club cargado en cada torneo.' },
  { label: 'Últimos partidos', text: 'Los más recientes con su resultado, para ver de un vistazo cómo venís.' },
]

export default function EstadisticasPerfilSection() {
  return (
    <TutorialSection
      title="Tu perfil y tus estadísticas"
      description="Tu perfil es una página pública en /u/tu-usuario que junta todo lo que jugaste, en todas las categorías. Podés compartirla con quien quieras."
    >
      <TutorialMedia caption="Estadísticas personales en el perfil público" name="perfil-stats" />

      <Note>
        Las estadísticas sólo acumulan los partidos de los jugadores vinculados a tu cuenta. Si
        jugaste un torneo donde figurás como un nombre suelto, esos partidos no aparecen hasta que
        el organizador te vincule o reclames tu lugar.
      </Note>

      <h3 className="font-condensed font-bold text-[18px] text-white mb-3 mt-2">
        Qué mide cada número
      </h3>
      <ul className="flex flex-col gap-3 mb-6">
        {NUMEROS.map((n, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="text-brand mt-0.5 shrink-0">›</span>
            <div>
              <div className="font-condensed font-bold text-[15px] text-white mb-0.5">{n.label}</div>
              <div className="text-secondary text-[14px] font-sans leading-relaxed">{n.text}</div>
            </div>
          </li>
        ))}
      </ul>

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Por qué algo puede aparecer vacío
      </h3>
      <Bullets
        items={[
          'Hay bloques que necesitan un mínimo de datos para decir algo. El ranking entre tus seguidos, por ejemplo, aparece recién cuando hay al menos dos personas con partidos cargados entre vos y la gente que seguís.',
          'Otros dependen de cómo se cargaron los partidos: si nadie anotó los sets o la duración, esos números no se pueden calcular.',
          'Preferimos no mostrar un número antes que mostrar uno que engañe.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Seguir y que te sigan
      </h3>
      <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
        Desde cualquier perfil podés seguir a esa persona. Tu perfil muestra seguidores y seguidos,
        y cuando hay partidos cargados aparece un ranking que te compara con la gente que seguís,
        ordenado por victorias. Ese bloque lo ves sólo vos, en tu propio perfil.
      </p>

      <p className="text-content text-[14px] font-sans leading-relaxed">
        El perfil se comparte con el botón de compartir, y también podés generar una imagen con tus
        números para subir a redes.
      </p>
    </TutorialSection>
  )
}
