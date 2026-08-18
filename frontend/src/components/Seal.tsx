import './Seal.css'

interface SealProps {
  className?: string
}

// Version reducida del sello de LandingPage.tsx (mismos dos anillos +
// monograma "IL"), para usar donde antes habia un "✓" generico. CLAUDE.md
// es explicito: el sello "reemplaza cualquier icono generico de check/
// palomita" en projects con status published - un checkmark ahi era
// justo el error que esa regla existe para evitar.
export function Seal({ className }: SealProps) {
  const classes = ['seal', className].filter(Boolean).join(' ')

  return (
    <svg viewBox="0 0 100 100" className={classes} role="img" aria-label="Proyecto publicado">
      <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" className="seal-ring seal-ring--accent" />
      <circle cx="50" cy="50" r="28" fill="none" strokeWidth="2" className="seal-ring seal-ring--primary" />
      <text x="50" y="58" textAnchor="middle" fontSize="24" className="seal-ink">
        IL
      </text>
    </svg>
  )
}
