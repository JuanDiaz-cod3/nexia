import { useState } from 'react'
import { LoginPage } from './pages/LoginPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { HomePage } from './pages/HomePage'
import { AppShell, type AppPage } from './components/AppShell'

const PAGE_TITLES: Record<AppPage, string> = {
  home: 'Inicio',
  projects: 'Proyectos',
}

function App() {
  // Se inicializa leyendo localStorage: si ya habia un token guardado de
  // una sesion anterior, no te manda al login de nuevo al recargar.
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('access_token'),
  )

  // Estado simple en vez de una libreria de routing: con dos pantallas
  // no hace falta react-router todavia (URLs propias, deep-linking). Si
  // se agregan mas pantallas o hace falta compartir un link directo, ahi
  // si vale la pena introducirlo.
  const [page, setPage] = useState<AppPage>('home')

  // LoginPage solo llama esto cuando el usuario ya puede entrar de verdad
  // (login directo, o despues de completar el cambio de clave obligatorio).
  function handleAuthenticated(newToken: string) {
    localStorage.setItem('access_token', newToken)
    setToken(newToken)
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    setToken(null)
  }

  if (!token) {
    return <LoginPage onAuthenticated={handleAuthenticated} />
  }

  return (
    <AppShell
      title={PAGE_TITLES[page]}
      activePage={page}
      onNavigate={setPage}
      onLogout={handleLogout}
    >
      {page === 'home' ? (
        <HomePage token={token} onExploreProjects={() => setPage('projects')} />
      ) : (
        <ProjectsPage token={token} />
      )}
    </AppShell>
  )
}

export default App
