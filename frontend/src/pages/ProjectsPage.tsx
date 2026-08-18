import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { listProjects, updateProject, deleteProject, type Project } from '../api/projects'
import { ApiError } from '../api/client'
import './ProjectsPage.css'

interface ProjectsPageProps {
  token: string | null
  // Se resuelve una sola vez en App.tsx (ver isAdmin ahi) y se pasa como
  // prop - evita repetir la misma llamada a /users/me que ya hace App.tsx
  // para decidir si mostrar el item "Estudiantes" en el sidebar.
  isAdmin: boolean
}

// Solo lectura para todo el mundo a proposito: explorar el archivo de
// proyectos del colegio, sin login (ver CLAUDE.md). La unica excepcion es
// el admin: si esta autenticado y tiene el rol, ve controles de
// editar/borrar sobre CUALQUIER proyecto (control total del repositorio,
// no solo el suyo) - por eso esta pantalla, y no MyProjectPage, es donde
// vive esa capacidad.
export function ProjectsPage({ token, isAdmin }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([])
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

  // Mueve el foco a la tarjeta que cambio de estado - sin esto, un lector
  // de pantalla no tiene forma de saber que el contenido debajo del cursor
  // se reemplazo por un formulario (edicion) o una advertencia (borrado).
  const editCardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (editingId !== null) editCardRef.current?.focus()
  }, [editingId])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const projectsData = await listProjects(token)
        if (!cancelled) {
          setProjects(projectsData)
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
                <Card key={project.id} className="project-card" ref={editCardRef} tabIndex={-1}>
                  <form className="project-edit-form" onSubmit={(event) => handleUpdate(event, project.id)}>
                    <h3 className="project-edit-form-title">Editando: {project.title}</h3>
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
                        <p role="alert">¿Borrar este proyecto? Esta acción no se puede deshacer.</p>
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
                            variant="danger"
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
