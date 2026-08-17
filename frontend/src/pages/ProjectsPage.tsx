import { useEffect, useState } from 'react'
import { Card } from '../components/Card'
import { listProjects, type Project } from '../api/projects'
import { ApiError } from '../api/client'
import './ProjectsPage.css'

interface ProjectsPageProps {
  token: string
}

// Solo lectura a proposito: explorar el archivo de proyectos del colegio.
// Crear/editar el proyecto propio vive en MyProjectPage - separar "ver todo"
// de "gestionar el mio" evita mezclar dos intenciones distintas en una
// misma pantalla.
export function ProjectsPage({ token }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    return () => {
      cancelled = true
    }
  }, [token])

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
