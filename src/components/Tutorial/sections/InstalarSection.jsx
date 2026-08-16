import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'
import Bullets from '../Bullets'

export default function InstalarSection() {
  return (
    <TutorialSection
      title="Instalar la app en el teléfono"
      description="Padeleando se puede agregar a la pantalla de inicio y usarse como una app más, sin pasar por la tienda ni ocupar espacio. Es la misma web, pero abre a pantalla completa y entrás de un toque."
      steps={[
        {
          label: 'Abrí Padeleando en el navegador del teléfono',
          text: 'Si tu navegador lo soporta, aparece solo un aviso para instalarla.',
        },
        {
          label: 'Tocá "Agregar a inicio"',
          text: 'Si no ves el aviso, lo hacés desde el menú del navegador: "Agregar a pantalla de inicio" en Android, "Compartir → Agregar a inicio" en iPhone.',
        },
        {
          label: 'Listo',
          text: 'El ícono queda entre tus apps y abre sin la barra del navegador.',
        },
      ]}
    >
      <TutorialMedia caption="Instalar la app desde el menú de tu cuenta" name="instalar-app" />

      <Bullets
        items={[
          'No hace falta instalar nada para usar Padeleando: es una comodidad, no un requisito.',
          'Ocupa muy poco, porque no es una app descargada sino un acceso directo a la web.',
          'Se actualiza sola: siempre estás en la última versión.',
          'Los que sólo miran resultados no necesitan instalarla ni tener cuenta: con el link alcanza.',
        ]}
      />
    </TutorialSection>
  )
}
