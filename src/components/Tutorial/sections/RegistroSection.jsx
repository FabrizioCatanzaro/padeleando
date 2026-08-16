import TutorialSection from '../TutorialSection'
import TutorialMedia from '../TutorialMedia'

export default function RegistroSection() {
  return (
    <TutorialSection
      title="¿Para qué registrarme?"
      description="Podés explorar categorías públicas sin una cuenta, pero para aprovechar todas las funciones de Padeleando necesitás registrarte. Es gratis y solo lleva unos segundos."
      steps={[
        {
          label: 'Organizar torneos',
          text: 'Creá y administrá tus propias categorías. Controlás los torneos, los participantes, los resultados y las estadísticas.',
        },
        {
          label: 'Sumarte a los torneos que jugás',
          text: 'Podés reclamar tu lugar en un torneo que organizó otra persona, o aceptar la invitación que te manden. Todo llega a la campana de notificaciones del menú.',
        },
        {
          label: 'Estadísticas propias',
          text: 'Una vez que tu cuenta queda vinculada a un jugador, tu perfil acumula esos resultados en todas las categorías en las que participás: partidos jugados, ganados, racha, compañeros frecuentes y títulos.',
        },
        {
          label: 'Perfil público',
          text: 'Tenés una página de perfil pública con tu nombre de usuario y tus categorías, que podés compartir con otros jugadores.',
        },
      ]}
    >
      <TutorialMedia caption="Pantalla de registro e inicio de sesión" name="login" />
    </TutorialSection>
  )
}
