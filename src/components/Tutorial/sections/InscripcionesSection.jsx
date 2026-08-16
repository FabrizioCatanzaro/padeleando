import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'
import Note from '../Note'

export default function InscripcionesSection() {
  return (
    <TutorialSection
      title="Abrir la inscripción"
      description="Podés mostrar el precio y tus datos de contacto en la vista pública del torneo, para que la gente sepa cuánto sale y a quién escribirle para anotarse. Es opcional y lo activás cuando quieras."
      steps={[
        {
          label: 'Activá la inscripción',
          text: 'Marcá "Mostrar precio y contacto para inscribirse". Sin eso, no se muestra nada en la vista pública.',
        },
        {
          label: 'Cargá el precio',
          text: 'Un número entero, y elegís si es por jugador o por pareja. Podés dejarlo vacío: la barra va a decir sólo "Inscripción abierta".',
        },
        {
          label: 'Agregá los contactos',
          text: 'Hasta cuatro: WhatsApp, teléfono, email e Instagram, uno por canal. Si ya los tenés cargados en tu perfil, los podés reutilizar con un toque.',
        },
        {
          label: 'Guardá',
          text: 'La barra de inscripción aparece arriba del torneo, con los botones de contacto listos para tocar.',
        },
      ]}
    >
      <TutorialMedia caption="Barra de inscripción en la vista pública del torneo" name="banner-inscripcion" />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-2">
        Dónde se configura
      </h3>
      <Bullets
        items={[
          'En la categoría, al editarla: sirve de valor por defecto para todos los torneos nuevos.',
          'Al crear un torneo: lo que cargues ahí vale sólo para esa fecha.',
          'En la gestión de un torneo ya creado: para corregir el precio o el contacto sobre la marcha.',
        ]}
      />

      <h3 className="font-condensed font-bold text-[18px] text-white mb-2 mt-6">
        Cómo funciona la herencia
      </h3>
      <p className="text-content text-[14px] font-sans leading-relaxed mb-4">
        Cada torneo hereda de la categoría, campo por campo. Lo que dejás vacío en el torneo usa
        el valor de la categoría, y lo que cargás lo pisa sólo para esa fecha. En el formulario, los
        campos heredados te muestran el valor de la categoría en gris como referencia.
      </p>
      <Bullets
        items={[
          'Cambiás el precio en la categoría → cambia en todos los torneos que no tengan uno propio.',
          'Ponés otro precio en un torneo puntual → esa fecha queda con el suyo y el resto no se toca.',
          'Borrás el precio de un torneo → vuelve a heredar el de la categoría.',
        ]}
      />

      <Note>
        Esto es informativo: muestra cuánto sale y a quién escribirle, pero Padeleando no cobra ni
        procesa el pago. El cobro lo arreglás vos con el jugador por el canal que elijas.
      </Note>

      <p className="text-content text-[14px] font-sans leading-relaxed">
        La barra es pública a propósito: se ve sin tener cuenta, así puede escribirte también
        alguien que todavía no está registrado.
      </p>
    </TutorialSection>
  )
}
