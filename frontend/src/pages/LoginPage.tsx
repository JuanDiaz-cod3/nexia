import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { login, changePassword } from '../api/auth'
import { ApiError } from '../api/client'
import './AuthLayout.css'

type Step = 'login' | 'reset'

interface LoginPageProps {
  onAuthenticated: (token: string) => void
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [step, setStep] = useState<Step>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const resetHeadingRef = useRef<HTMLHeadingElement>(null)

  // El cambio de panel es puro CSS (transform/opacity), invisible para
  // lectores de pantalla si no movemos el foco a mano - sin esto, el
  // usuario de teclado/lector queda con el foco en un boton ya deshabilitado.
  useEffect(() => {
    if (step === 'reset') {
      resetHeadingRef.current?.focus()
    }
  }, [step])

  // El toggle NUNCA lo dispara un click - solo la respuesta real del
  // backend. Asi el paso a "reset" siempre refleja el estado verdadero de
  // must_change_password, no una suposicion del frontend.
  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await login(username, password)
      setToken(result.access_token)
      if (result.must_change_password) {
        setStep('reset')
      } else {
        onAuthenticated(result.access_token)
      }
    } catch (err) {
      // ApiError trae el mensaje real del backend (usuario/clave invalidos,
      // etc.) - cualquier otra cosa (backend caido, sin red) cae en el
      // mensaje generico, porque ahi si no hay nada mas especifico que decir.
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!token) return

    setLoading(true)
    try {
      // Reusamos "password" (la clave temporal ya escrita en el paso de
      // login) como current_password - el backend la sigue exigiendo por
      // seguridad, pero no hace falta pedirsela de nuevo: ya la tenemos
      // en memoria de este mismo flujo.
      await changePassword(token, password, newPassword)
      onAuthenticated(token)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`auth-page ${step === 'reset' ? 'step-reset' : ''}`}>
      {/* Anuncia el cambio de paso a lectores de pantalla - el swap de
          paneles es puro CSS y por si solo no dispara nada de esto. */}
      <p className="sr-only" role="status" aria-live="polite">
        {step === 'reset'
          ? 'Por seguridad, debes reemplazar tu contraseña temporal antes de continuar.'
          : ''}
      </p>
      <div className="auth-container">
        <form className="auth-form-panel auth-form-panel--login" onSubmit={handleLogin}>
          <h1>Iniciar sesión</h1>
          <Input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={step === 'reset'}
            autoComplete="username"
          />
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={step === 'reset'}
            autoComplete="current-password"
          />
          {error && step === 'login' && <p className="auth-error">{error}</p>}
          <Button type="submit" disabled={loading || step === 'reset'}>
            Iniciar sesión
          </Button>
        </form>

        {/* Sin boton de "volver a login" a proposito - mientras
            must_change_password sea true, no debe existir forma de
            esquivar este formulario desde la interfaz. */}
        <form className="auth-form-panel auth-form-panel--reset" onSubmit={handleReset}>
          <h1 ref={resetHeadingRef} tabIndex={-1}>
            Nueva contraseña
          </h1>
          <Input
            type="password"
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
          />
          <Input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
          {error && step === 'reset' && <p className="auth-error">{error}</p>}
          <Button type="submit" disabled={loading}>
            Guardar contraseña
          </Button>
        </form>

        <div className="auth-side-panel">
          {step === 'login' ? (
            <>
              <h2>Bienvenido a Nexia</h2>
              <p>Consulta y gestiona los proyectos de investigación de tu colegio.</p>
            </>
          ) : (
            <>
              <h2>Actualiza tu contraseña</h2>
              <p>
                Por seguridad, debes reemplazar tu contraseña temporal antes de
                continuar.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
