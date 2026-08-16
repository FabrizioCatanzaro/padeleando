import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Note from '../Note'

const TIPOS = [
  {
    label: 'Te invitaron a un torneo',
    text: 'Alguien vinculó tu cuenta a un jugador de su categoría. Aceptás o rechazás desde la misma notificación.',
  },
  {
    label: 'Alguien quiere unirse a tu torneo',
    text: 'Un jugador pidió reclamar su lugar. Al aceptar elegís a qué jugador vincularlo, y podés cambiar el que pidió si se equivocó.',
  },
  {
    label: 'Te invitaron como co-organizador',
    text: 'Al aceptar podés administrar los torneos de esa categoría, pero no editarla ni eliminarla.',
  },
  {
    label: 'Te quieren transferir una categoría',
    text: 'Es irreversible: si aceptás, pasás a ser el dueño y quien te la transfirió queda como co-organizador.',
  },
  {
    label: 'Te desvincularon de un jugador',
    text: 'El organizador soltó el vínculo entre tu cuenta y ese jugador. Sus partidos dejan de sumar a tu perfil.',
  },
  {
    label: 'Alguien te empezó a seguir',
    text: 'Podés seguirlo de vuelta desde la notificación.',
  },
  {
    label: 'Nuevo torneo en una categoría tuya',
    text: 'Te avisa cuando se crea un torneo nuevo en una categoría en la que jugás.',
  },
  {
    label: 'Avisos de Padeleando',
    text: 'Novedades del equipo y respuestas a lo que hayas solicitado, como el alta de un club.',
  },
]

export default function NotificacionesSection() {
  return (
    <TutorialSection
      title="Notificaciones"
      description="Todo lo que necesita tu respuesta llega a la campana del menú. Reemplazó a la vieja sección de Invitaciones: si tenías ese link guardado, ahora te lleva acá."
    >
      <TutorialMedia caption="Campana de notificaciones y panel desplegable" name="notificaciones" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-3">
        Qué te puede llegar
      </h3>
      <ul className="flex flex-col gap-3 mb-6">
        {TIPOS.map((t, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="text-brand mt-0.5 shrink-0">›</span>
            <div>
              <div className="font-condensed font-bold text-[15px] text-white mb-0.5">
                {t.label}
              </div>
              <div className="text-secondary text-[14px] font-sans leading-relaxed">{t.text}</div>
            </div>
          </li>
        ))}
      </ul>

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Cómo se usa
      </h3>
      <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
        El número sobre la campana cuenta lo que no leíste. Las que piden una decisión traen los
        botones adentro, así que las resolvés sin salir del panel: no hace falta entrar a la
        categoría. Si preferís verlas en grande, el enlace del final abre la página completa, donde
        están agrupadas en <span className="text-white">Esta semana</span> y{' '}
        <span className="text-white">Anteriores</span>, con un botón para cargar las más viejas.
      </p>

      <Note>
        Aceptar una transferencia de propiedad no tiene vuelta atrás. Antes de confirmar, fijate
        bien de qué categoría se trata.
      </Note>
    </TutorialSection>
  )
}
