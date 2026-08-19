import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'
import type { CurrentUser } from '../api/users'
import innovalabLogoHorizontalDark from '../assets/innovalab_logo_horizontal_dark.svg'
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
  // Solo importa por debajo de 640px (ver AppShell.css): en desktop la
  // sidebar sigue siempre visible y este estado no se toca. isNavOpen
  // arranca en false a proposito - el drawer nunca abre solo.
  const [isNavOpen, setIsNavOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  function closeNav() {
    setIsNavOpen(false)
  }

  function handleNavigate(page: AppPage) {
    onNavigate(page)
    closeNav()
  }

  // Foco al abrir/cerrar: sin esto, un usuario de teclado que abre el
  // drawer sigue con el foco atras, en el boton de hamburguesa que quedo
  // tapado por el backdrop - y al cerrar, el foco se pierde en el body en
  // vez de volver a donde estaba. Escape cierra desde cualquier punto del
  // drawer, no solo con el mouse en el backdrop.
  useEffect(() => {
    if (isNavOpen) {
      sidebarRef.current?.focus()
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') closeNav()
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
    toggleRef.current?.focus()
  }, [isNavOpen])

  return (
    <div className="app-shell">
      {/* aria-hidden, no display:none - existe solo para juntar clicks
          "afuera" del drawer en mobile; ver CSS para por que no se
          renderiza (ni intercepta clicks) en desktop. */}
      <div
        className={`app-sidebar-backdrop${isNavOpen ? ' app-sidebar-backdrop--visible' : ''}`}
        aria-hidden="true"
        onClick={closeNav}
      />

      <aside
        id="app-sidebar"
        ref={sidebarRef}
        tabIndex={-1}
        className={`app-sidebar${isNavOpen ? ' app-sidebar--open' : ''}`}
      >
        <div className="app-brand">
          {/* alt="" a proposito: el span de abajo ya dice "InnovaLab" en
              texto - con alt real, un lector de pantalla anunciaria el
              nombre dos veces seguidas. */}
          <img src={innovalabLogoHorizontalDark} alt="" className="app-brand-logo" />
          <span className="app-brand-name">InnovaLab</span>
          <span className="app-brand-sub">Instituto La Salle - Bilingual School Barranquilla</span>
          {/* Solo visible en mobile (ver CSS) - en desktop cerrar no
              significa nada, el drawer no existe como tal. */}
          <button type="button" className="app-sidebar-close" onClick={closeNav}>
            <CloseIcon />
            {/* Texto distinto al del boton de hamburguesa ("Cerrar
                navegación") - con el drawer abierto los dos hacen lo mismo
                y coexisten en pantalla, un mismo nombre accesible para
                ambos seria confuso para quien navega por lector de pantalla. */}
            <span className="sr-only">Cerrar menú</span>
          </button>
        </div>

        <nav className="app-nav" aria-label="Navegación principal">
          <button
            type="button"
            className={`app-nav-item${activePage === 'home' ? ' app-nav-item--active' : ''}`}
            aria-current={activePage === 'home' ? 'page' : undefined}
            onClick={() => handleNavigate('home')}
          >
            Inicio
          </button>
          <button
            type="button"
            className={`app-nav-item${activePage === 'projects' ? ' app-nav-item--active' : ''}`}
            aria-current={activePage === 'projects' ? 'page' : undefined}
            onClick={() => handleNavigate('projects')}
          >
            Proyectos
          </button>
          <button
            type="button"
            className={`app-nav-item${activePage === 'my-project' ? ' app-nav-item--active' : ''}`}
            aria-current={activePage === 'my-project' ? 'page' : undefined}
            onClick={() => handleNavigate('my-project')}
          >
            Mi Proyecto
          </button>

          {isAdmin && (
            <button
              type="button"
              className={`app-nav-item${activePage === 'admin-students' ? ' app-nav-item--active' : ''}`}
              aria-current={activePage === 'admin-students' ? 'page' : undefined}
              onClick={() => handleNavigate('admin-students')}
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

        {/* Sin esto, un visitante sin sesion no tiene ninguna forma visible
            de llegar al login - antes solo se llegaba de rebote, pinchando
            un item de nav protegido ("Mi Proyecto"). Reutiliza esa misma
            navegacion protegida en vez de agregar una ruta nueva. */}
        {!isAuthenticated && (
          <div className="app-sidebar-footer">
            <Button variant="secondary" onClick={() => handleNavigate('my-project')} className="app-login-btn">
              Iniciar sesión
            </Button>
          </div>
        )}
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          {/* Solo visible en mobile (ver CSS) - en desktop la sidebar ya
              esta siempre a la vista, no hace falta un boton para abrirla. */}
          <button
            type="button"
            ref={toggleRef}
            className="app-nav-toggle"
            aria-expanded={isNavOpen}
            aria-controls="app-sidebar"
            onClick={() => setIsNavOpen((open) => !open)}
          >
            <HamburgerIcon open={isNavOpen} />
            <span className="sr-only">{isNavOpen ? 'Cerrar navegación' : 'Abrir navegación'}</span>
          </button>
          <h1>{title}</h1>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}

// Tres barras que se funden en una X - un solo gesto de motion autorizado
// (ver craft-floor), no un glifo unicode haciendo de icono.
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span className={`app-nav-toggle-icon${open ? ' app-nav-toggle-icon--open' : ''}`} aria-hidden="true">
      <span className="app-nav-toggle-bar" />
      <span className="app-nav-toggle-bar" />
      <span className="app-nav-toggle-bar" />
    </span>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="app-sidebar-close-icon" aria-hidden="true">
      <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
