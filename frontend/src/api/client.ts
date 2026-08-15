// Wrapper sobre fetch: centraliza la URL base y traduce los errores del
// backend ({"detail", "code"}) a un tipo de error de TypeScript util.

const API_URL = import.meta.env.VITE_API_URL

// Clase propia que extiende Error: ademas del mensaje, carga el "code"
// que manda el backend (ej. "invalid_credentials"), para que quien
// atrape el error pueda decidir logica distinta segun el codigo, no
// solo mostrar el texto.
export class ApiError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(data.detail ?? 'Error inesperado', data.code ?? 'unknown_error', response.status)
  }

  return data as T
}
