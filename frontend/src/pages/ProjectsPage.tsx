import { useEffect, useState, type FormEvent } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { listProjects, createProject, updateProject, type Project } from '../api/projects'
import { getCurrentUser } from '../api/users'
import { ApiError } from '../api/client'
import './ProjectsPage.css'

interface ProjectsPageProps {
  token: string
}

export function ProjectsPage({ token }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [summary, setSummary] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Distinto de showForm/formError (esos son del formulario de creacion):
  // editingId indica cual tarjeta esta en modo edicion, nunca mas de una a
  // la vez.
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  // Se ejecuta una sola vez al montar la pagina. [token] en el arreglo de
  // dependencias: si el token cambiara (otro login), vuelve a pedir todo
  // con las credenciales nuevas en vez de quedarse con datos viejos.
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        // En paralelo: la lista de proyectos no depende de saber quien soy,
        // asi que no hay razon para esperar una peticion antes que la otra.
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
    // Cleanup: si el componente se desmonta antes de que responda el
    // fetch, "cancelled" evita que actualicemos el estado de un
    // componente que ya no existe (React lo marca como warning/bug).
    return () => {
      cancelled = true
    }
  }, [token])

  function startEdit(project: Project) {
    setEditingId(project.id)
    setEditTitle(project.title)
    setEditCategory(project.category ?? '')
    setEditSummary(project.summary ?? '')
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  // Igual que en handleCreate: "cualquier integrante puede editar" lo
  // aplica el backend (403 not_a_member si no lo eres), aca no se repite
  // esa regla.
  async function handleUpdate(event: FormEvent, projectId: number) {
    event.preventDefault()
    setEditError(null)
    setEditLoading(true)
    try {
      const updated = await updateProject(token, projectId, {
        title: editTitle,
        category: editCategory || null,
        summary: editSummary || null,
      })
      setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)))
      setEditingId(null)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setEditLoading(false)
    }
  }

  // La regla "un proyecto por estudiante por año" no se valida aca: el
  // backend la aplica (409 already_in_project) y ese mensaje es el que
  // termina mostrandose como formError. Evita mantener la misma regla de
  // negocio duplicada en dos lugares.
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
      setTitle('')
      setCategory('')
      setSummary('')
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setFormLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="projects-page">
        <p>Cargando proyectos…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="projects-page">
        <p className="projects-error">{error}</p>
      </div>
    )
  }

  return (
    <div className="projects-page">
      <div className="projects-header">
        <Button variant="secondary" onClick={() => setShowForm((prev) => !prev)}>
          {showForm ? 'Cancelar' : 'Nuevo proyecto'}
        </Button>
      </div>

      {showForm && (
        <Card className="project-form-card">
          <form onSubmit={handleCreate} className="project-form">
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
              <label className="input-label" htmlFor="project-summary">
                Resumen
              </label>
              <textarea
                id="project-summary"
                className="input"
                rows={4}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </div>
            {formError && <p className="projects-error">{formError}</p>}
            <Button type="submit" className="project-form-submit" disabled={formLoading}>
              Guardar proyecto
            </Button>
          </form>
        </Card>
      )}

      {projects.length === 0 ? (
        <p>Aún no hay proyectos registrados.</p>
      ) : (
        <div className="projects-list">
          {projects.map((project) => {
            const isMember = project.members.some((member) => member.id === currentUserId)

            if (editingId === project.id) {
              return (
                <Card key={project.id} className="project-card">
                  <form onSubmit={(event) => handleUpdate(event, project.id)} className="project-form">
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
                      <label className="input-label" htmlFor={`project-summary-${project.id}`}>
                        Resumen
                      </label>
                      <textarea
                        id={`project-summary-${project.id}`}
                        className="input"
                        rows={4}
                        value={editSummary}
                        onChange={(event) => setEditSummary(event.target.value)}
                      />
                    </div>
                    {editError && <p className="projects-error">{editError}</p>}
                    <div className="project-form-actions">
                      <Button type="button" variant="secondary" onClick={cancelEdit}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={editLoading}>
                        Guardar cambios
                      </Button>
                    </div>
                  </form>
                </Card>
              )
            }

            return (
              <Card key={project.id} className="project-card">
                <div className="project-card-header">
                  <h2>{project.title}</h2>
                  {isMember && (
                    <Button variant="secondary" onClick={() => startEdit(project)}>
                      Editar
                    </Button>
                  )}
                </div>
                {project.category && <p className="project-category">{project.category}</p>}
                {project.summary && <p className="project-summary">{project.summary}</p>}
                <p className="project-members">
                  {project.members.map((member) => member.full_name).join(', ')}
                </p>
                <span className="project-status">{project.status}</span>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
