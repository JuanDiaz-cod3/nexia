import { apiFetch } from './client'

export interface ProjectMember {
  id: number
  full_name: string
  username: string
}

export interface Project {
  id: number
  title: string
  category: string | null
  summary: string | null
  status: string
  created_at: string
  members: ProjectMember[]
}

export function listProjects(token: string): Promise<Project[]> {
  return apiFetch<Project[]>('/projects', {
    headers: { Authorization: `Bearer ${token}` },
  })
}
