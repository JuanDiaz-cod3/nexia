import { apiFetch } from './client'

export interface LoginResponse {
  // Los tokens ya no viajan en el body - login los manda como cookies
  // httpOnly, invisibles para JS (ver app/core/cookies.py en el backend).
  must_change_password: boolean
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export interface ChangePasswordResponse {
  detail: string
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResponse> {
  return apiFetch<ChangePasswordResponse>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

// JS no puede borrar una cookie httpOnly - logout tiene que ser un pedido
// al backend que la borre desde el servidor (Set-Cookie con Max-Age=0).
export function logout(): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>('/auth/logout', { method: 'POST' })
}
