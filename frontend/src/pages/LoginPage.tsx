import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { login, changePassword } from '../api/auth'
import { ApiError } from '../api/client'
import innovalabIconDark from '../assets/innovalab_icon_dark.svg'
import innovalabLogoHorizontal from '../assets/innovalab_logo_horizontal.svg'
import './AuthLayout.css'

type Step = 'login' | 'reset'

interface LoginPageProps {
  onAuthenticated: () => void
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [step, setStep] = useState<Step>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
      // login() ya dejo la cookie de sesion puesta (Set-Cookie httpOnly) -
      // no hay ningun token que guardar aca, solo decidir a donde ir.
      const result = await login(username, password)
      if (result.must_change_password) {
        setStep('reset')
      } else {
        onAuthenticated()
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
    setLoading(true)
    try {
      // Reusamos "password" (la clave temporal ya escrita en el paso de
      // login) como current_password - el backend la sigue exigiendo por
      // seguridad, pero no hace falta pedirsela de nuevo: ya la tenemos
      // en memoria de este mismo flujo. La cookie de sesion de login ya
      // esta puesta, asi que changePassword se autentica solo con ella.
      await changePassword(password, newPassword)
      onAuthenticated()
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
          <img src={innovalabLogoHorizontal} alt="InnovaLab" className="auth-brand-logo" />
          <h1>Iniciar sesión</h1>
          <p className="auth-form-sub">Ingresa con el usuario y contraseña que te dio el colegio.</p>
          <Input
            type="text"
            label="Usuario"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={step === 'reset'}
            autoComplete="username"
          />
          <Input
            type="password"
            label="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={step === 'reset'}
            autoComplete="current-password"
          />
          {error && step === 'login' && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading || step === 'reset'}>
            Iniciar sesión
          </Button>
        </form>

        {/* Sin boton de "volver a login" a proposito - mientras
            must_change_password sea true, no debe existir forma de
            esquivar este formulario desde la interfaz. */}
        <form className="auth-form-panel auth-form-panel--reset" onSubmit={handleReset}>
          <img src={innovalabLogoHorizontal} alt="InnovaLab" className="auth-brand-logo" />
          <h1 ref={resetHeadingRef} tabIndex={-1}>
            Nueva contraseña
          </h1>
          <Input
            type="password"
            label="Nueva contraseña"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
          />
          <Input
            type="password"
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
          {error && step === 'reset' && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            Guardar contraseña
          </Button>
        </form>

        <div className="auth-side-panel">
          <img src={innovalabIconDark} alt="" className="auth-side-icon" />
          {step === 'login' ? (
            <>
              <h2>Bienvenido a InnovaLab</h2>
              <p>
                Consulta y gestiona los proyectos de investigación del Instituto La Salle -
                Bilingual School Barranquilla.
              </p>
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
      {/* Decorativo (ficha de catalogo de archivo) - aria-hidden porque no
          aporta nada al flujo de login para lectores de pantalla. */}
      <span className="auth-archive-code" aria-hidden="true">
        ETHERNALS · GRADO 11 · 2026
      </span>
    </div>
  )
}
