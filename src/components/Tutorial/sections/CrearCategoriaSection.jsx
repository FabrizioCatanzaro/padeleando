import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'

export default function CrearCategoriaSection() {
  return (
    <TutorialSection
      title="Crear una categoría"
      description='Una categoría en Padeleando reúne todos los torneos que juega un mismo grupo de gente. Podés personalizarlo con nombre, descripción, emojis y privacidad. Para crearlo necesitás estar registrado e iniciar sesión.'
      steps={[
        {
          label: 'Ir al inicio',
          text: 'Desde la pantalla principal, presioná el botón "NUEVA CATEGORÍA" (el primero en la grilla de tus categorías).',
        },
        {
          label: 'Completar el nombre',
          text: 'El nombre es obligatorio y debe tener entre 2 y 30 caracteres. La descripción es opcional.',
        },
        {
          label: 'Elegir privacidad',
          text: 'Público: cualquiera puede buscar y ver los torneos de esa categoría desde la página principal o desde tu perfil. Privado: solo vos podés verlo. Podés cambiarlo en cualquier momento.',
        },
        {
          label: 'Agregar íconos',
          text: 'Podés seleccionar hasta 2 emojis de una lista predefinida para identificar visualmente la categoría en la grilla.',
        },
        {
          label: 'Crear torneos',
          text: 'Dentro de una CATEGORÍA podés crear tantos TORNEOS como quieras. Cada torneo es una como una fecha de la categoría, por ejemplo: La categoría se puede llamar CABALLEROS 8VA y los torneos pueden ser: "Fecha 1", "18/12/2022", etc. Para entender más acerca de los torneos y cómo crearlos, revisá la sección "Crear un torneo" de este tutorial.',
        },
      ]}
    >
      <TutorialMedia caption="Formulario de creación de categoría" name="nueva-categoria-informacion" />
    </TutorialSection>
  )
}
