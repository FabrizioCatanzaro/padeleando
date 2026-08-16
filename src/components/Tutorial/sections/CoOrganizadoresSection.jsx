import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function CoOrganizadoresSection() {
  return (
    <TutorialSection
      title="Co-organizadores"
      description="Si no querés cargar todos los resultados vos, podés sumar co-organizadores a una categoría. Son gente de confianza que administra los torneos con las mismas herramientas que vos, pero sin poder tocar la categoría en sí."
      steps={[
        {
          label: 'Abrí la categoría',
          text: 'En el bloque de co-organizadores vas a ver a los que ya están y el botón para invitar. Sólo aparece si sos el dueño.',
        },
        {
          label: 'Elegí cómo invitar',
          text: 'Por @usuario o email, que le manda una notificación; o generando un link de invitación que podés pegar donde quieras.',
        },
        {
          label: 'Esperá a que acepte',
          text: 'Con @usuario o email tiene que aceptar desde la campana. Con el link, entra, ve de qué categoría se trata y confirma ahí.',
        },
      ]}
    >
      <TutorialMedia caption="Panel de co-organizadores de la categoría" name="categoria-coorganizadores" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Qué puede hacer un co-organizador
      </h3>
      <Bullets
        items={[
          'Crear, editar y borrar torneos de esa categoría.',
          'Agregar, editar y eliminar jugadores y parejas.',
          'Cargar, corregir y borrar resultados, y armar el cuadro del americano.',
          'Configurar la inscripción de cada torneo y subir fotos.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Qué queda sólo para el dueño
      </h3>
      <Bullets
        items={[
          'Editar el nombre, la descripción, los íconos y la privacidad de la categoría.',
          'Eliminar la categoría.',
          'Invitar o quitar co-organizadores.',
          'Transferir la propiedad.',
          'Aceptar o rechazar las solicitudes de jugadores que piden unirse a un torneo.',
        ]}
      />

      <Note>
        Los límites del plan se miden siempre contra el dueño de la categoría, nunca contra quien
        está haciendo la acción. Si el dueño tiene plan Básico, un co-organizador Premium tampoco
        va a poder crear un tercer torneo en el mes.
      </Note>

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Quitar o salir
      </h3>
      <Bullets
        items={[
          'El dueño puede quitar a cualquier co-organizador cuando quiera, y volver a invitarlo más adelante.',
          'Un co-organizador puede salirse solo. Si lo hace, pierde el acceso y sólo el dueño puede volver a invitarlo.',
          'Quitar a alguien no borra nada de lo que cargó: los torneos, los resultados y las fotos quedan como están.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Cosas que te pueden frenar
      </h3>
      <Bullets
        items={[
          'Si invitás por @usuario o email, esa cuenta tiene que existir: a diferencia de las invitaciones a jugadores, acá te avisa si no la encuentra.',
          'No podés tener dos invitaciones pendientes para la misma persona en la misma categoría.',
          'Ser co-organizador es por categoría, no por torneo: no se puede dar acceso a una sola fecha.',
        ]}
      />
    </TutorialSection>
  )
}
