import { apiFetch } from './client'

export interface CurrentUser {
  id: number
  full_name: string
  username: string
  email: string
  account_type: string
  must_change_password: boolean
}

export function getCurrentUser(token: string): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}
