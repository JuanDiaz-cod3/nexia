import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminStudentsPage } from './AdminStudentsPage'
import { ApiError } from '../api/client'
import * as adminApi from '../api/admin'

vi.mock('../api/admin')

const mockedCreateGroup = vi.mocked(adminApi.createStudentGroup)
const mockedListSections = vi.mocked(adminApi.listSections)
const mockedListGroups = vi.mocked(adminApi.listStudentGroups)
const mockedAddMembers = vi.mocked(adminApi.addGroupMembers)

const mockedSearchStudents = vi.mocked(adminApi.searchStudents)

describe('AdminStudentsPage — modo "grupo nuevo"', () => {
  beforeEach(() => {
    mockedCreateGroup.mockReset()
    mockedListSections.mockReset()
    mockedListGroups.mockReset()
    mockedAddMembers.mockReset()
    mockedSearchStudents.mockReset()
  })

  it('arranca con una fila de estudiante, y cambiar la cantidad agrega filas', async () => {
    const user = userEvent.setup()
    render(<AdminStudentsPage token="token-admin" />)

    expect(screen.getAllByText(/^Estudiante \d$/)).toHaveLength(1)

    const sizeInput = screen.getByLabelText('Cantidad de estudiantes en el grupo')
    await user.clear(sizeInput)
    await user.type(sizeInput, '3')

    expect(screen.getAllByText(/^Estudiante \d$/)).toHaveLength(3)
  })

  it('crea el grupo y muestra la tabla de credenciales', async () => {
    const user = userEvent.setup()
    mockedCreateGroup.mockResolvedValueOnce({
      group_id: 1,
      section_id: 1,
      section_name: '11°A',
      students: [
        { id: 1, full_name: 'Ana Estudiante', username: 'ana', email: 'ana@lasalle.edu.co', temporary_password: 'tmp-123' },
      ],
    })

    render(<AdminStudentsPage token="token-admin" />)

    await user.type(screen.getByLabelText('Sección (ej. 11°A)'), '11°A')
    await user.type(screen.getByLabelText('Nombre completo'), 'Ana Estudiante')
    await user.type(screen.getByLabelText('Correo'), 'ana@lasalle.edu.co')
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }))

    expect(await screen.findByRole('heading', { name: 'Grupo creado en 11°A' })).toBeInTheDocument()
    expect(screen.getByText('tmp-123')).toBeInTheDocument()
    expect(mockedCreateGroup).toHaveBeenCalledWith('token-admin', {
      section_name: '11°A',
      students: [{ full_name: 'Ana Estudiante', email: 'ana@lasalle.edu.co' }],
    })
  })

  it('muestra el error del backend si la creación falla', async () => {
    const user = userEvent.setup()
    mockedCreateGroup.mockRejectedValueOnce(new ApiError('El correo ya está en uso.', 'duplicate_email', 400))

    render(<AdminStudentsPage token="token-admin" />)

    await user.type(screen.getByLabelText('Sección (ej. 11°A)'), '11°A')
    await user.type(screen.getByLabelText('Nombre completo'), 'Ana Estudiante')
    await user.type(screen.getByLabelText('Correo'), 'ana@lasalle.edu.co')
    await user.click(screen.getByRole('button', { name: 'Crear grupo' }))

    expect(await screen.findByText('El correo ya está en uso.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Grupo creado/ })).not.toBeInTheDocument()
  })
})

