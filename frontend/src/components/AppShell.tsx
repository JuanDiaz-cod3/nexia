import type { ReactNode } from 'react'
import { Button } from './Button'
import './AppShell.css'

export type AppPage = 'home' | 'projects'

interface AppShellProps {
  title: string
  activePage: AppPage
  onNavigate: (page: AppPage) => void
  onLogout: () => void
  children: ReactNode
}

// Los items deshabilitados no tienen onClick a proposito: no existe
// pantalla que mostrar todavia. Se van habilitando uno por uno (agregando
// su propio manejador + contenido) a medida que se construyen, en vez de
// levantar toda la navegacion de una sola vez.
export function AppShell({ title, activePage, onNavigate, onLogout, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <span className="app-brand-name">InnovaLab</span>
          <span className="app-brand-sub">Instituto La Salle - Bilingual School Barranquilla</span>
        </div>

        <nav className="app-nav" aria-label="Navegación principal">
          <button
            type="button"
            className={`app-nav-item${activePage === 'home' ? ' app-nav-item--active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            Inicio
          </button>
          <button
            type="button"
            className={`app-nav-item${activePage === 'projects' ? ' app-nav-item--active' : ''}`}
            onClick={() => onNavigate('projects')}
          >
            Proyectos
          </button>
          <span className="app-nav-item app-nav-item--disabled" aria-disabled="true">
            Estudiantes
          </span>

          <span className="app-nav-label">Fuera de alcance actual</span>
          <span className="app-nav-item app-nav-item--disabled" aria-disabled="true">
            Evaluaciones
          </span>
          <span className="app-nav-item app-nav-item--disabled" aria-disabled="true">
            Jurados
          </span>
          <span className="app-nav-item app-nav-item--disabled" aria-disabled="true">
            Premios
          </span>
          <span className="app-nav-item app-nav-item--disabled" aria-disabled="true">
            Reportes
          </span>

          <span className="app-nav-label">Siempre disponible</span>
          <span className="app-nav-item app-nav-item--disabled" aria-disabled="true">
            Archivo histórico
          </span>
          <span className="app-nav-item app-nav-item--disabled" aria-disabled="true">
            Configuración
          </span>
        </nav>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <h1>{title}</h1>
          <Button variant="secondary" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
