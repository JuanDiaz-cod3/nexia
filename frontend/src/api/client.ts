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

type SessionExpiredHandler = () => void
let sessionExpiredHandler: SessionExpiredHandler | null = null

// App.tsx se suscribe una vez al montar. Si el refresh token tambien esta
// vencido/invalido, este es el unico aviso de "la sesion se termino de
// verdad" que puede llegar hasta el estado de React - este modulo no tiene
// forma de tocar setState directamente.
export function onSessionExpired(handler: SessionExpiredHandler): void {
  sessionExpiredHandler = handler
}

async function refreshAccessToken(): Promise<void> {
  // El refresh token viaja como cookie httpOnly - el navegador la manda
  // solo, no hay nada que leer ni mandar a mano aca. La respuesta tampoco
  // trae nada que guardar: el nuevo access token llega como Set-Cookie.
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('refresh_failed')
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  // 204 No Content no trae body - leerlo como JSON explotaria con
  // "Unexpected end of JSON input". DELETE devuelve 204, entre otros.
  if (response.status === 204) {
    if (!response.ok) {
      throw new ApiError('Error inesperado', 'unknown_error', response.status)
    }
    return undefined as T
  }

  const data = await response.json()
  if (!response.ok) {
    throw new ApiError(data.detail ?? 'Error inesperado', data.code ?? 'unknown_error', response.status)
  }
  return data as T
}

async function fetchWithRefresh<T>(
  path: string,
  options: RequestInit,
  isRetry: boolean,
): Promise<T> {
  // FormData (subida de documentos): el navegador tiene que poner su
  // propio Content-Type con el boundary del multipart - si lo forzamos a
  // application/json aca, el backend no puede parsear el body.
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  })

  // El access token vencio: intentamos refrescarlo en silencio y repetir
  // el pedido original una sola vez (isRetry evita un loop si el token
  // nuevo tambien fuera rechazado). Solo aplica al codigo especifico que
  // manda el backend para token invalido/vencido - un 401 de login con
  // credenciales malas (code "invalid_credentials") no debe disparar esto.
  if (response.status === 401 && !isRetry) {
    const body = await response.clone().json().catch(() => null)
    if (body?.code === 'invalid_token') {
      try {
        await refreshAccessToken()
        return fetchWithRefresh<T>(path, options, true)
      } catch {
        sessionExpiredHandler?.()
        throw new ApiError('Tu sesión expiró, inicia sesión de nuevo.', 'session_expired', 401)
      }
    }
  }

  return parseResponse<T>(response)
}

export function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return fetchWithRefresh<T>(path, options, false)
}
