import { useEffect, useState, type FormEvent } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Spinner } from '../components/Spinner'
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  type Project,
} from '../api/projects'
import { getCurrentUser } from '../api/users'
import { ApiError } from '../api/client'
import './MyProjectPage.css'

interface MyProjectPageProps {
  token: string
}

// Workspace personal del estudiante: a diferencia de ProjectsPage (solo
// lectura, explora todo el colegio), aca gestiona su propio proyecto. No
// existe GET /projects/me todavia - se reutiliza el listado completo y se
// filtra en el cliente por membresia. Con la escala actual (un colegio
// piloto) no vale la pena el endpoint dedicado; si el listado crece se
// puede agregar despues sin tocar esta pantalla por fuera.
export function MyProjectPage({ token }: MyProjectPageProps) {
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

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [projectsData, user] = await Promise.all([
          listProjects(token),
          getCurrentUser(token),
        ])
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
  }, [token])

  const myProject = projects.find((project) =>
    project.members.some((member) => member.id === currentUserId),
  )

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
    setFormLoading(true)
    try {
      const project = await createProject(token, {
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
    setEditLoading(true)
    try {
      const updated = await updateProject(token, myProject.id, {
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

  async function handleDelete() {
    if (!myProject) return
    setDeleteError(null)
    setDeleteLoading(true)
    try {
      await deleteProject(token, myProject.id)
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
          <form onSubmit={handleCreate} className="my-project-form">
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
          <form onSubmit={handleUpdate} className="my-project-form">
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
      </Card>
    </div>
  )
}
