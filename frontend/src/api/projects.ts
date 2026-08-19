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
  advisor: ProjectMember | null
}

export interface ProjectCreateInput {
  title: string
  category?: string
  summary?: string
}

export interface ProjectUpdateInput {
  title?: string
  // null (no undefined) borra el campo a proposito: a diferencia de crear,
  // en editar el formulario siempre manda los tres campos, asi que "vacio"
  // debe viajar como null explicito o el backend lo interpreta como "no
  // tocar este campo" (PATCH con exclude_unset) y deja el valor anterior.
  category?: string | null
  summary?: string | null
}

// /projects es publico (ver CLAUDE.md): se llama igual con o sin sesion
// iniciada. Si hay una cookie de sesion, el navegador la manda solo.
export function listProjects(): Promise<Project[]> {
  return apiFetch<Project[]>('/projects')
}

export function createProject(input: ProjectCreateInput): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateProject(projectId: number, input: ProjectUpdateInput): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteProject(projectId: number): Promise<void> {
  return apiFetch<void>(`/projects/${projectId}`, { method: 'DELETE' })
}
