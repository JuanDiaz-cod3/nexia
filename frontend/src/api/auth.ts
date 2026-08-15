import { apiFetch } from './client'

export interface LoginResponse {
  access_token: string
  token_type: string
  must_change_password: boolean
}

export function login(username: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}
