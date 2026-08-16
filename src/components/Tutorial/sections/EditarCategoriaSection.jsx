import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'

export default function EditarCategoriaSection() {
  return (
    <TutorialSection
      title="Editar nombre y descripción de una categoría"
      description="Podés cambiar el nombre y la descripción de tu categoría en cualquier momento desde la página de la categoría."
      steps={[
        {
          label: 'Ir a la página de la categoría',
          text: 'Ingresá a la categoría que querés editar desde la pantalla principal.',
        },
        {
          label: 'Hacer clic en el ícono de edición',
          text: 'Junto al nombre de la categoría verás los "tres puntitos verticales" que contienen distintas opciones. Hacé clic en el botón de "Editar categoría" para activar el modo edición.',
        },
        {
          label: 'Modificar y guardar',
          text: 'Editá el nombre y/o la descripción en los campos que aparecen. Confirmá los cambios con el botón de guardar.',
        },
        {
          label: 'Editar torneo',
          text: 'Desde la página donde organizas el torneo podes realizar el mismo procedimiento para editar el nombre del torneo.',
        },
      ]}
    >
      <TutorialMedia caption="Menú de la categoría, con la opción de editar" name="categoria-opciones" />
      <TutorialMedia caption="Formulario de edición de la categoría" name="categoria-edicion" />
    </TutorialSection>
  )
}
