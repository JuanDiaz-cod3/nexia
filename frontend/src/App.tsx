import { useState } from 'react'
import { LoginPage } from './pages/LoginPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { Button } from './components/Button'
import './App.css'

function App() {
  // Se inicializa leyendo localStorage: si ya habia un token guardado de
  // una sesion anterior, no te manda al login de nuevo al recargar.
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('access_token'),
  )

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
    <>
      <ProjectsPage token={token} />
      <div className="page">
        <Button variant="secondary" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </>
  )
}

export default App
