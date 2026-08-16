import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function InvitarJugadoresSection() {
  return (
    <TutorialSection
      title="Invitar jugadores y vincular cuentas"
      description="Un jugador de tu torneo puede ser sólo un nombre suelto o estar vinculado a una cuenta de Padeleando. Vincularlo es opcional, pero es lo que hace que esa persona vea sus partidos en su propio perfil."
      steps={[
        {
          label: 'Entrá al panel de jugadores',
          text: 'Desde el torneo, abrí la gestión de jugadores. Cada jugador que todavía no tiene cuenta vinculada muestra un campo para invitar.',
        },
        {
          label: 'Escribí @usuario o el email',
          text: 'Podés invitar por nombre de usuario (con arroba) o por la dirección de correo con la que se registró.',
        },
        {
          label: 'Enviá la invitación',
          text: 'Si la persona tiene cuenta, le llega una notificación a la campana y también le aparece en la vista del torneo.',
        },
        {
          label: 'Esperá a que acepte',
          text: 'Recién cuando acepta, el jugador queda vinculado y pasa a mostrarse con el nombre de su cuenta.',
        },
      ]}
    >
      <TutorialMedia caption="Pestaña Jugadores de la categoría" name="categoria-jugadores" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Qué cambia al vincular
      </h3>
      <Bullets
        items={[
          'El nombre del jugador pasa a ser el de la cuenta en toda la categoría, incluidos los torneos y los cuadros ya jugados.',
          'Sus partidos empiezan a contar en su perfil público: partidos, victorias, racha, compañeros frecuentes y títulos.',
          'La categoría aparece listada en su perfil.',
          'Si no lo vinculás, el jugador sigue funcionando igual dentro del torneo: los resultados y la tabla no cambian, sólo no se acumulan en ningún perfil.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Reglas a tener en cuenta
      </h3>
      <Bullets
        items={[
          'La invitación es por jugador y vale para toda la categoría, no sólo para el torneo desde el que la mandaste.',
          'Un jugador que ya tiene cuenta vinculada no se puede invitar de nuevo.',
          'Sólo puede haber una invitación pendiente por jugador. Cancelala si querés invitar a otra persona.',
          'Una cuenta ocupa un solo lugar por categoría: si esa persona ya juega ahí con otro nombre, la invitación se rechaza y te avisa con qué nombre está.',
          'Si la persona ya aceptó una invitación tuya en esa misma categoría, la próxima se vincula al instante, sin que tenga que confirmar nada.',
        ]}
      />

      <Note>
        Si te equivocaste al vincular un jugador, podés desvincularlo desde la gestión de jugadores. Esto no borra los resultados ni afecta la tabla, sólo deja de acumularse en el perfil de esa cuenta.
      </Note>
    </TutorialSection>
  )
}
