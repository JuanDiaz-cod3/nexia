import { apiFetch } from './client'

export interface Document {
  id: number
  file_name: string
  file_type: string
  size_bytes: number
  uploaded_at: string
  url: string
}

// Listar documentos es publico, igual que /projects (ver CLAUDE.md).
export function listDocuments(projectId: number): Promise<Document[]> {
  return apiFetch<Document[]>(`/projects/${projectId}/documents`)
}

export function uploadDocument(projectId: number, file: File): Promise<Document> {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetch<Document>(`/projects/${projectId}/documents`, {
    method: 'POST',
    body: formData,
  })
}

export function deleteDocument(documentId: number): Promise<void> {
  return apiFetch<void>(`/documents/${documentId}`, { method: 'DELETE' })
}
