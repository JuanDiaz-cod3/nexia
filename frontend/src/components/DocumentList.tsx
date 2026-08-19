import { useState } from 'react'
import { Button } from './Button'
import type { Document } from '../api/documents'
import './DocumentList.css'

interface DocumentListProps {
  documents: Document[]
  canDelete: boolean
  onDelete?: (documentId: number) => void
  deletingId?: number | null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Lista de solo lectura + borrar (opcional) - la subida vive en
// MyProjectPage, no aca, porque solo tiene sentido para el proyecto
// propio (ver CLAUDE.md). Reusado en ProjectsPage (canDelete solo si
// isAdmin) y MyProjectPage (canDelete siempre, es el proyecto propio).
export function DocumentList({ documents, canDelete, onDelete, deletingId }: DocumentListProps) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  if (documents.length === 0) {
    return <p className="document-list-empty">Todavía no hay documentos.</p>
  }

  return (
    <ul className="document-list">
      {documents.map((document) => (
        <li key={document.id} className="document-list-item">
          <span className="document-list-name">{document.file_name}</span>
          <span className="document-list-meta">{formatFileSize(document.size_bytes)}</span>
          <a
            href={document.url}
            target="_blank"
            rel="noreferrer"
            download={document.file_name}
            className="document-list-download"
          >
            <DownloadIcon />
            Descargar
          </a>

          {canDelete &&
            (confirmingId === document.id ? (
              <span className="document-list-confirm" role="alert">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setConfirmingId(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    onDelete?.(document.id)
                    setConfirmingId(null)
                  }}
                  disabled={deletingId === document.id}
                >
                  Sí, borrar
                </Button>
              </span>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="document-list-delete"
                onClick={() => setConfirmingId(document.id)}
              >
                Borrar
              </Button>
            ))}
        </li>
      ))}
    </ul>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" className="document-list-download-icon" aria-hidden="true">
      <path
        d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M4 14.5v1.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
