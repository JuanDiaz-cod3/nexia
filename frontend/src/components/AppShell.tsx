import type { ReactNode } from 'react'
import { Button } from './Button'
import type { CurrentUser } from '../api/users'
import './AppShell.css'

export type AppPage = 'home' | 'projects' | 'my-project' | 'admin-students'

interface AppShellProps {
  title: string
  activePage: AppPage
  isAuthenticated: boolean
  isAdmin: boolean
  currentUser: CurrentUser | null
  onNavigate: (page: AppPage) => void
  onLogout: () => void
  children: ReactNode
}

// Los items deshabilitados no tienen onClick a proposito: no existe
// pantalla que mostrar todavia. Se van habilitando uno por uno (agregando
// su propio manejador + contenido) a medida que se construyen, en vez de
// levantar toda la navegacion de una sola vez.
export function AppShell({
  title,
  activePage,
  isAuthenticated,
  isAdmin,
  currentUser,
  onNavigate,
  onLogout,
  children,
}: AppShellProps) {
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
          <button
            type="button"
            className={`app-nav-item${activePage === 'my-project' ? ' app-nav-item--active' : ''}`}
            onClick={() => onNavigate('my-project')}
          >
            Mi Proyecto
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`app-nav-item${activePage === 'admin-students' ? ' app-nav-item--active' : ''}`}
              onClick={() => onNavigate('admin-students')}
            >
              Estudiantes
            </button>
          )}

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

        {/* margin-top: auto en .app-sidebar-footer (CSS) empuja esto abajo
            del todo - antes "Cerrar sesión" vivia en el topbar, desentonado
            con el resto del chrome de la app (ver CLAUDE.md, la sidebar es
            el "glass" navy, el topbar es claro). */}
        {isAuthenticated && currentUser && (
          <div className="app-sidebar-footer">
            <div className="app-user-identity">
              <span className="app-user-username">{currentUser.username}</span>
              {currentUser.section_name && (
                <span className="app-user-meta">
                  {currentUser.section_name}
                  {currentUser.group_label ? ` · ${currentUser.group_label}` : ''}
                </span>
              )}
            </div>
            <Button variant="secondary" onClick={onLogout} className="app-logout-btn">
              Cerrar sesión
            </Button>
          </div>
        )}
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <h1>{title}</h1>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
