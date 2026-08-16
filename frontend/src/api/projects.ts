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

export interface ProjectCreateInput {
  title: string
  category?: string
  summary?: string
}

export function listProjects(token: string): Promise<Project[]> {
  return apiFetch<Project[]>('/projects', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function createProject(token: string, input: ProjectCreateInput): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
}
