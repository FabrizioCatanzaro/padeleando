import {
  UserCheck, Plus, Split, CheckCheck, Lock, Pencil, Users, UserCog,
  Mail, Ticket, Bell, LogIn, UserPlus, ArrowRightLeft,
  BarChart3, Sparkles, Share2, Crown, Image as ImageIcon, Camera, MapPin, Search,
  Timer, Smartphone, ShieldCheck, Heart,
} from 'lucide-react'
import RegistroSection from './sections/RegistroSection'
import CrearCategoriaSection from './sections/CrearCategoriaSection'
import FormatosSection from './sections/FormatosSection'
import FinalizarSection from './sections/FinalizarSection'
import PrivacidadSection from './sections/PrivacidadSection'
import EditarCategoriaSection from './sections/EditarCategoriaSection'
import JugadoresSection from './sections/JugadoresSection'
import PerfilSection from './sections/PerfilSection'
import CrearTorneoSection from './sections/CrearTorneoSection'
import CrearPartidoSection from './sections/CrearPartidoSection'
import InvitarJugadoresSection from './sections/InvitarJugadoresSection'
import InscripcionesSection from './sections/InscripcionesSection'
import SumarteSection from './sections/SumarteSection'
import NotificacionesSection from './sections/NotificacionesSection'
import CoOrganizadoresSection from './sections/CoOrganizadoresSection'
import TransferirSection from './sections/TransferirSection'
import EstadisticasPerfilSection from './sections/EstadisticasPerfilSection'
import EstadisticasAvanzadasSection from './sections/EstadisticasAvanzadasSection'
import CompartirSection from './sections/CompartirSection'
import PremiumSection from './sections/PremiumSection'
import CargarPartidoSection from './sections/CargarPartidoSection'
import HistoriasSection from './sections/HistoriasSection'
import FotosSection from './sections/FotosSection'
import ClubesSection from './sections/ClubesSection'
import EncontrarSection from './sections/EncontrarSection'
import SeguirSection from './sections/SeguirSection'
import InstalarSection from './sections/InstalarSection'
import CuentaSection from './sections/CuentaSection'

// Agrupadas por lo que el usuario quiere hacer, no por el orden en que se
// construyeron. Con más de diez secciones una lista plana deja de servir.
//
// Vive en su propio módulo porque scripts/build-tutorial-index.mjs lo importa
// para renderizar cada sección a texto plano y generar tutorialIndex.js. Si
// estuviera dentro de TutorialView.jsx el script tendría que parsear JSX.
export const GROUPS = [
  {
    id: 'empezar',
    label: 'Empezar',
    sections: [
      { id: 'registro',        icon: UserCheck, title: '¿Para qué registrarme?',     component: RegistroSection },
      { id: 'crear-categoria', icon: Plus,      title: 'Crear una categoría',        component: CrearCategoriaSection },
      { id: 'crear-torneo',    icon: Plus,      title: 'Crear un torneo',            component: CrearTorneoSection },
      { id: 'crear-partido',   icon: Plus,      title: 'Crear un partido',           component: CrearPartidoSection },
      { id: 'instalar',        icon: Smartphone, title: 'Instalar la app',           component: InstalarSection },
    ],
  },
  {
    id: 'organizar',
    label: 'Organizar',
    sections: [
      { id: 'formatos',         icon: Split,      title: 'Modo Liga vs Americano',      component: FormatosSection },
      { id: 'jugadores',        icon: Users,      title: 'Jugadores y parejas',         component: JugadoresSection },
      { id: 'invitar',          icon: Mail,       title: 'Invitar y vincular cuentas',  component: InvitarJugadoresSection },
      { id: 'cargar-partido',   icon: Timer,      title: 'Cargar un partido en detalle', component: CargarPartidoSection },
      { id: 'inscripciones',    icon: Ticket,     title: 'Abrir la inscripción',        component: InscripcionesSection },
      { id: 'fotos',            icon: Camera,     title: 'Fotos del torneo',            component: FotosSection },
      { id: 'clubes',           icon: MapPin,     title: 'Clubes',                      component: ClubesSection },
      { id: 'finalizar-torneo', icon: CheckCheck, title: 'Finalizar un torneo',         component: FinalizarSection },
      { id: 'editar',           icon: Pencil,     title: 'Editar nombre y descripción', component: EditarCategoriaSection },
      { id: 'privacidad',       icon: Lock,       title: 'Privacidad de la categoría',  component: PrivacidadSection },
    ],
  },
  {
    id: 'equipo',
    label: 'Organizar en equipo',
    sections: [
      { id: 'co-organizadores', icon: UserPlus,       title: 'Co-organizadores',        component: CoOrganizadoresSection },
      { id: 'transferir',       icon: ArrowRightLeft, title: 'Transferir la categoría', component: TransferirSection },
    ],
  },
  {
    id: 'participar',
    label: 'Participar',
    sections: [
      { id: 'sumarte',        icon: LogIn,  title: 'Sumarte a un torneo',        component: SumarteSection },
      { id: 'notificaciones', icon: Bell,   title: 'Notificaciones',             component: NotificacionesSection },
      { id: 'encontrar',      icon: Search, title: 'Encontrar categorías',       component: EncontrarSection },
      { id: 'seguir',         icon: Heart,  title: 'Seguir jugadores',           component: SeguirSection },
    ],
  },
  {
    id: 'difundir',
    label: 'Compartir',
    sections: [
      { id: 'compartir', icon: Share2, title: 'Compartir un torneo',  component: CompartirSection },
      { id: 'historias', icon: ImageIcon, title: 'Historias para redes',  component: HistoriasSection },
    ],
  },
  {
    id: 'cuenta',
    label: 'Tu cuenta',
    sections: [
      { id: 'perfil',       icon: UserCog,     title: 'Editar datos personales',      component: PerfilSection },
      { id: 'estadisticas', icon: BarChart3,   title: 'Tu perfil y tus estadísticas', component: EstadisticasPerfilSection },
      { id: 'avanzadas',    icon: Sparkles,    title: 'Estadísticas avanzadas',       component: EstadisticasAvanzadasSection },
      { id: 'premium',      icon: Crown,       title: 'Plan Básico y Premium',        component: PremiumSection },
      { id: 'seguridad',    icon: ShieldCheck, title: 'Tu cuenta y tu seguridad',     component: CuentaSection },
    ],
  },
]

export const SECTIONS = GROUPS.flatMap((g) => g.sections)