describe('AdminStudentsPage — modo "agregar a grupo existente"', () => {
  beforeEach(() => {
    mockedCreateGroup.mockReset()
    mockedListSections.mockReset()
    mockedListGroups.mockReset()
    mockedAddMembers.mockReset()
    mockedSearchStudents.mockReset()
  })

  it('carga secciones y grupos, y agrega un integrante nuevo al grupo elegido', async () => {
    const user = userEvent.setup()
    mockedListSections.mockResolvedValueOnce([{ id: 1, name: '11°A' }])
    mockedListGroups.mockResolvedValueOnce([
      {
        id: 5,
        section_id: 1,
        section_name: '11°A',
        students: [{ id: 20, full_name: 'Otro Estudiante', username: 'otro', email: 'otro@lasalle.edu.co' }],
      },
    ])
    mockedAddMembers.mockResolvedValueOnce({
      group_id: 5,
      section_id: 1,
      section_name: '11°A',
      added_new: [
        { id: 30, full_name: 'Nuevo Estudiante', username: 'nuevo', email: 'nuevo@lasalle.edu.co', temporary_password: 'tmp-456' },
      ],
      added_existing: [],
    })

    render(<AdminStudentsPage token="token-admin" />)
    await user.click(screen.getByRole('button', { name: 'Agregar a un grupo existente' }))

    const sectionSelect = await screen.findByLabelText('Sección')
    await user.selectOptions(sectionSelect, '11°A')

    const groupOption = await screen.findByText(/Otro Estudiante/)
    await user.click(groupOption)

    const addForm = screen.getByRole('button', { name: 'Agregar al grupo' }).closest('form')!
    await user.type(within(addForm).getByLabelText('Nombre completo'), 'Nuevo Estudiante')
    await user.type(within(addForm).getByLabelText('Correo'), 'nuevo@lasalle.edu.co')
    await user.click(screen.getByRole('button', { name: 'Agregar al grupo' }))

    expect(await screen.findByRole('heading', { name: 'Integrantes agregados a 11°A' })).toBeInTheDocument()
    expect(screen.getByText('tmp-456')).toBeInTheDocument()
    expect(mockedAddMembers).toHaveBeenCalledWith('token-admin', 5, {
      new_students: [{ full_name: 'Nuevo Estudiante', email: 'nuevo@lasalle.edu.co' }],
      existing_student_ids: [],
    })
  })

  it('busca y selecciona un estudiante existente para agregarlo al grupo', async () => {
    const user = userEvent.setup()
    mockedListSections.mockResolvedValueOnce([{ id: 1, name: '11°A' }])
    mockedListGroups.mockResolvedValueOnce([
      { id: 5, section_id: 1, section_name: '11°A', students: [] },
    ])
    mockedSearchStudents.mockResolvedValueOnce([
      { id: 40, full_name: 'Carlos Existente', username: 'carlos', email: 'carlos@lasalle.edu.co', already_in_group: false },
      { id: 41, full_name: 'Ocupado Estudiante', username: 'ocupado', email: 'ocupado@lasalle.edu.co', already_in_group: true },
    ])
    mockedAddMembers.mockResolvedValueOnce({
      group_id: 5,
      section_id: 1,
      section_name: '11°A',
      added_new: [],
      added_existing: [{ id: 40, full_name: 'Carlos Existente', username: 'carlos', email: 'carlos@lasalle.edu.co' }],
    })

    render(<AdminStudentsPage token="token-admin" />)
    await user.click(screen.getByRole('button', { name: 'Agregar a un grupo existente' }))

    const sectionSelect = await screen.findByLabelText('Sección')
    await user.selectOptions(sectionSelect, '11°A')
    await user.click(await screen.findByText(/sin integrantes todavía/))

    // Cambiar el integrante 1 a modo "Existente".
    await user.click(screen.getByRole('button', { name: 'Existente' }))

    await user.type(screen.getByLabelText('Buscar por nombre o usuario'), 'carlos')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(mockedSearchStudents).toHaveBeenCalledWith('token-admin', 'carlos')

    // El resultado ya en un grupo no se puede elegir.
    const occupiedRow = (await screen.findByText(/Ocupado Estudiante/)).closest('li')!
    expect(within(occupiedRow).getByRole('button', { name: 'Elegir' })).toBeDisabled()

    const availableRow = screen.getByText(/Carlos Existente/).closest('li')!
    await user.click(within(availableRow).getByRole('button', { name: 'Elegir' }))

    // Tras elegirlo, la fila muestra el estudiante seleccionado en vez del buscador.
    expect(screen.getByText(/Carlos Existente — usuario: carlos/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Buscar por nombre o usuario')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Agregar al grupo' }))

    expect(await screen.findByRole('heading', { name: 'Integrantes agregados a 11°A' })).toBeInTheDocument()
    expect(mockedAddMembers).toHaveBeenCalledWith('token-admin', 5, {
      new_students: [],
      existing_student_ids: [40],
    })
  })

  it('avisa cuando una sección todavía no tiene grupos', async () => {
    const user = userEvent.setup()
    mockedListSections.mockResolvedValueOnce([{ id: 2, name: '11°B' }])
    mockedListGroups.mockResolvedValueOnce([])

    render(<AdminStudentsPage token="token-admin" />)
    await user.click(screen.getByRole('button', { name: 'Agregar a un grupo existente' }))

    const sectionSelect = await screen.findByLabelText('Sección')
    await user.selectOptions(sectionSelect, '11°B')

    expect(await screen.findByText('Todavía no hay grupos en esta sección.')).toBeInTheDocument()
  })
})
