import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DocumentList } from './DocumentList'
import type { Document } from '../api/documents'

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 1,
    file_name: 'informe.pdf',
    file_type: 'application/pdf',
    size_bytes: 2_400_000,
    uploaded_at: '2026-01-01T00:00:00Z',
    url: 'https://fake.supabase.co/storage/v1/object/public/documents/1/algo.pdf',
    ...overrides,
  }
}

describe('DocumentList', () => {
  it('muestra el mensaje de vacío cuando no hay documentos', () => {
    render(<DocumentList documents={[]} canDelete={false} />)

    expect(screen.getByText('Todavía no hay documentos.')).toBeInTheDocument()
  })

  it('muestra el nombre, el tamaño formateado y el link de descarga', () => {
    render(<DocumentList documents={[makeDocument()]} canDelete={false} />)

    expect(screen.getByText('informe.pdf')).toBeInTheDocument()
    expect(screen.getByText('2.3 MB')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /Descargar/ })
    expect(link).toHaveAttribute('href', 'https://fake.supabase.co/storage/v1/object/public/documents/1/algo.pdf')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('download', 'informe.pdf')
  })

  it('sin permiso de borrar, no muestra el botón "Borrar"', () => {
    render(<DocumentList documents={[makeDocument()]} canDelete={false} />)

    expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument()
  })

  it('con permiso, borrar pide confirmación antes de llamar a onDelete', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<DocumentList documents={[makeDocument({ id: 7 })]} canDelete onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Borrar' }))
    expect(onDelete).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }))
    expect(onDelete).toHaveBeenCalledWith(7)
  })

  it('cancelar la confirmación no llama a onDelete', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<DocumentList documents={[makeDocument()]} canDelete onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Borrar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeInTheDocument()
  })
})
