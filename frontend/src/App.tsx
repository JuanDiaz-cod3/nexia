import { useEffect, useState } from 'react'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { MyProjectPage } from './pages/MyProjectPage'
import { HomePage } from './pages/HomePage'
import { AdminStudentsPage } from './pages/AdminStudentsPage'
import { AppShell, type AppPage } from './components/AppShell'
import { Spinner } from './components/Spinner'
import { onSessionExpired } from './api/client'
import { logout as logoutRequest } from './api/auth'
import { getCurrentUser, type CurrentUser } from './api/users'

const PAGE_TITLES: Record<AppPage, string> = {
  home: 'Inicio',
  projects: 'Proyectos',
  'my-project': 'Mi Proyecto',
  'admin-students': 'Estudiantes',
}

// Paginas que exigen sesion iniciada - Inicio y Proyectos son el archivo
// publico (ver CLAUDE.md, "Reglas de negocio criticas"). "admin-students"
// ademas exige el rol admin (ver mas abajo), no solo estar logueado.
const PROTECTED_PAGES: AppPage[] = ['my-project', 'admin-students']
const DEFAULT_PROTECTED_PAGE: AppPage = 'my-project'

function App() {
  // "entered" separa la landing (publica, sin chrome de app) del resto.
  // Persiste en localStorage: sin esto, refrescar la pagina te mandaba de
  // vuelta a la landing SIEMPRE, incluso con sesion iniciada - una vez que
  // se cruza, no vuelve a aparecer en este navegador.
  const [entered, setEntered] = useState(() => localStorage.getItem('entered') === 'true')

  // El token ya no es legible desde JS (cookie httpOnly) - la unica forma
  // de saber si hay sesion iniciada es preguntarle al backend. isAuthChecked
  // separa "todavia no sabemos" de "sabemos que no hay sesion", para no
  // mostrar login/nav de invitado por un instante en cada carga de pagina
  // mientras la cookie (si existe) todavia se esta validando.
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const isAuthenticated = currentUser !== null
  const isAdmin = currentUser?.roles.includes('admin') ?? false

  function checkSession() {
    return getCurrentUser()
      .then((user) => {
        setCurrentUser(user)
        return user
      })
      .catch(() => {
        setCurrentUser(null)
        return null
      })
  }

  useEffect(() => {
    checkSession().finally(() => setIsAuthChecked(true))
  }, [])

  function handleEnter() {
    localStorage.setItem('entered', 'true')
    setEntered(true)
  }

  // Estado simple en vez de una libreria de routing: pocas pantallas, sin
  // URLs propias ni deep-linking todavia. Si eso cambia, ahi si vale la
  // pena introducir react-router.
  const [page, setPage] = useState<AppPage>('home')

  // Cuando alguien sin sesion toca "Mi Proyecto", en vez de mostrar esa
  // pantalla mostramos LoginPage completo (no un formulario incrustado en
  // el AppShell). Este estado recuerda a donde volver despues de loguearse.
  const [loginTarget, setLoginTarget] = useState<AppPage | null>(null)

  // LoginPage solo llama esto cuando el usuario ya puede entrar de verdad
  // (login directo, o despues de completar el cambio de clave obligatorio).
  // La cookie de sesion ya quedo puesta por el backend - lo unico que falta
  // es traer el usuario para saber quien es (isAdmin, nombre en la sidebar).
  async function handleAuthenticated() {
    await checkSession()
    setPage(loginTarget ?? DEFAULT_PROTECTED_PAGE)
    setLoginTarget(null)
  }

  function handleLogout() {
    // Best-effort: aunque el pedido falle (red caida, etc.), igual limpiamos
    // el estado local - la cookie expira sola en unos minutos si el borrado
    // en el servidor no llego a completarse.
    logoutRequest().catch(() => {})
    setCurrentUser(null)
    // "Mi Proyecto" ya no es visitable sin sesion - vuelve al archivo
    // publico en vez de dejar al usuario mirando una pantalla que ya no le
    // pertenece.
    setPage('home')
  }

  function handleNavigate(target: AppPage) {
    if (PROTECTED_PAGES.includes(target) && !isAuthenticated) {
      setLoginTarget(target)
      return
    }
    // El item de nav ni se muestra sin isAdmin (ver AppShell), esto es
    // solo una segunda barrera por si acaso.
    if (target === 'admin-students' && !isAdmin) {
      return
    }
    setPage(target)
  }

  // apiFetch no tiene forma de tocar el estado de React directamente: si el
  // refresh token tambien esta vencido/invalido, avisa por este callback en
  // vez de por un valor de retorno, porque el fallo puede pasar en
  // cualquier llamada a la API, no solo en una accion puntual del usuario.
  useEffect(() => {
    onSessionExpired(() => setCurrentUser(null))
  }, [])

  if (!entered) {
    return <LandingPage onEnter={handleEnter} />
  }

  if (!isAuthChecked) {
    return <Spinner label="Cargando sesión…" />
  }

  if (loginTarget) {
    return <LoginPage onAuthenticated={handleAuthenticated} />
  }

  return (
    <AppShell
      title={PAGE_TITLES[page]}
      activePage={page}
      isAuthenticated={isAuthenticated}
      isAdmin={isAdmin}
      currentUser={currentUser}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      {page === 'home' && <HomePage onExploreProjects={() => handleNavigate('projects')} />}
      {page === 'projects' && <ProjectsPage isAdmin={isAdmin} />}
      {page === 'my-project' && isAuthenticated && <MyProjectPage />}
      {page === 'admin-students' && isAuthenticated && isAdmin && <AdminStudentsPage />}
    </AppShell>
  )
}

export default App
