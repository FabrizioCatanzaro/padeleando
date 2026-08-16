import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'

export default function PerfilSection() {
  return (
    <TutorialSection
      title="Editar tus datos personales"
      description="Podés actualizar tu nombre, nombre de usuario y contraseña desde tu perfil en cualquier momento."
      steps={[
        {
          label: 'Ir a tu perfil',
          text: 'Hacé clic en el ícono de usuario en la esquina superior derecha y seleccioná "Mi perfil".',
        },
        {
          label: 'Activar el modo edición',
          text: 'En tu perfil verás un botón para editar. Hacé clic en él para habilitar los campos de edición.',
        },
        {
          label: 'Modificar tus datos',
          text: 'Podés cambiar tu nombre visible y tu nombre de usuario (@usuario). El nombre de usuario debe ser único en la plataforma.',
        },
        {
          label: 'Cambiar contraseña',
          text: 'Si querés cambiar tu contraseña, completá el campo correspondiente. Necesitarás ingresar la nueva contraseña dos veces para confirmarla.',
        },
        {
          label: 'Guardar',
          text: 'Confirmá los cambios con el botón de guardar. Los datos se actualizan de inmediato.',
        },
      ]}
    >
      <TutorialMedia caption="Formulario de edición de perfil" name="perfil-editar" />
    </TutorialSection>
  )
}
