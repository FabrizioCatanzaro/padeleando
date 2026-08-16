import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function CompartirSection() {
  return (
    <TutorialSection
      title="Compartir un torneo"
      description="Todo torneo tiene una vista pública pensada para los espectadores: se abre sin cuenta, se actualiza sola y muestra posiciones, partidos y cuadro eliminatorio. Es lo que mandás al grupo para que sigan los resultados sin preguntarte."
      steps={[
        {
          label: 'Tocá compartir',
          text: 'Desde el torneo, el botón de compartir arma el mensaje con el nombre del torneo, la categoría y el club.',
        },
        {
          label: 'Elegí por dónde',
          text: 'WhatsApp con el texto ya listo, copiar el link, código QR, o el menú de compartir del teléfono.',
        },
      ]}
    >
      <TutorialMedia caption="Opciones para compartir una categoría" name="categoria-compartir" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Qué se puede compartir
      </h3>
      <Bullets
        items={[
          'El torneo: la vista pública con posiciones, partidos y cuadro.',
          'La categoría: para que se sumen o sigan todos los torneos, no una fecha suelta.',
          'Los partidos: el fixture en formato texto, para mandar quién juega contra quién.',
          'Tu perfil y tus estadísticas, con su propia imagen para redes.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        El código QR
      </h3>
      <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
        Genera un QR del mismo link. Sirve para imprimirlo y dejarlo en el club, o para mostrarlo
        desde el teléfono y que lo escaneen en el momento, sin tener que pasar el link uno por uno.
      </p>

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        La vista pública
      </h3>
      <Bullets
        items={[
          'Se abre sin cuenta y sin instalar nada.',
          'Se refresca sola cada 30 segundos, así que los que miran ven los resultados apenas los cargás.',
          'Muestra el estado del torneo: próximamente, en curso o finalizado, con el campeón cuando termina.',
          'Si tenés la inscripción abierta, también muestra el precio y tus contactos.',
          'Si hay jugadores que no están vinculados al torneo, se pueden sumar desde la vista pública con un botón de "Solicitar unirse".',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Modo TV
      </h3>
      <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
        Dentro de la vista pública hay un modo pensado para dejar puesto en una pantalla del club:
        va rotando solo entre posiciones, partidos y cuadro. Podés pausarlo o moverte a mano entre
        pantallas.
      </p>

      <Note>
        Si la categoría es privada, el link igual funciona para quien lo tenga: la privacidad la
        saca de las búsquedas y los listados, no convierte el link en secreto. Si no querés que
        circule, no lo compartas.
      </Note>
    </TutorialSection>
  )
}
