import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectsPage } from './ProjectsPage'
import { ApiError } from '../api/client'
import * as projectsApi from '../api/projects'
import type { Project } from '../api/projects'

vi.mock('../api/projects')

const mockedList = vi.mocked(projectsApi.listProjects)
const mockedUpdate = vi.mocked(projectsApi.updateProject)
const mockedDelete = vi.mocked(projectsApi.deleteProject)

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    title: 'Energía solar en el colegio',
    category: 'Ciencias',
    summary: 'Un resumen del proyecto.',
    status: 'submitted',
    created_at: '2026-01-01T00:00:00Z',
    members: [{ id: 10, full_name: 'Ana Estudiante', username: 'ana' }],
    advisor: null,
    ...overrides,
  }
}

describe('ProjectsPage', () => {
  beforeEach(() => {
    mockedList.mockReset()
    mockedUpdate.mockReset()
    mockedDelete.mockReset()
  })

  it('muestra los proyectos después de cargar', async () => {
    mockedList.mockResolvedValueOnce([makeProject()])

    render(<ProjectsPage token={null} isAdmin={false} />)

    expect(screen.getByText('Cargando proyectos…')).toBeInTheDocument()
    expect(await screen.findByText('Energía solar en el colegio')).toBeInTheDocument()
    expect(screen.getByText('Ana Estudiante')).toBeInTheDocument()
  })

  it('muestra el mensaje de error si listProjects falla', async () => {
    mockedList.mockRejectedValueOnce(new ApiError('No se pudo conectar con el servidor.', 'unknown_error', 500))

    render(<ProjectsPage token={null} isAdmin={false} />)

    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
  })

  it('muestra el mensaje de lista vacía cuando no hay proyectos', async () => {
    mockedList.mockResolvedValueOnce([])

    render(<ProjectsPage token={null} isAdmin={false} />)

    expect(await screen.findByText('Aún no hay proyectos registrados.')).toBeInTheDocument()
  })

  it('un usuario no-admin no ve controles de editar/borrar', async () => {
    mockedList.mockResolvedValueOnce([makeProject()])

    render(<ProjectsPage token="token-estudiante" isAdmin={false} />)

    await screen.findByText('Energía solar en el colegio')
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument()
  })

  it('un admin puede editar un proyecto (prellenado y guardado)', async () => {
    const user = userEvent.setup()
    mockedList.mockResolvedValueOnce([makeProject()])
    mockedUpdate.mockResolvedValueOnce(makeProject({ title: 'Título editado' }))

    render(<ProjectsPage token="token-admin" isAdmin />)
    await screen.findByText('Energía solar en el colegio')

    await user.click(screen.getByRole('button', { name: 'Editar' }))

    const titleInput = screen.getByLabelText('Título')
    expect(titleInput).toHaveValue('Energía solar en el colegio')

    await user.clear(titleInput)
    await user.type(titleInput, 'Título editado')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(screen.getByText('Título editado')).toBeInTheDocument()
    })
    expect(mockedUpdate).toHaveBeenCalledWith(
      'token-admin',
      1,
      expect.objectContaining({ title: 'Título editado' }),
    )
  })

  it('un admin borra un proyecto tras confirmar', async () => {
    const user = userEvent.setup()
    mockedList.mockResolvedValueOnce([makeProject()])
    mockedDelete.mockResolvedValueOnce(undefined)

    render(<ProjectsPage token="token-admin" isAdmin />)
    await screen.findByText('Energía solar en el colegio')

    await user.click(screen.getByRole('button', { name: 'Borrar' }))
    // El primer click solo pide confirmación - todavía no debería borrar.
    expect(mockedDelete).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith('token-admin', 1)
    })
    expect(screen.queryByText('Energía solar en el colegio')).not.toBeInTheDocument()
  })
})
