import { useState } from 'react'
import { LoginPage } from './pages/LoginPage'
import { Button } from './components/Button'
import './App.css'

function App() {
  // Se inicializa leyendo localStorage: si ya habia un token guardado de
  // una sesion anterior, no te manda al login de nuevo al recargar.
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('access_token'),
  )
  const [mustChangePassword, setMustChangePassword] = useState(false)

  function handleLoginSuccess(newToken: string, mustChange: boolean) {
    localStorage.setItem('access_token', newToken)
    setToken(newToken)
    setMustChangePassword(mustChange)
  }

  function handleLogout() {
    localStorage.removeItem('access_token')
    setToken(null)
  }

  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <main className="page">
      <h1>Nexia</h1>
      {mustChangePassword ? (
        <p>
          Tu cuenta tiene una contraseña temporal. (Pantalla de cambio de
          clave: siguiente paso.)
        </p>
      ) : (
        <p>Sesión iniciada correctamente. (Lista de proyectos: siguiente paso.)</p>
      )}
      <Button variant="secondary" onClick={handleLogout}>
        Cerrar sesión
      </Button>
    </main>
  )
}

export default App
