import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { ApiError } from '../api/client'
import * as authApi from '../api/auth'

// Mockeamos el modulo entero: LoginPage no deberia hablar con fetch/red de
// verdad en este test, solo con estas funciones. Ya probamos apiFetch en
// client.test.ts, asi que acá lo damos por sentado y probamos otra capa.
vi.mock('../api/auth')

const mockedLogin = vi.mocked(authApi.login)
const mockedChangePassword = vi.mocked(authApi.changePassword)

describe('LoginPage', () => {
  beforeEach(() => {
    mockedLogin.mockReset()
    mockedChangePassword.mockReset()
  })

  it('login exitoso sin cambio de clave pendiente llama a onAuthenticated', async () => {
    const user = userEvent.setup()
    mockedLogin.mockResolvedValueOnce({ must_change_password: false })
    const onAuthenticated = vi.fn()

    render(<LoginPage onAuthenticated={onAuthenticated} />)
    await user.type(screen.getByLabelText('Usuario'), 'juan')
    await user.type(screen.getByLabelText('Contraseña'), 'claveSegura123')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledOnce()
    })
    expect(mockedLogin).toHaveBeenCalledWith('juan', 'claveSegura123')
  })

  it('login con credenciales incorrectas muestra el error y no autentica', async () => {
    const user = userEvent.setup()
    mockedLogin.mockRejectedValueOnce(
      new ApiError('Usuario o contraseña incorrectos', 'invalid_credentials', 401),
    )
    const onAuthenticated = vi.fn()

    render(<LoginPage onAuthenticated={onAuthenticated} />)
    await user.type(screen.getByLabelText('Usuario'), 'juan')
    await user.type(screen.getByLabelText('Contraseña'), 'claveIncorrecta')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos')
    expect(onAuthenticated).not.toHaveBeenCalled()
  })

  it('login con clave temporal pasa al panel de nueva contraseña', async () => {
    const user = userEvent.setup()
    mockedLogin.mockResolvedValueOnce({ must_change_password: true })

    render(<LoginPage onAuthenticated={vi.fn()} />)
    await user.type(screen.getByLabelText('Usuario'), 'juan')
    await user.type(screen.getByLabelText('Contraseña'), 'claveTemporal')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    // El foco se mueve al h1 "Nueva contraseña" (ver el useEffect en
    // LoginPage) - confirmamos eso, no solo que el texto exista en el DOM,
    // porque las dos secciones (login/reset) estan siempre montadas.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nueva contraseña' })).toHaveFocus()
    })
    // El formulario de login queda deshabilitado mientras tanto.
    expect(screen.getByLabelText('Usuario')).toBeDisabled()
  })

  it('reset con contraseñas que no coinciden muestra error sin llamar a la API', async () => {
    const user = userEvent.setup()
    mockedLogin.mockResolvedValueOnce({ must_change_password: true })

    render(<LoginPage onAuthenticated={vi.fn()} />)
    await user.type(screen.getByLabelText('Usuario'), 'juan')
    await user.type(screen.getByLabelText('Contraseña'), 'claveTemporal')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nueva contraseña' })).toHaveFocus()
    })

    await user.type(screen.getByLabelText('Nueva contraseña'), 'claveNueva1')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'claveNueva2')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.')
    expect(mockedChangePassword).not.toHaveBeenCalled()
  })

  it('reset exitoso llama a onAuthenticated', async () => {
    const user = userEvent.setup()
    mockedLogin.mockResolvedValueOnce({ must_change_password: true })
    mockedChangePassword.mockResolvedValueOnce({ detail: 'Contraseña actualizada' })
    const onAuthenticated = vi.fn()

    render(<LoginPage onAuthenticated={onAuthenticated} />)
    await user.type(screen.getByLabelText('Usuario'), 'juan')
    await user.type(screen.getByLabelText('Contraseña'), 'claveTemporal')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nueva contraseña' })).toHaveFocus()
    })

    await user.type(screen.getByLabelText('Nueva contraseña'), 'claveNueva123')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'claveNueva123')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledOnce()
    })
    // La contraseña temporal (ya escrita en el paso de login) es la que se
    // reusa como current_password - no se le vuelve a pedir al usuario.
    expect(mockedChangePassword).toHaveBeenCalledWith('claveTemporal', 'claveNueva123')
  })
})
