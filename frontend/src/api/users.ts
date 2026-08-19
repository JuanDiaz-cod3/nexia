import { apiFetch } from './client'

export interface CurrentUser {
  id: number
  full_name: string
  username: string
  email: string
  account_type: string
  must_change_password: boolean
  roles: string[]
  // null para admin/teacher/judge, o un estudiante que todavia no tiene
  // seccion/grupo asignado (ver users.py en el backend).
  section_name: string | null
  group_label: string | null
}

export function getCurrentUser(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/users/me')
}
