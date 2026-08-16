import TutorialSection from '../TutorialSection'
import Bullets from '../Bullets'
import Note from '../Note'
import { FREE_MAX_GROUPS, FREE_TOURNAMENTS_PER_MONTH } from '../../../utils/plan'

export default function PremiumSection() {
  return (
    <TutorialSection
      title="Plan Básico y Premium"
      description="Padeleando se usa gratis. El plan Básico alcanza para organizar de forma estable; Premium levanta los límites y suma las funciones que necesitan los que le darían mucho uso a la app."
    >
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 border border-border-strong rounded-lg p-4">
          <div className="font-condensed font-bold text-[16px] text-white mb-3">Básico</div>
          <Bullets
            className="mb-0"
            items={[
              `Hasta ${FREE_MAX_GROUPS} categorías.`,
              `Hasta ${FREE_TOURNAMENTS_PER_MONTH} torneos por mes en cada categoría.`,
              'Partidos, posiciones, cuadro y estadísticas básicas.',
            ]}
          />
        </div>
        <div className="flex-1 border border-brand/40 rounded-lg p-4 bg-brand/5">
          <div className="font-condensed font-bold text-[16px] text-brand mb-3">Premium</div>
          <Bullets
            className="mb-0"
            items={[
              'Categorías y torneos ilimitados.',
              'Estadísticas avanzadas en tu perfil.',
              'Estadísticas avanzadas de todas tus categorías y torneos.',
              'Galería de fotos en los torneos.',
              'Ícono premium en tu perfil.',
              'Soporte prioritario.',
            ]}
          />
        </div>
      </div>

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Cómo se cuentan los límites
      </h3>
      <Bullets
        items={[
          `El cupo de ${FREE_TOURNAMENTS_PER_MONTH} torneos es por categoría y por mes calendario: se renueva el día 1, no a los 30 días.`,
          'Los límites se miden siempre contra el dueño de la categoría, no contra quien crea el torneo. Un co-organizador Premium no levanta el límite de un dueño Básico, y al revés tampoco.',
          'Cuando llegás al tope, la app te lo dice en el momento y te ofrece pasar a Premium.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Si dejás de ser Premium
      </h3>
      <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
        No se borra ni se esconde nada de lo que ya creaste. Volver al plan Básico sólo frena la
        creación de cosas nuevas:
      </p>
      <Bullets
        items={[
          `Si tenías 5 categorías, las 5 siguen funcionando enteras. Lo único que no vas a poder es crear una sexta hasta bajar de ${FREE_MAX_GROUPS}.`,
          'Los torneos que ya creaste quedan intactos, con sus partidos, posiciones y cuadro.',
          'Las fotos que ya subiste siguen ahí y se siguen viendo; lo que se cierra es el botón de subir más.',
          'Las estadísticas avanzadas dejan de mostrarse, pero los datos no se pierden: vuelven si volvés a Premium.',
        ]}
      />

      <Note>
        Si pagaste y el plan no se activó, en el cuadro de "Editar perfil" dentro de tu perfil hay una opción para verificar el pago, que
        revisa el estado y lo destraba sin tener que escribirnos.
      </Note>
    </TutorialSection>
  )
}
