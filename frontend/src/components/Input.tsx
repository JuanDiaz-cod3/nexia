import { useId, useState, type InputHTMLAttributes } from 'react'
import './Input.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, id, className, type, ...rest }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const classes = ['input', className].filter(Boolean).join(' ')

  // Toggle de "mostrar contraseña" - solo aplica cuando el campo es de
  // password. El estado vive aca (no en cada pantalla que use Input) para
  // que cualquier campo de contraseña futuro lo herede gratis.
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="input-group">
      {label && (
        <label className="input-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      {isPassword ? (
        <div className="input-password-wrap">
          <input
            id={inputId}
            type={visible ? 'text' : 'password'}
            className={`${classes} input--has-toggle`}
            {...rest}
          />
          <button
            type="button"
            className="input-password-toggle"
            onClick={() => setVisible((prev) => !prev)}
            aria-pressed={visible}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      ) : (
        <input id={inputId} type={type} className={classes} {...rest} />
      )}
    </div>
  )
}
