import { apiFetch } from './client'

export interface Document {
  id: number
  file_name: string
  file_type: string
  size_bytes: number
  uploaded_at: string
  url: string
}

// Sin token: listar documentos es publico, igual que /projects (ver
// CLAUDE.md). Se acepta null/undefined para las pantallas sin sesion.
export function listDocuments(projectId: number, token?: string | null): Promise<Document[]> {
  return apiFetch<Document[]>(`/projects/${projectId}/documents`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export function uploadDocument(token: string, projectId: number, file: File): Promise<Document> {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetch<Document>(`/projects/${projectId}/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
}

export function deleteDocument(token: string, documentId: number): Promise<void> {
  return apiFetch<void>(`/documents/${documentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
