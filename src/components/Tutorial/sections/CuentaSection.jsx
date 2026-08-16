import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function CuentaSection() {
  return (
    <TutorialSection
      title="Tu cuenta y tu seguridad"
      description="Todo lo que tiene que ver con el acceso a tu cuenta: cómo entrás, cómo recuperás el acceso si lo perdés y qué pasa si decidís irte."
    >
      <TutorialMedia caption="Eliminar la cuenta, desde tu perfil" name="perfil-eliminar-cuenta" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Cómo entrás
      </h3>
      <Bullets
        items={[
          'Con email y contraseña, o con tu cuenta de Google.',
          'Tu nombre de usuario es lo que forma la dirección de tu perfil público. Al registrarte te sugerimos uno libre y te avisamos en el momento si el que elegís ya está tomado.',
          'La sesión se mantiene sola mientras usás la app.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Verificar el email
      </h3>
      <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
        Al registrarte te mandamos un mail con un link para confirmar la dirección. Si no te llegó,
        podés pedir que lo reenviemos. Revisá el correo no deseado antes de reintentar: hay un
        límite de reenvíos por rato para evitar el abuso.
      </p>

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Si te olvidaste la contraseña
      </h3>
      <Bullets
        items={[
          'Desde la pantalla de inicio de sesión pedís el mail de recuperación.',
          'El link te lleva a elegir una contraseña nueva y vale por tiempo limitado.',
          'Si entrás con Google no tenés contraseña que recuperar: seguí entrando por ahí.',
          'Si ya estás adentro y sólo querés cambiarla, se hace desde tu perfil poniendo la actual y la nueva.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Eliminar tu cuenta
      </h3>
      <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
        Se hace desde tu perfil y es permanente. Para que el borrado no rompa el historial de otra
        gente, funciona así:
      </p>
      <Bullets
        items={[
          'Tus categorías y torneos se conservan bajo una cuenta anónima, así los que jugaron ahí no pierden sus resultados.',
          'Tus partidos en categorías de otros quedan sin vincular: siguen existiendo, pero ya no apuntan a vos.',
          'Tu perfil público y tus estadísticas personales desaparecen.',
          'No se puede deshacer.',
        ]}
      />

      <Note>
        Si organizás una categoría que sigue activa, conviene transferirla antes de borrar la
        cuenta. Así queda en manos de alguien del grupo en vez de bajo una cuenta anónima.
      </Note>
    </TutorialSection>
  )
}
