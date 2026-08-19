import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { Seal } from '../components/Seal'
import { Spinner } from '../components/Spinner'
import { listProjects, type Project } from '../api/projects'
import { ApiError } from '../api/client'
import './HomePage.css'

interface HomePageProps {
  token: string | null
  onExploreProjects: () => void
}

interface Quote {
  text: string
  author: string
}

// Contenido fijo de la pagina, no datos - vive aca en vez de venir del
// backend porque no depende de nada que cambie por usuario ni por proyecto.
const QUOTES: Quote[] = [
  {
    text: 'Investigar es ver lo que todo el mundo ha visto, y pensar lo que nadie más ha pensado.',
    author: 'Albert Szent-Györgyi',
  },
  {
    text: 'Solamente los que arriesgan llegar demasiado lejos son los que descubren hasta dónde pueden llegar.',
    author: 'T. S. Eliot',
  },
  {
    text: 'La investigación se asemeja a los largos meses de gestación, y la solución del problema, al día del nacimiento. Investigar un problema es resolverlo.',
    author: 'Mao Tse Tung',
  },
  {
    text: 'El análisis lógico es la primera operación que debiera emprenderse al comprobar las hipótesis científicas, sean fácticas o no.',
    author: 'Mario Bunge',
  },
]

const QUOTE_ROTATE_MS = 10_000
// Tiene que coincidir con la transicion de opacity de .home-quote-content
// en HomePage.css - es la mitad del ciclo: se apaga, recien ahi se cambia
// el texto, y se vuelve a prender.
const QUOTE_FADE_MS = 400

// Estilo "vidrio" (ver index.css, tokens --glass-*): esta es la primera
// pantalla que lo adopta. Estudiantes activos no tiene de donde salir
// todavia (no existe un endpoint que liste usuarios) - se muestra como
// placeholder explicito en vez de inventar un numero.
export function HomePage({ token, onExploreProjects }: HomePageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quoteIndex, setQuoteIndex] = useState(0)
  // Antes esto se lograba desmontando/remontando el bloque via key={} - se
  // veia como un parpadeo en blanco y despues un fundido de entrada, no un
  // fundido cruzado de verdad (hallazgo de la ronda de impeccable). Ahora
  // "fading" apaga el bloque via CSS, se cambia el texto recien cuando ya
  // esta invisible, y se vuelve a prender - sin blanco de por medio.
  const [fading, setFading] = useState(false)

  // Sin llamada al servidor: avanza un indice sobre el array local cada
  // QUOTE_ROTATE_MS mientras Inicio este montado. El timer vive y muere en
  // el navegador de quien mira la pagina, no le cuesta nada al backend.
  useEffect(() => {
    const id = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setQuoteIndex((current) => (current + 1) % QUOTES.length)
        setFading(false)
      }, QUOTE_FADE_MS)
    }, QUOTE_ROTATE_MS)
    return () => clearInterval(id)
  }, [])

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
            <Spinner label="Cargando proyectos recientes…" size="small" />
          ) : recentProjects.length === 0 ? (
            <p className="glass-panel home-empty">
              Todavía no hay proyectos registrados. Cuando alguien cree el primero, aparece acá.
            </p>
          ) : (
            <div className="home-projects-row">
              {recentProjects.map((project) => (
                <div className="glass-panel home-project-card" key={project.id}>
                  {project.status === 'published' && <Seal className="home-seal" />}
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
          <div className={`home-quote-content${fading ? ' home-quote-content--fading' : ''}`}>
            <span className="home-quote-mark" aria-hidden="true">
              "
            </span>
            <p>{QUOTES[quoteIndex].text}</p>
            <span className="home-quote-author">— {QUOTES[quoteIndex].author}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
