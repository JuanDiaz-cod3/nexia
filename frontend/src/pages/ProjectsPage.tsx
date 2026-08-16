import { useEffect, useState } from 'react'
import { Card } from '../components/Card'
import { listProjects, type Project } from '../api/projects'
import { ApiError } from '../api/client'
import './ProjectsPage.css'

interface ProjectsPageProps {
  token: string
}

export function ProjectsPage({ token }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <h1>Proyectos</h1>
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
