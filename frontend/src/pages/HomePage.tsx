import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { listProjects, type Project } from '../api/projects'
import { ApiError } from '../api/client'
import './HomePage.css'

interface HomePageProps {
  token: string
  onExploreProjects: () => void
}

// Estilo "vidrio" (ver index.css, tokens --glass-*): esta es la primera
// pantalla que lo adopta. Estudiantes activos no tiene de donde salir
// todavia (no existe un endpoint que liste usuarios) - se muestra como
// placeholder explicito en vez de inventar un numero.
export function HomePage({ token, onExploreProjects }: HomePageProps) {
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

  const publishedCount = projects.filter((project) => project.status === 'published').length
  const recentProjects = projects.slice(0, 3)

  return (
    <div className="home-page">
      <div className="home-grid">
        <div className="home-main">
          <section className="glass-panel home-hero">
            <div className="home-hero-eyebrow">Bienvenido a</div>
            <h1 className="home-hero-title">
              INNOVA<span className="home-hero-accent">LAB</span>
            </h1>
            <p className="home-hero-text">
              El repositorio de proyectos de investigación del Instituto La Salle - Bilingual
              School Barranquilla — donde el trabajo de grado 11° queda registrado, consultado y
              conservado.
            </p>
            <Button onClick={onExploreProjects}>Explorar proyectos →</Button>
          </section>

          {error && <p className="home-error">{error}</p>}

          <div className="home-stats-row">
            <div className="glass-panel home-stat-card">
              <div className="home-stat-num">{loading ? '—' : projects.length}</div>
              <div className="home-stat-label">Proyectos registrados</div>
            </div>
            <div className="glass-panel home-stat-card">
              <div className="home-stat-num">{loading ? '—' : publishedCount}</div>
              <div className="home-stat-label">Proyectos publicados</div>
            </div>
            <div className="glass-panel home-stat-card home-stat-card--placeholder">
              <div className="home-stat-num">—</div>
              <div className="home-stat-label">Estudiantes activos</div>
              <span className="home-preview-tag">Próximamente</span>
            </div>
          </div>

          <h2 className="home-section-title">Proyectos recientes</h2>
          {loading ? (
            <p>Cargando…</p>
          ) : recentProjects.length === 0 ? (
            <p className="glass-panel home-empty">
              Todavía no hay proyectos registrados. Cuando alguien cree el primero, aparece acá.
            </p>
          ) : (
            <div className="home-projects-row">
              {recentProjects.map((project) => (
                <div className="glass-panel home-project-card" key={project.id}>
                  {project.status === 'published' && (
                    <span className="home-seal" aria-label="Proyecto publicado">
                      ✓
                    </span>
                  )}
                  {project.category && <span className="home-tag">{project.category}</span>}
                  <h3>{project.title}</h3>
                  <p className="home-project-meta">
                    {project.members.map((member) => member.full_name).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="home-side">
          <div className="glass-panel home-side-panel">
            <div className="home-side-panel-header">
              <h4>Notificaciones</h4>
              <span className="home-preview-tag">Próximamente</span>
            </div>
            <p className="home-side-placeholder">
              Acá vas a ver avisos sobre tu proyecto (comentarios, cambios de estado) cuando el
              flujo de revisión esté construido.
            </p>
          </div>

          <div className="glass-panel home-side-panel">
            <div className="home-side-panel-header">
              <h4>Ranking de proyectos</h4>
              <span className="home-preview-tag">Próximamente</span>
            </div>
            <p className="home-side-placeholder">
              Este panel se llena cuando exista evaluación por jurados — todavía fuera de
              alcance.
            </p>
          </div>
        </div>

        <div className="home-quote-banner">
          <p>
            <span className="home-quote-mark">"</span>Investigar es ver lo que todo el mundo ha
            visto, y pensar lo que nadie más ha pensado.
          </p>
          <span className="home-quote-author">— Albert Szent-Györgyi</span>
        </div>
      </div>
    </div>
  )
}
