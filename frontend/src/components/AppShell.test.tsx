import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import type { CurrentUser } from '../api/users'

function makeUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    full_name: 'Juan Estudiante',
    username: 'juan',
    email: 'juan@lasalle.edu.co',
    account_type: 'institutional',
    must_change_password: false,
    roles: ['student'],
    section_name: null,
    group_label: null,
    ...overrides,
  }
}

describe('AppShell', () => {
  it('navega al hacer click en un item del menú', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(
      <AppShell
        title="Proyectos"
        activePage="home"
        isAuthenticated={false}
        isAdmin={false}
        currentUser={null}
        onNavigate={onNavigate}
        onLogout={vi.fn()}
      >
        <p>contenido</p>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Proyectos' }))
    expect(onNavigate).toHaveBeenCalledWith('projects')
  })

  it('no muestra "Estudiantes" para un usuario que no es admin', () => {
    render(
      <AppShell
        title="Inicio"
        activePage="home"
        isAuthenticated
        isAdmin={false}
        currentUser={makeUser()}
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
      >
        <p>contenido</p>
      </AppShell>,
    )

    expect(screen.queryByRole('button', { name: 'Estudiantes' })).not.toBeInTheDocument()
  })

  it('muestra "Estudiantes" y navega para un usuario admin', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(
      <AppShell
        title="Inicio"
        activePage="home"
        isAuthenticated
        isAdmin
        currentUser={makeUser({ roles: ['admin'] })}
        onNavigate={onNavigate}
        onLogout={vi.fn()}
      >
        <p>contenido</p>
      </AppShell>,
    )

    const item = screen.getByRole('button', { name: 'Estudiantes' })
    await user.click(item)
    expect(onNavigate).toHaveBeenCalledWith('admin-students')
  })

  it('no muestra el pie de sesión (usuario/cerrar sesión) cuando no hay sesión iniciada', () => {
    render(
      <AppShell
        title="Inicio"
        activePage="home"
        isAuthenticated={false}
        isAdmin={false}
        currentUser={null}
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
      >
        <p>contenido</p>
      </AppShell>,
    )

    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
  })

  it('muestra usuario, sección y grupo, y llama a onLogout', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn()

    render(
      <AppShell
        title="Mi Proyecto"
        activePage="my-project"
        isAuthenticated
        isAdmin={false}
        currentUser={makeUser({ section_name: '11°A', group_label: 'Grupo 2' })}
        onNavigate={vi.fn()}
        onLogout={onLogout}
      >
        <p>contenido</p>
      </AppShell>,
    )

    expect(screen.getByText('juan')).toBeInTheDocument()
    expect(screen.getByText('11°A · Grupo 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(onLogout).toHaveBeenCalledOnce()
  })

  it('el botón de hamburguesa abre el drawer, y "Cerrar menú" lo cierra', async () => {
    const user = userEvent.setup()

    render(
      <AppShell
        title="Inicio"
        activePage="home"
        isAuthenticated={false}
        isAdmin={false}
        currentUser={null}
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
      >
        <p>contenido</p>
      </AppShell>,
    )

    const toggle = screen.getByRole('button', { name: 'Abrir navegación' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Cerrar navegación' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Cerrar menú' }))
    expect(screen.getByRole('button', { name: 'Abrir navegación' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('clickear un item de navegación también cierra el drawer', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()

    render(
      <AppShell
        title="Inicio"
        activePage="home"
        isAuthenticated={false}
        isAdmin={false}
        currentUser={null}
        onNavigate={onNavigate}
        onLogout={vi.fn()}
      >
        <p>contenido</p>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Abrir navegación' }))
    await user.click(screen.getByRole('button', { name: 'Proyectos' }))

    expect(onNavigate).toHaveBeenCalledWith('projects')
    expect(screen.getByRole('button', { name: 'Abrir navegación' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('Escape cierra el drawer', async () => {
    const user = userEvent.setup()

    render(
      <AppShell
        title="Inicio"
        activePage="home"
        isAuthenticated={false}
        isAdmin={false}
        currentUser={null}
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
      >
        <p>contenido</p>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Abrir navegación' }))
    await user.keyboard('{Escape}')

    expect(screen.getByRole('button', { name: 'Abrir navegación' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('clickear el backdrop cierra el drawer', async () => {
    const user = userEvent.setup()

    const { container } = render(
      <AppShell
        title="Inicio"
        activePage="home"
        isAuthenticated={false}
        isAdmin={false}
        currentUser={null}
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
      >
        <p>contenido</p>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Abrir navegación' }))

    // El backdrop es aria-hidden (decorativo, solo junta clicks "afuera"
    // del drawer) - no tiene rol accesible que consultar por nombre.
    const backdrop = container.querySelector('.app-sidebar-backdrop')!
    await user.click(backdrop)

    expect(screen.getByRole('button', { name: 'Abrir navegación' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
