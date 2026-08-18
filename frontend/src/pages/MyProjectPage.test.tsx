import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MyProjectPage } from './MyProjectPage'
import * as projectsApi from '../api/projects'
import * as usersApi from '../api/users'
import type { Project } from '../api/projects'
import type { CurrentUser } from '../api/users'

vi.mock('../api/projects')
vi.mock('../api/users')

const mockedList = vi.mocked(projectsApi.listProjects)
const mockedCreate = vi.mocked(projectsApi.createProject)
const mockedUpdate = vi.mocked(projectsApi.updateProject)
const mockedDelete = vi.mocked(projectsApi.deleteProject)
const mockedGetCurrentUser = vi.mocked(usersApi.getCurrentUser)

const ME: CurrentUser = {
  id: 10,
  full_name: 'Ana Estudiante',
  username: 'ana',
  email: 'ana@lasalle.edu.co',
  account_type: 'institutional',
  must_change_password: false,
  roles: ['student'],
  section_name: '11°A',
  group_label: 'Grupo 1',
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    title: 'Energía solar en el colegio',
    category: 'Ciencias',
    summary: 'Un resumen del proyecto.',
    status: 'submitted',
    created_at: '2026-01-01T00:00:00Z',
    members: [{ id: ME.id, full_name: ME.full_name, username: ME.username }],
    advisor: null,
    ...overrides,
  }
}

describe('MyProjectPage', () => {
  beforeEach(() => {
    mockedList.mockReset()
    mockedCreate.mockReset()
    mockedUpdate.mockReset()
    mockedDelete.mockReset()
    mockedGetCurrentUser.mockReset()
  })

  it('sin proyecto propio, muestra el formulario de creación y crea el proyecto', async () => {
    const user = userEvent.setup()
    mockedList.mockResolvedValueOnce([])
    mockedGetCurrentUser.mockResolvedValueOnce(ME)
    mockedCreate.mockResolvedValueOnce(makeProject())

    render(<MyProjectPage token="token-ana" />)

    expect(await screen.findByText(/Todavía no perteneces a un proyecto/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Título'), 'Energía solar en el colegio')
    await user.click(screen.getByRole('button', { name: 'Crear proyecto' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Energía solar en el colegio' })).toBeInTheDocument()
    })
    expect(mockedCreate).toHaveBeenCalledWith(
      'token-ana',
      expect.objectContaining({ title: 'Energía solar en el colegio' }),
    )
  })

  it('con proyecto propio, muestra el detalle con integrantes y asesor', async () => {
    mockedList.mockResolvedValueOnce([makeProject()])
    mockedGetCurrentUser.mockResolvedValueOnce(ME)

    render(<MyProjectPage token="token-ana" />)

    expect(await screen.findByRole('heading', { name: 'Energía solar en el colegio' })).toBeInTheDocument()
    expect(screen.getByText('Ana Estudiante')).toBeInTheDocument()
    expect(screen.getByText('Sin asesor asignado todavía.')).toBeInTheDocument()
  })

  it('un proyecto ajeno (donde no soy integrante) no cuenta como "mi proyecto"', async () => {
    mockedList.mockResolvedValueOnce([
      makeProject({ id: 2, title: 'Proyecto de otro grupo', members: [{ id: 999, full_name: 'Otro', username: 'otro' }] }),
    ])
    mockedGetCurrentUser.mockResolvedValueOnce(ME)

    render(<MyProjectPage token="token-ana" />)

    expect(await screen.findByText(/Todavía no perteneces a un proyecto/)).toBeInTheDocument()
  })

  it('permite editar el proyecto propio', async () => {
    const user = userEvent.setup()
    mockedList.mockResolvedValueOnce([makeProject()])
    mockedGetCurrentUser.mockResolvedValueOnce(ME)
    mockedUpdate.mockResolvedValueOnce(makeProject({ title: 'Título editado' }))

    render(<MyProjectPage token="token-ana" />)
    await screen.findByRole('heading', { name: 'Energía solar en el colegio' })

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const titleInput = screen.getByLabelText('Título')
    expect(titleInput).toHaveValue('Energía solar en el colegio')

    await user.clear(titleInput)
    await user.type(titleInput, 'Título editado')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Título editado' })).toBeInTheDocument()
    })
    expect(mockedUpdate).toHaveBeenCalledWith(
      'token-ana',
      1,
      expect.objectContaining({ title: 'Título editado' }),
    )
  })

  it('borra el proyecto propio tras confirmar', async () => {
    const user = userEvent.setup()
    mockedList.mockResolvedValueOnce([makeProject()])
    mockedGetCurrentUser.mockResolvedValueOnce(ME)
    mockedDelete.mockResolvedValueOnce(undefined)

    render(<MyProjectPage token="token-ana" />)
    await screen.findByRole('heading', { name: 'Energía solar en el colegio' })

    await user.click(screen.getByRole('button', { name: 'Borrar' }))
    expect(mockedDelete).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith('token-ana', 1)
    })
    expect(await screen.findByText(/Todavía no perteneces a un proyecto/)).toBeInTheDocument()
  })
})
