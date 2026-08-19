import './Spinner.css'

interface SpinnerProps {
  label?: string
  size?: 'default' | 'small'
}

export function Spinner({ label = 'Cargando...', size = 'default' }: SpinnerProps) {
  return (
    <div
      className={`spinner-container${size === 'small' ? ' spinner-container--small' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="spinner-box"></div>
      <span className="spinner-label">{label}</span>
    </div>
  )
}


// Tres anillos concentricos girando, colores de la paleta del sitio (navy +
// acento amber, sin tercer color - ver DESIGN.md). role="status" + el label
// oculto visualmente (.sr-only): un lector de pantalla anuncia que hay,
// pero no que dice, cargando - sin esto un spinner puramente visual no le
// dice nada a quien no lo ve.
