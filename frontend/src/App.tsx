import { useEffect, useState } from 'react'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { MyProjectPage } from './pages/MyProjectPage'
import { HomePage } from './pages/HomePage'
import { AppShell, type AppPage } from './components/AppShell'
import { onSessionExpired } from './api/client'

const PAGE_TITLES: Record<AppPage, string> = {
  home: 'Inicio',
  projects: 'Proyectos',
  'my-project': 'Mi Proyecto',
}

// Unica pagina que de verdad exige sesion iniciada - Inicio y Proyectos son
// el archivo publico (ver CLAUDE.md, "Reglas de negocio criticas").
const PROTECTED_PAGE: AppPage = 'my-project'

function App() {
  // Se inicializa leyendo localStorage: si ya habia un token guardado de
  // una sesion anterior, no te manda al login de nuevo al recargar.
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('access_token'),
  )

  // "entered" separa la landing (publica, sin chrome de app) del resto.
  // Persiste en localStorage igual que el token: sin esto, refrescar la
  // pagina te mandaba de vuelta a la landing SIEMPRE, incluso con sesion
  // iniciada (el token si sobrevivia al refresh, pero "ya pase la landing"
  // no) - una vez que se cruza, no vuelve a aparecer en este navegador.
  const [entered, setEntered] = useState(() => localStorage.getItem('entered') === 'true')

  function handleEnter() {
    localStorage.setItem('entered', 'true')
    setEntered(true)
  }

  // Estado simple en vez de una libreria de routing: pocas pantallas, sin
  // URLs propias ni deep-linking todavia. Si eso cambia, ahi si vale la
  // pena introducir react-router.
  const [page, setPage] = useState<AppPage>('home')

  // Cuando alguien sin token toca "Mi Proyecto", en vez de mostrar esa
  // pantalla mostramos LoginPage completo (no un formulario incrustado en
  // el AppShell). Este estado recuerda a donde volver despues de loguearse.
  const [loginTarget, setLoginTarget] = useState<AppPage | null>(null)

  // LoginPage solo llama esto cuando el usuario ya puede entrar de verdad
  // (login directo, o despues de completar el cambio de clave obligatorio).
  function handleAuthenticated(newToken: string, newRefreshToken: string) {
    localStorage.setItem('access_token', newToken)
    localStorage.setItem('refresh_token', newRefreshToken)
    setToken(newToken)
    setPage(loginTarget ?? PROTECTED_PAGE)
    setLoginTarget(null)
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setToken(null)
    // "Mi Proyecto" ya no es visitable sin token - vuelve al archivo publico
    // en vez de dejar al usuario mirando una pantalla que ya no le pertenece.
    setPage('home')
  }

  function handleNavigate(target: AppPage) {
    if (target === PROTECTED_PAGE && !token) {
      setLoginTarget(target)
      return
    }
    setPage(target)
  }

  // apiFetch no tiene forma de tocar el estado de React directamente: si el
  // refresh token tambien esta vencido/invalido, avisa por este callback en
  // vez de por un valor de retorno, porque el fallo puede pasar en
  // cualquier llamada a la API, no solo en una accion puntual del usuario.
  useEffect(() => {
    onSessionExpired(handleLogout)
  }, [])

  if (!entered) {
    return <LandingPage onEnter={handleEnter} />
  }

  if (loginTarget) {
    return <LoginPage onAuthenticated={handleAuthenticated} />
  }

  return (
    <AppShell
      title={PAGE_TITLES[page]}
      activePage={page}
      isAuthenticated={token !== null}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      {page === 'home' && (
        <HomePage token={token} onExploreProjects={() => handleNavigate('projects')} />
      )}
      {page === 'projects' && <ProjectsPage token={token} />}
      {page === 'my-project' && token && <MyProjectPage token={token} />}
    </AppShell>
  )
}

export default App
