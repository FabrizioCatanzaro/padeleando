import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet, useParams, useLocation } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import { Titled } from './hooks/useDocumentTitle'
import useScrollToTop from './hooks/useScrollToTop'
import Header       from './components/shared/Header'
import Footer       from './components/shared/Footer'
import AdBanner     from './components/shared/AdBanner'
import InstallPrompt from './components/shared/InstallPrompt'
import Loader       from './components/Loader/Loader'

// La portada y el login se cargan con el bundle inicial: son el punto de
// entrada de casi todas las visitas.
import HomeView     from './components/Home/HomeView'
import AuthView     from './components/Auth/AuthView'

// El resto viaja en chunks propios. Antes las 39 rutas colapsaban en un único
// archivo de 1,29 MB, así que un visitante anónimo en /view/:id descargaba y
// compilaba el panel de admin y las pantallas de suscripción.
const GroupView    = lazy(() => import('./components/Group/GroupView'))
const ProfileView  = lazy(() => import('./components/Auth/ProfileView'))
const ResetPassword = lazy(() => import('./components/Auth/ResetPassword'))
const VerifyEmail   = lazy(() => import('./components/Auth/VerifyEmail'))
const AdminDashboard      = lazy(() => import('./components/Admin/AdminDashboard'))
const AdminUsers          = lazy(() => import('./components/Admin/AdminUsers'))
const AdminTournaments    = lazy(() => import('./components/Admin/AdminTournaments'))
const AdminNotifications  = lazy(() => import('./components/Admin/AdminNotifications'))
const AdminClubs          = lazy(() => import('./components/Admin/AdminClubs'))
const AdminClubRequests   = lazy(() => import('./components/Admin/AdminClubRequests'))
const ClubProfileView     = lazy(() => import('./components/Club/ClubProfileView'))
const Setup        = lazy(() => import('./components/Setup/Setup'))
const MainView     = lazy(() => import('./components/Main/Main'))
const ReadonlyView = lazy(() => import('./components/ReadonlyView/ReadonlyView'))
const InviteAccept        = lazy(() => import('./components/Invitations/InviteAccept'))
const NotificationsView   = lazy(() => import('./components/Notifications/NotificationsView'))
const TutorialView        = lazy(() => import('./components/Tutorial/TutorialView'))
const SubscriptionSuccess = lazy(() => import('./components/Subscription/SubscriptionSuccess'))
const SubscriptionFailure = lazy(() => import('./components/Subscription/SubscriptionFailure'))
const SubscriptionPending = lazy(() => import('./components/Subscription/SubscriptionPending'))
const SubscriptionManage  = lazy(() => import('./components/Subscription/SubscriptionManage'))
const NotFoundView = lazy(() => import('./components/NotFound/NotFoundView'))
const FAQView      = lazy(() => import('./components/Legal/FAQView'))
const AboutView    = lazy(() => import('./components/Legal/AboutView'))
const ContactView  = lazy(() => import('./components/Legal/ContactView'))
const TermsView    = lazy(() => import('./components/Legal/TermsView'))
const PrivacyView  = lazy(() => import('./components/Legal/PrivacyView'))

// Redirige los enlaces antiguos /readonly/:id a la nueva ruta /view/:id
function RedirectToView() {
  const { id } = useParams()
  return <Navigate to={`/view/${id}`} replace />
}

function Layout() {
  useScrollToTop()

  // El degradado de la portada se pinta acá y no dentro de HomeView: colgado
  // del <main> quedaba encerrado en la columna central y, en desktop, se
  // cortaba con dos franjas negras a los costados —justo donde van los
  // banners—. Sobre la fila entera llega de borde a borde y además cubre el
  // padding inferior del <main>, que antes empujaba el glow lejos del footer.
  const isHome = useLocation().pathname === '/'

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Banner superior — solo mobile/tablet */}
      {/* <div className="xl:hidden w-full flex justify-center py-1 border-b border-gray-100/10">
        <AdBanner slot="mobile-top" />
      </div> */}

      <div className={`flex-1 flex justify-center ${isHome ? 'home-bg' : ''}`}>
        {/* Banner lateral izquierdo — solo desktop */}
        <aside className="hidden xl:flex flex-col items-center pt-4 w-40 shrink-0 px-2">
          <AdBanner slot="sidebar" />
        </aside>

        {/* Contenido principal. <main> es el landmark que los lectores de
            pantalla usan para saltar la navegación repetida. */}
        <main className="flex-1 w-full max-w-7xl min-w-0 pb-16 xl:pb-0">
          {/* El Loader reserva 70vh, así que la cabecera no salta cuando entra
              el chunk de la ruta. */}
          <Suspense fallback={<Loader />}>
            <Outlet />
          </Suspense>
        </main>

        {/* Banner lateral derecho — solo desktop */}
        <aside className="hidden xl:flex flex-col items-center pt-4 w-40 shrink-0 px-2">
          <AdBanner slot="sidebar" />
        </aside>
      </div>

      <Footer />

      {/* Flota sobre el contenido, así que no desplaza nada ni suma CLS. */}
      <InstallPrompt />

      {/* Banner inferior fijo — solo mobile/tablet */}
      {/* <div className="xl:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100/10 flex items-center justify-center h-14">
        <AdBanner slot="mobile-bottom" />
      </div> */}
    </div>
  )
}

