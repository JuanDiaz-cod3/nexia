import { forwardRef, type HTMLAttributes } from 'react'
import './Card.css'

// forwardRef: ProjectsPage necesita mover el foco a una tarjeta que acaba
// de convertirse en formulario (ver editCardRef) - sin esto un lector de
// pantalla no se entera de que el contenido bajo el cursor cambio.
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...rest }, ref) {
    const classes = ['card', className].filter(Boolean).join(' ')

    return <div ref={ref} className={classes} {...rest} />
  },
)
