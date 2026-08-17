import { useEffect, useState, type FormEvent } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { listProjects, updateProject, deleteProject, type Project } from '../api/projects'
import { getCurrentUser } from '../api/users'
import { ApiError } from '../api/client'
import './ProjectsPage.css'

interface ProjectsPageProps {
  token: string | null
}

// Solo lectura para todo el mundo a proposito: explorar el archivo de
// proyectos del colegio, sin login (ver CLAUDE.md). La unica excepcion es
// el admin: si esta autenticado y tiene el rol, ve controles de
// editar/borrar sobre CUALQUIER proyecto (control total del repositorio,
// no solo el suyo) - por eso esta pantalla, y no MyProjectPage, es donde
// vive esa capacidad.
export function ProjectsPage({ token }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null)
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
          token ? getCurrentUser(token) : Promise.resolve(null),
        ])
        if (!cancelled) {
          setProjects(projectsData)
          setIsAdmin(user?.roles.includes('admin') ?? false)
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

  function startEdit(project: Project) {
    setEditingId(project.id)
    setEditTitle(project.title)
    setEditCategory(project.category ?? '')
    setEditSummary(project.summary ?? '')
    setEditError(null)
  }

  async function handleUpdate(event: FormEvent, projectId: number) {
    event.preventDefault()
    if (!token) return
    setEditError(null)
    setEditLoading(true)
    try {
      const updated = await updateProject(token, projectId, {
        title: editTitle,
        category: editCategory || null,
        summary: editSummary || null,
      })
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      setEditingId(null)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDelete(projectId: number) {
    if (!token) return
    setDeleteError(null)
    setDeleteLoading(true)
    try {
      await deleteProject(token, projectId)
      setProjects((prev) => prev.filter((p) => p.id !== projectId))
      setConfirmingDeleteId(null)
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setDeleteLoading(false)
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
      {projects.length === 0 ? (
        <p>Aún no hay proyectos registrados.</p>
      ) : (
        <div className="projects-list">
          {projects.map((project) => {
            if (isAdmin && editingId === project.id) {
              return (
                <Card key={project.id} className="project-card">
                  <form className="project-edit-form" onSubmit={(event) => handleUpdate(event, project.id)}>
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
                      <label className="input-label" htmlFor={`project-edit-summary-${project.id}`}>
                        Resumen
                      </label>
                      <textarea
                        id={`project-edit-summary-${project.id}`}
                        className="input"
                        rows={4}
                        value={editSummary}
                        onChange={(event) => setEditSummary(event.target.value)}
                      />
                    </div>
                    {editError && <p className="projects-error">{editError}</p>}
                    <div className="project-edit-form-actions">
                      <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
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
                <h2>{project.title}</h2>
                {project.category && <p className="project-category">{project.category}</p>}
                {project.summary && <p className="project-summary">{project.summary}</p>}
                <p className="project-members">
                  {project.members.map((member) => member.full_name).join(', ')}
                </p>
                <span className="project-status">{project.status}</span>

                {isAdmin && (
                  <div className="project-admin-controls">
                    {confirmingDeleteId === project.id ? (
                      <div className="project-delete-confirm">
                        <p>¿Borrar este proyecto? Esta acción no se puede deshacer.</p>
                        {deleteError && <p className="projects-error">{deleteError}</p>}
                        <div className="project-edit-form-actions">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setConfirmingDeleteId(null)
                              setDeleteError(null)
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleDelete(project.id)}
                            disabled={deleteLoading}
                          >
                            Sí, borrar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Button variant="secondary" onClick={() => startEdit(project)}>
                          Editar
                        </Button>
                        <Button variant="secondary" onClick={() => setConfirmingDeleteId(project.id)}>
                          Borrar
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
