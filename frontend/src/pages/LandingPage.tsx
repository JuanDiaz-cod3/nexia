import { Button } from '../components/Button'
import './LandingPage.css'

interface LandingPageProps {
  onEnter: () => void
}

// Puerta publica del sitio: nadie necesita cuenta para llegar hasta aca. El
// sello y el wordmark van con los colores institucionales normales (navy/
// dorado, ver landing-mark-ring--accent/primary y landing-mark-ink en el
// CSS) - lo que se funde con el fondo de la pagina es el lienzo del SVG en
// si (no tiene rect propio de fondo, queda transparente), no el color de la
// marca.
export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <svg
          className="landing-mark"
          viewBox="90 120 620 420"
          role="img"
          aria-labelledby="landing-mark-title"
        >
          <title id="landing-mark-title">InnovaLab</title>
          <circle
            cx="400"
            cy="290"
            r="128"
            fill="none"
            className="landing-mark-ring landing-mark-ring--accent"
            strokeWidth="30"
          />
          <circle
            cx="400"
            cy="290"
            r="88"
            fill="none"
            className="landing-mark-ring landing-mark-ring--primary"
            strokeWidth="3"
          />
          <text x="400" y="305" textAnchor="middle" className="landing-mark-seal landing-mark-ink" fontSize="46">
            IL
          </text>
          <text x="215" y="298" textAnchor="end" className="landing-mark-label landing-mark-ink" fontSize="24">
            EST.
          </text>
          <text x="585" y="298" textAnchor="start" className="landing-mark-label landing-mark-ink" fontSize="24">
            2026
          </text>
          <text
            x="400"
            y="500"
            textAnchor="middle"
            className="landing-mark-wordmark landing-mark-ink"
            fontSize="76"
          >
            INNOVALAB
          </text>
        </svg>

        <p className="landing-tagline">Investigación que permanece</p>

        <Button className="landing-enter" onClick={onEnter}>
          Entrar
        </Button>
      </div>

      <span className="landing-archive-code" aria-hidden="true">
        INSTITUTO LA SALLE · ARCHIVO DE INVESTIGACIÓN
      </span>
    </div>
  )
}
