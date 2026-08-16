import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'

export default function FormatosSection() {
  return (
    <TutorialSection
      title="Modo Liga vs Modo Americano"
      description="Al crear un torneo dentro de una categoría, elegís el formato de juego. Cada formato tiene reglas y una dinámica distinta."
    >
      <div className="flex flex-col gap-8 mb-8">
        <div>
          <div className="font-condensed font-bold text-[18px] text-white mb-2">
            Modo Liga
          </div>
          <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
            Los jugadores se agrupan en parejas para cada torneo (que pueden cambiar de torneo en torneo). Se juegan partidos entre parejas y los puntos se acumulan en una tabla de posiciones general del torneo. Es ideal para grupos de amigos que juegan regularmente.
          </p>
          <ul className="flex flex-col gap-2 mb-4">
            {[
              'No importa si son jugadores pares o impares.',
              'Las parejas se forman libremente para cada torneo.',
              'Los resultados suman puntos a la tabla general del torneo.',
              'Podés agregar, editar o eliminar parejas por torneo.',
            ].map((item, i) => (
              <li key={i} className="flex gap-3 items-start text-[14px] text-secondary font-sans">
                <span className="text-brand mt-0.5 shrink-0">›</span>
                {item}
              </li>
            ))}
          </ul>
          <TutorialMedia caption="Elección del formato al crear el torneo" name="nuevo-torneo-formato" />
          <TutorialMedia caption="Tabla de posiciones en Modo Liga" name="torneo-liga-tabla" />
        </div>

        <div className="border-t border-border pt-8">
          <div className="font-condensed font-bold text-[18px] text-white mb-2">
            Modo Americano
          </div>
          <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
            Formato de torneo estructurado para 8 a 16 parejas fijas. Se divide en dos fases: una fase previa (2 partidos por pareja) y una fase de cuadro final (eliminación directa con los mejores clasificados). Ideal para torneos de clubes de padel.
          </p>
          <ul className="flex flex-col gap-2 mb-4">
            {[
              'No pueden haber jugadores sueltos.', 
              'Se requieren mínimo 8 parejas para iniciar. Con menos, el torneo queda en BORRADOR: lo podés crear igual y sumar las parejas que faltan más tarde, pero no se pueden cargar partidos ni generar el cuadro hasta llegar al mínimo.',
              'Fase previa: 2 partidos al azar que suman a una tabla general para clasificar al cuadro final.',
              'Cuadro final: octavos, cuartos, semifinales y final por eliminación directa.',
              'El torneo se resuelve en una sola fecha.',
            ].map((item, i) => (
              <li key={i} className="flex gap-3 items-start text-[14px] text-secondary font-sans">
                <span className="text-brand mt-0.5 shrink-0">›</span>
                {item}
              </li>
            ))}
          </ul>
          <TutorialMedia caption="Vista de agregado de parejas en Modo Americano" name="americano-gestion-parejas" />
          <TutorialMedia caption="Vista de cuadro final en Modo Americano" name="americano-cuadro" />
        </div>
      </div>
    </TutorialSection>
  )
}
