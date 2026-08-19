import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'
import { ApiError } from '../api/client'
import * as projectsApi from '../api/projects'
import type { Project } from '../api/projects'

vi.mock('../api/projects')

const mockedList = vi.mocked(projectsApi.listProjects)

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    title: 'Energía solar en el colegio',
    category: 'Ciencias',
    summary: null,
    status: 'submitted',
    created_at: '2026-01-01T00:00:00Z',
    members: [{ id: 1, full_name: 'Ana Estudiante', username: 'ana' }],
    advisor: null,
    ...overrides,
  }
}

describe('HomePage', () => {
  beforeEach(() => {
    mockedList.mockReset()
  })

  it('llama a listProjects con el token y muestra las estadísticas al cargar', async () => {
    mockedList.mockResolvedValueOnce([
      makeProject({ id: 1, title: 'Proyecto A', status: 'published' }),
      makeProject({ id: 2, title: 'Proyecto B', status: 'submitted' }),
    ])

    render(<HomePage token="token-1" onExploreProjects={vi.fn()} />)

    expect(await screen.findByText('Proyecto A')).toBeInTheDocument()
    expect(mockedList).toHaveBeenCalledWith('token-1')
    expect(screen.getByText('2')).toBeInTheDocument() // proyectos registrados
    expect(screen.getByText('1')).toBeInTheDocument() // proyectos publicados
  })

  it('muestra el sello solo en proyectos publicados', async () => {
    mockedList.mockResolvedValueOnce([
      makeProject({ id: 1, title: 'Publicado', status: 'published' }),
      makeProject({ id: 2, title: 'Sin publicar', status: 'draft' }),
    ])

    render(<HomePage token={null} onExploreProjects={vi.fn()} />)

    await screen.findByText('Publicado')
    expect(screen.getAllByRole('img', { name: 'Proyecto publicado' })).toHaveLength(1)
  })

  it('muestra el mensaje de vacío cuando no hay proyectos', async () => {
    mockedList.mockResolvedValueOnce([])

    render(<HomePage token={null} onExploreProjects={vi.fn()} />)

    expect(await screen.findByText(/Todavía no hay proyectos registrados/)).toBeInTheDocument()
  })

  it('muestra el error si listProjects falla', async () => {
    mockedList.mockRejectedValueOnce(new ApiError('No se pudo conectar con el servidor.', 'unknown_error', 500))

    render(<HomePage token={null} onExploreProjects={vi.fn()} />)

    expect(await screen.findByText('No se pudo conectar con el servidor.')).toBeInTheDocument()
  })

  it('el botón "Explorar proyectos" llama a onExploreProjects', async () => {
    const user = userEvent.setup()
    mockedList.mockResolvedValueOnce([])
    const onExploreProjects = vi.fn()

    render(<HomePage token={null} onExploreProjects={onExploreProjects} />)
    await user.click(screen.getByRole('button', { name: 'Explorar proyectos →' }))

    expect(onExploreProjects).toHaveBeenCalledOnce()
  })
})
