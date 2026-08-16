import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function PrivacidadSection() {
  return (
    <TutorialSection
      title="Cambiar la privacidad de una categoría"
      description="Podés controlar quién puede ver tu categoría cambiando su privacidad entre público y privado en cualquier momento."
      steps={[
        {
          label: 'Ir a la página de la categoría',
          text: 'Ingresá a la categoría desde tu lista de categorías en la pantalla principal.',
        },
        {
          label: 'Buscar el ícono de privacidad',
          text: 'En la cabecera de la categoría verás un ícono de globo (público) o candado (privado). Hacé clic en él para alternar entre los dos estados.',
        },
        {
          label: 'El cambio es inmediato',
          text: 'No hace falta guardar. El ícono cambia al instante y la nueva configuración queda aplicada.',
        },
      ]}
    >
      <TutorialMedia caption="Elección de visibilidad al crear la categoría" name="nueva-categoria-visibilidad" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Qué cambia al ponerla privada
      </h3>
      <Bullets
        items={[
          'Deja de aparecer en la búsqueda de categorías y en el listado de categorías cercanas.',
          'Nadie la puede agregar a favoritas.',
          'Los jugadores que ya están adentro la siguen viendo con normalidad, igual que los co-organizadores.',
        ]}
      />

      <Note>
        Privada no quiere decir con contraseña: el link de un torneo sigue funcionando para
        cualquiera que lo tenga. La privacidad la saca de las búsquedas y los listados, pero no
        convierte el link en secreto.
      </Note>
    </TutorialSection>
  )
}
