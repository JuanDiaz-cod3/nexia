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

// Sin token: /projects es publico (ver CLAUDE.md). Se acepta null/undefined
// para las pantallas que se muestran sin sesion (Inicio, Proyectos) - si hay
// token igual se manda, pero el backend no lo exige.
export function listProjects(token?: string | null): Promise<Project[]> {
  return apiFetch<Project[]>('/projects', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export function createProject(token: string, input: ProjectCreateInput): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
}

export function updateProject(
  token: string,
  projectId: number,
  input: ProjectUpdateInput,
): Promise<Project> {
  return apiFetch<Project>(`/projects/${projectId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
}

export function deleteProject(token: string, projectId: number): Promise<void> {
  return apiFetch<void>(`/projects/${projectId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
