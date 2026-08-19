import { useEffect, useState, type FormEvent } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Spinner } from '../components/Spinner'
import { DocumentList } from '../components/DocumentList'
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  type Project,
} from '../api/projects'
import { listDocuments, uploadDocument, deleteDocument, type Document } from '../api/documents'
import { getCurrentUser } from '../api/users'
import { ApiError } from '../api/client'

const ALLOWED_DOCUMENT_EXTENSIONS = '.pdf,.doc,.docx,.ppt,.pptx'
import './MyProjectPage.css'

// Workspace personal del estudiante: a diferencia de ProjectsPage (solo
// lectura, explora todo el colegio), aca gestiona su propio proyecto. No
// existe GET /projects/me todavia - se reutiliza el listado completo y se
// filtra en el cliente por membresia. Con la escala actual (un colegio
// piloto) no vale la pena el endpoint dedicado; si el listado crece se
// puede agregar despues sin tocar esta pantalla por fuera.
export function MyProjectPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [summary, setSummary] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [documents, setDocuments] = useState<Document[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [projectsData, user] = await Promise.all([listProjects(), getCurrentUser()])
        if (!cancelled) {
          setProjects(projectsData)
          setCurrentUserId(user.id)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const myProject = projects.find((project) =>
    project.members.some((member) => member.id === currentUserId),
  )

  // Separado del efecto de arriba: myProject.id no se conoce hasta que
  // projects/currentUserId ya cargaron. Errores de carga de documentos no
  // bloquean la pantalla (a diferencia de error/loading de arriba) - el
  // proyecto igual es utilizable si esto falla, solo la seccion queda vacia.
  useEffect(() => {
    if (!myProject) return
    let cancelled = false
    listDocuments(myProject.id)
      .then((data) => {
        if (!cancelled) setDocuments(data)
      })
      .catch(() => {
        if (!cancelled) setDocuments([])
      })
    return () => {
      cancelled = true
    }
  }, [myProject?.id])

  function startEdit(project: Project) {
    setEditTitle(project.title)
    setEditCategory(project.category ?? '')
    setEditSummary(project.summary ?? '')
    setEditError(null)
    setIsEditing(true)
  }

  // La regla "un proyecto por estudiante por año" la aplica el backend
  // (409 already_in_project) - no se duplica aca.
  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    if (!title.trim()) {
      setFormError('El título es obligatorio.')
      return
    }
    setFormLoading(true)
    try {
      const project = await createProject({
        title,
        category: category || undefined,
        summary: summary || undefined,
      })
      setProjects((prev) => [project, ...prev])
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleUpdate(event: FormEvent) {
    event.preventDefault()
    if (!myProject) return
    setEditError(null)
    if (!editTitle.trim()) {
      setEditError('El título es obligatorio.')
      return
    }
    setEditLoading(true)
    try {
      const updated = await updateProject(myProject.id, {
        title: editTitle,
        category: editCategory || null,
        summary: editSummary || null,
      })
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      setIsEditing(false)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!myProject) return
    const input = event.currentTarget.elements.namedItem('file') as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    setUploadError(null)
    setUploading(true)
    try {
      const document = await uploadDocument(myProject.id, file)
      setDocuments((prev) => [document, ...prev])
      input.value = ''
      setSelectedFileName(null)
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteDocument(documentId: number) {
    setDeletingDocumentId(documentId)
    try {
      await deleteDocument(documentId)
      setDocuments((prev) => prev.filter((d) => d.id !== documentId))
    } catch {
      // Silencioso a proposito: no hay un lugar obvio donde mostrar el
      // error sin agregar otro estado de error solo para esto - el
      // documento simplemente sigue en la lista, el usuario puede
      // reintentar el borrado.
    } finally {
      setDeletingDocumentId(null)
    }
  }

  async function handleDelete() {
    if (!myProject) return
    setDeleteError(null)
    setDeleteLoading(true)
    try {
      await deleteProject(myProject.id)
      setProjects((prev) => prev.filter((p) => p.id !== myProject.id))
      setConfirmingDelete(false)
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="my-project-page">
        <Spinner label="Cargando…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="my-project-page">
        <p className="my-project-error" role="alert">{error}</p>
      </div>
    )
  }

  if (!myProject) {
    return (
      <div className="my-project-page">
        <p className="my-project-intro">
          Todavía no perteneces a un proyecto este año académico. Crea el tuyo para empezar.
        </p>
        <Card className="my-project-form-card">
          <form onSubmit={handleCreate} className="my-project-form" noValidate>
            <Input
              label="Título"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
            <Input
              label="Categoría"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
            <div className="input-group">
              <label className="input-label" htmlFor="my-project-summary">
                Resumen
              </label>
              <textarea
                id="my-project-summary"
                className="input"
                rows={4}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </div>
            {formError && <p className="my-project-error" role="alert">{formError}</p>}
            <Button type="submit" className="my-project-form-submit" disabled={formLoading}>
              Crear proyecto
            </Button>
          </form>
        </Card>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="my-project-page">
        <Card className="my-project-form-card">
          <form onSubmit={handleUpdate} className="my-project-form" noValidate>
            <Input
              label="Título"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              required
            />
            <Input
              label="Categoría"
              value={editCategory}
              onChange={(event) => setEditCategory(event.target.value)}
            />
            <div className="input-group">
              <label className="input-label" htmlFor="my-project-edit-summary">
                Resumen
              </label>
              <textarea
                id="my-project-edit-summary"
                className="input"
                rows={4}
                value={editSummary}
                onChange={(event) => setEditSummary(event.target.value)}
              />
            </div>
            {editError && <p className="my-project-error" role="alert">{editError}</p>}
            <div className="my-project-form-actions">
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editLoading}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="my-project-page">
      <Card className="my-project-detail">
        <div className="my-project-detail-header">
          <h2>{myProject.title}</h2>
          <div className="my-project-detail-actions">
            <Button variant="secondary" onClick={() => startEdit(myProject)}>
              Editar
            </Button>
            <Button variant="secondary" onClick={() => setConfirmingDelete(true)}>
              Borrar
            </Button>
          </div>
        </div>

        {confirmingDelete && (
          <div className="my-project-delete-confirm">
            <p role="alert">¿Seguro que quieres borrar este proyecto? Esta acción no se puede deshacer.</p>
            {deleteError && <p className="my-project-error" role="alert">{deleteError}</p>}
            <div className="my-project-form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setConfirmingDelete(false)
                  setDeleteError(null)
                }}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleDelete} disabled={deleteLoading}>
                Sí, borrar
              </Button>
            </div>
          </div>
        )}

        {myProject.category && <p className="my-project-category">{myProject.category}</p>}
        <span className="my-project-status">{myProject.status}</span>
        {myProject.summary && <p className="my-project-summary">{myProject.summary}</p>}

        <div className="my-project-section">
          <h3>Integrantes</h3>
          <p>{myProject.members.map((member) => member.full_name).join(', ')}</p>
        </div>

        <div className="my-project-section">
          <h3>Asesor</h3>
          <p>{myProject.advisor ? myProject.advisor.full_name : 'Sin asesor asignado todavía.'}</p>
        </div>

        <div className="my-project-section">
          <h3>Documentos</h3>
          <DocumentList
            documents={documents}
            canDelete
            onDelete={handleDeleteDocument}
            deletingId={deletingDocumentId}
          />
          <form className="my-project-upload-form" onSubmit={handleUpload}>
            <div className="file-input-wrap">
              <input
                id="my-project-file-input"
                type="file"
                name="file"
                accept={ALLOWED_DOCUMENT_EXTENSIONS}
                className="file-input-native"
                onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? null)}
              />
              <label htmlFor="my-project-file-input" className="button button--secondary file-input-label">
                Elegir archivo
              </label>
              <span className="file-input-filename">
                {selectedFileName ?? 'Ningún archivo seleccionado'}
              </span>
            </div>
            <Button type="submit" variant="secondary" disabled={uploading}>
              {uploading ? 'Subiendo…' : 'Subir documento'}
            </Button>
          </form>
          {uploadError && <p className="my-project-error" role="alert">{uploadError}</p>}
          <p className="my-project-upload-hint">PDF, Word o PowerPoint. Máximo 25MB.</p>
        </div>
      </Card>
    </div>
  )
}
