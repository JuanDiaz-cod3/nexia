import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { login } from '../api/auth'
import { ApiError } from '../api/client'
import './LoginPage.css'

interface LoginPageProps {
  onLoginSuccess: (token: string, mustChangePassword: boolean) => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await login(username, password)
      onLoginSuccess(result.access_token, result.must_change_password)
    } catch (err) {
      // ApiError viene del backend (credenciales invalidas, etc.).
      // Cualquier otra cosa (backend caido, sin red) cae en el mensaje generico.
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <Card className="login-card">
        <h1>Nexia</h1>
        <form onSubmit={handleSubmit}>
          <Input
            label="Usuario"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <p className="login-error">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
