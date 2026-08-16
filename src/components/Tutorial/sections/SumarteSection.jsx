import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function SumarteSection() {
  return (
    <TutorialSection
      title="Sumarte a un torneo"
      description="Si alguien organizó un torneo y vos jugás en él, podés reclamar tu lugar para que los partidos cuenten en tu perfil. No hace falta que el organizador te busque: entrás al link del torneo y lo pedís desde ahí."
      steps={[
        {
          label: 'Abrí el link del torneo',
          text: 'El organizador comparte un link público. No necesitás cuenta para verlo, pero sí para sumarte.',
        },
        {
          label: 'Buscá la barra "¿Jugás en este torneo?"',
          text: 'Aparece arriba de todo, apenas abrís el torneo. Si no tenés la sesión iniciada, el botón te lleva a iniciar sesión y volvés al mismo lugar.',
        },
        {
          label: 'Elegí con qué nombre jugás',
          text: 'El desplegable lista los jugadores del torneo que todavía no tienen una cuenta vinculada. Elegí el tuyo y tocá "Solicitar unirse".',
        },
        {
          label: 'Esperá la aprobación',
          text: 'La barra pasa a "Solicitud pendiente de aprobación". Al organizador le llega una notificación y desde ahí acepta o rechaza.',
        },
      ]}
    >
      <TutorialMedia caption="Barra para solicitar unirse desde la vista pública del torneo" name="torneo-solicitar-unirse" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Si te invitaron primero
      </h3>
      <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
        Cuando el organizador ya te invitó, la barra no te pide solicitar nada: te muestra
        directamente <span className="text-white">"te invitó a unirte como&nbsp;…"</span> con los
        botones <span className="text-white">Aceptar</span> y{' '}
        <span className="text-white">Rechazar</span>. La invitación tiene prioridad y aparece
        aunque el torneo ya haya terminado, así que también podés aceptarla más tarde.
      </p>

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Qué cambia cuando te aceptan
      </h3>
      <Bullets
        items={[
          'Ese jugador pasa a mostrarse con el nombre de tu cuenta, en ese torneo y en los anteriores de la misma categoría.',
          'Los partidos empiezan a sumar a las estadísticas de tu perfil público.',
          'La categoría aparece en tu perfil junto al resto de las que jugás.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Cosas que te pueden frenar
      </h3>
      <Bullets
        items={[
          'La barra sólo aparece mientras el torneo está en curso. Si ya está finalizado, pedile al organizador que te vincule desde el panel de jugadores.',
          '"No hay jugadores disponibles para reclamar" significa que todos los jugadores del torneo ya tienen cuenta vinculada. Si falta el tuyo, el organizador tiene que agregarlo primero.',
          'Una cuenta ocupa un solo lugar por categoría. Si ya jugás en esa categoría con otro nombre, no vas a poder reclamar un segundo jugador.',
          'Si te rechazaron, podés volver a solicitarlo: la barra vuelve a habilitarse.',
        ]}
      />

      <Note>
        Sólo el dueño de la categoría puede aceptar o rechazar solicitudes. Un co-organizador
        administra los torneos, pero no resuelve estas peticiones.
      </Note>
    </TutorialSection>
  )
}
