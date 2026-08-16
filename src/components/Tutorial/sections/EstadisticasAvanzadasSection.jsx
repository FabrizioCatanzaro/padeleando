import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function EstadisticasAvanzadasSection() {
  return (
    <TutorialSection
      title="Estadísticas avanzadas"
      description="Es un bloque extra al final del perfil, incluido en el plan Premium. Va más allá del resumen: mide cómo jugás partido a partido y cómo cambia tu rendimiento a lo largo del año."
    >
      <TutorialMedia caption="Bloque de estadísticas avanzadas al final del perfil" name="perfil-stats-avanzadas" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Qué incluye
      </h3>
      <Bullets
        items={[
          'Games a favor, en contra y la diferencia entre ambos.',
          'Cómo te va en los partidos parejos, los que se definen por un solo game.',
          'Palizas dadas y sufridas, y remontadas.',
          'Sets ganados y partidos que se fueron al tercer set.',
          'Tu actividad de los últimos doce meses: partidos por mes, win rate por mes, mejor mes, meses activos y promedio mensual.',
          'Tu mejor racha histórica.',
          'Qué día de la semana jugás más.',
          'Cuánto tiempo pasaste en cancha.',
        ]}
      />

      <Note>
        Varios de estos números se calculan sobre lo que se cargó en cada partido. Si en tu categoría
        nadie anota los sets o la duración, esos bloques van a aparecer vacíos o medir menos
        partidos de los que jugaste.
      </Note>

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Quién las puede ver
      </h3>
      <Bullets
        items={[
          'Necesitás plan Premium para tenerlas. Sin Premium no aparecen, ni siquiera para vos.',
          'Por defecto son privadas: sólo las ve el dueño del perfil.',
          'Podés hacerlas públicas con el interruptor que aparece arriba del bloque, en tu propio perfil.',
          'Al hacerlas públicas, cualquiera que visite tu perfil las ve, y también quedan incluidas en la imagen que se genera para compartir.',
          'Podés volver a hacerlas privadas cuando quieras, con el mismo interruptor.',
        ]}
      />

      <p className="text-content text-[14px] font-sans leading-relaxed">
        La privacidad no es sólo visual: cuando el bloque no corresponde mostrarse, esos datos ni
        siquiera salen del servidor.
      </p>
    </TutorialSection>
  )
}