function PrivateRoute({ children }) {
  const { isLoggedIn, loading } = useAuth()
  if (loading) return null
  return isLoggedIn ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Las rutas con título fijo lo declaran acá con <Titled>. Las que
            dependen de datos (perfil, categoría, torneo, club) lo fijan desde
            la vista con useDocumentTitle, cuando llega el nombre. */}
        <Route path="/"                                          element={<Titled><HomeView /></Titled>} />
        <Route path="/login"                                     element={<Titled title="Iniciar sesión"><AuthView mode="login" /></Titled>} />
        <Route path="/register"                                  element={<Titled title="Crear cuenta"><AuthView mode="register" /></Titled>} />
        <Route path="/reset-password/:token"                     element={<Titled title="Restablecer contraseña"><ResetPassword /></Titled>} />
        <Route path="/verify-email/:token"                       element={<Titled title="Verificar email"><VerifyEmail /></Titled>} />
        <Route path="/u/:username"                               element={<ProfileView />} />
        <Route path="/club/:id"                                  element={<ClubProfileView />} />
        <Route path="/view/:id"                                  element={<ReadonlyView />} />
        <Route path="/readonly/:id"                              element={<RedirectToView />} />
        <Route path="/cat/:groupId"                           element={<GroupView />} />
        <Route path="/cat/:groupId/torneo/new"            element={<PrivateRoute><Titled title="Nuevo torneo"><Setup /></Titled></PrivateRoute>} />
        <Route path="/cat/:groupId/torneo/:tournamentId"  element={<MainView />} />
        <Route path="/invitacion/:token"                         element={<Titled title="Invitación"><InviteAccept /></Titled>} />
        <Route path="/invitations"                               element={<Navigate to="/notifications" replace />} />
        <Route path="/notifications"                             element={<PrivateRoute><Titled title="Notificaciones"><NotificationsView /></Titled></PrivateRoute>} />
        <Route path="/tutorial"                                  element={<Titled title="Tutorial"><TutorialView /></Titled>} />
        <Route path="/faq"                                       element={<Titled title="Preguntas frecuentes"><FAQView /></Titled>} />
        <Route path="/sobre-nosotros"                            element={<Titled title="Sobre nosotros"><AboutView /></Titled>} />
        <Route path="/contacto"                                  element={<Titled title="Contacto"><ContactView /></Titled>} />
        <Route path="/terminos"                                  element={<Titled title="Términos y condiciones"><TermsView /></Titled>} />
        <Route path="/privacidad"                                element={<Titled title="Política de privacidad"><PrivacyView /></Titled>} />
        <Route path="/admin"                                     element={<AdminRoute><Titled title="Panel de administración"><AdminDashboard /></Titled></AdminRoute>} />
        <Route path="/admin/users"                               element={<AdminRoute><Titled title="Usuarios · Admin"><AdminUsers /></Titled></AdminRoute>} />
        <Route path="/admin/tournaments"                         element={<AdminRoute><Titled title="Torneos · Admin"><AdminTournaments /></Titled></AdminRoute>} />
        <Route path="/admin/notifications"                       element={<AdminRoute><Titled title="Notificaciones · Admin"><AdminNotifications /></Titled></AdminRoute>} />
        <Route path="/admin/clubs"                               element={<AdminRoute><Titled title="Clubes · Admin"><AdminClubs /></Titled></AdminRoute>} />
        <Route path="/admin/clubs/requests"                      element={<AdminRoute><Titled title="Solicitudes de clubes · Admin"><AdminClubRequests /></Titled></AdminRoute>} />
        <Route path="/subscription/success"                      element={<PrivateRoute><Titled title="Suscripción"><SubscriptionSuccess /></Titled></PrivateRoute>} />
        <Route path="/subscription/failure"                      element={<PrivateRoute><Titled title="Suscripción"><SubscriptionFailure /></Titled></PrivateRoute>} />
        <Route path="/subscription/pending"                      element={<PrivateRoute><Titled title="Suscripción"><SubscriptionPending /></Titled></PrivateRoute>} />
        <Route path="/subscription/manage"                       element={<PrivateRoute><Titled title="Suscripción"><SubscriptionManage /></Titled></PrivateRoute>} />
        <Route path="*"                                          element={<Titled title="Página no encontrada"><NotFoundView /></Titled>} />
      </Route>
    </Routes>
  )
}