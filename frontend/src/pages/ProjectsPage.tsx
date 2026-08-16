import { useEffect, useState, type FormEvent } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { listProjects, createProject, type Project } from '../api/projects'
import { ApiError } from '../api/client'
import './ProjectsPage.css'

interface ProjectsPageProps {
  token: string
}

export function ProjectsPage({ token }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [summary, setSummary] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Se ejecuta una sola vez al montar la pagina. [token] en el arreglo de
  // dependencias: si el token cambiara (otro login), vuelve a pedir la
  // lista con las credenciales nuevas en vez de quedarse con datos viejos.
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await listProjects(token)
        if (!cancelled) setProjects(data)
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
        <h1>Proyectos</h1>
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
          {projects.map((project) => (
            <Card key={project.id} className="project-card">
              <h2>{project.title}</h2>
              {project.category && <p className="project-category">{project.category}</p>}
              {project.summary && <p className="project-summary">{project.summary}</p>}
              <p className="project-members">
                {project.members.map((member) => member.full_name).join(', ')}
              </p>
              <span className="project-status">{project.status}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
