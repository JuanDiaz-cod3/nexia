import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, onSessionExpired } from './client'

// Helper: arma un objeto Response falso con lo minimo que fetchWithRefresh
// necesita (status, ok, json(), y clone() porque el interceptor de 401
// clona la response para leer el body sin "gastarlo").
function fakeResponse(status: number, body: unknown): Response {
  const response = {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response
  response.clone = () => fakeResponse(status, body)
  return response
}

describe('apiFetch', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('devuelve el body cuando la respuesta es exitosa', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(fakeResponse(200, { id: 1, name: 'Proyecto X' }))

    const result = await apiFetch<{ id: number; name: string }>('/projects/1')

    expect(result).toEqual({ id: 1, name: 'Proyecto X' })
  })

  it('lanza ApiError con el code y mensaje del backend en un error que no es 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      fakeResponse(404, { detail: 'Proyecto no encontrado', code: 'not_found' }),
    )

    await expect(apiFetch('/projects/999')).rejects.toMatchObject({
      message: 'Proyecto no encontrado',
      code: 'not_found',
      status: 404,
    })
  })

  it('no intenta parsear JSON en un 204 No Content', async () => {
    const response = fakeResponse(204, null)
    // Un 204 real no trae body - si el codigo llamara a response.json() acá
    // explotaria. Lo dejamos undefined para confirmar que nadie lo llama.
    response.json = async () => {
      throw new Error('no debería leer el body de un 204')
    }
    vi.mocked(fetch).mockResolvedValueOnce(response)

    const result = await apiFetch('/projects/1')

    expect(result).toBeUndefined()
  })

  it('en un 401 con code invalid_token, refresca en silencio y reintenta una vez', async () => {
    localStorage.setItem('refresh_token', 'refresh-viejo-valido')

    vi.mocked(fetch)
      // 1er intento del pedido original: access token vencido.
      .mockResolvedValueOnce(fakeResponse(401, { detail: 'Token inválido o vencido', code: 'invalid_token' }))
      // POST /auth/refresh: devuelve un access token nuevo.
      .mockResolvedValueOnce(fakeResponse(200, { access_token: 'access-nuevo' }))
      // reintento del pedido original, ahora con el token nuevo: éxito.
      .mockResolvedValueOnce(fakeResponse(200, { id: 1 }))

    const result = await apiFetch<{ id: number }>('/projects/1')

    expect(result).toEqual({ id: 1 })
    expect(localStorage.getItem('access_token')).toBe('access-nuevo')

    // El reintento tiene que llevar el Authorization con el token nuevo.
    const retryCall = vi.mocked(fetch).mock.calls[2]
    expect(retryCall[1]?.headers).toMatchObject({ Authorization: 'Bearer access-nuevo' })
  })

  it('si el refresh también falla, limpia localStorage y avisa sessionExpired', async () => {
    localStorage.setItem('access_token', 'access-viejo')
    localStorage.setItem('refresh_token', 'refresh-vencido')

    const handler = vi.fn()
    onSessionExpired(handler)

    vi.mocked(fetch)
      .mockResolvedValueOnce(fakeResponse(401, { detail: 'Token inválido o vencido', code: 'invalid_token' }))
      // POST /auth/refresh también falla (refresh token vencido).
      .mockResolvedValueOnce(fakeResponse(401, { detail: 'Refresh token inválido o vencido', code: 'invalid_refresh_token' }))

    await expect(apiFetch('/projects/1')).rejects.toMatchObject({
      code: 'session_expired',
    })

    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(handler).toHaveBeenCalledOnce()
  })

  it('un 401 con otro code (ej. invalid_credentials) no dispara el refresh', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      fakeResponse(401, { detail: 'Usuario o contraseña incorrectos', code: 'invalid_credentials' }),
    )

    await expect(apiFetch('/auth/login')).rejects.toMatchObject({
      code: 'invalid_credentials',
    })

    // Un solo llamado a fetch: nunca intento refrescar ni reintentar.
    expect(fetch).toHaveBeenCalledOnce()
  })
})
