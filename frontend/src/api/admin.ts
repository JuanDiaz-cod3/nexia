import { apiFetch } from './client'

export interface StudentGroupStudentInput {
  full_name: string
  email: string
  // Por estudiante, no por grupo: un grupo de proyecto puede mezclar
  // integrantes de secciones distintas (ej. 11°A y 11°B).
  section_name: string
}

export interface StudentGroupCreateInput {
  students: StudentGroupStudentInput[]
}

export interface StudentGroupStudentOut {
  id: number
  full_name: string
  username: string
  email: string
  section_name: string
  // Unica vez que este valor viaja del backend - no hay forma de volver a
  // pedirlo despues (se guarda hasheado, no en texto plano).
  temporary_password: string
}

export interface StudentGroupCreateOut {
  group_id: number
  // Seccion de referencia del grupo (la del primer estudiante de la lista)
  // - no implica que todos los integrantes pertenezcan a ella, ver
  // StudentGroupStudentOut.section_name para la seccion real de cada quien.
  section_id: number
  section_name: string
  students: StudentGroupStudentOut[]
}

export interface SectionOut {
  id: number
  name: string
}

export interface StudentGroupMemberOut {
  id: number
  full_name: string
  username: string
  email: string
}

export interface StudentGroupOut {
  id: number
  section_id: number
  section_name: string
  students: StudentGroupMemberOut[]
}

export interface StudentSearchResultOut {
  id: number
  full_name: string
  username: string
  email: string
  already_in_group: boolean
}

export interface AddGroupMembersInput {
  new_students: StudentGroupStudentInput[]
  existing_student_ids: number[]
}

export interface AddGroupMembersOut {
  group_id: number
  section_id: number
  section_name: string
  added_new: StudentGroupStudentOut[]
  added_existing: StudentGroupMemberOut[]
}

export function createStudentGroup(input: StudentGroupCreateInput): Promise<StudentGroupCreateOut> {
  return apiFetch<StudentGroupCreateOut>('/admin/student-groups', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function listSections(): Promise<SectionOut[]> {
  return apiFetch<SectionOut[]>('/admin/sections')
}

export function listStudentGroups(sectionId: number): Promise<StudentGroupOut[]> {
  return apiFetch<StudentGroupOut[]>(`/admin/student-groups?section_id=${sectionId}`)
}

export function searchStudents(query: string): Promise<StudentSearchResultOut[]> {
  return apiFetch<StudentSearchResultOut[]>(`/admin/students/search?q=${encodeURIComponent(query)}`)
}

export function addGroupMembers(
  groupId: number,
  input: AddGroupMembersInput,
): Promise<AddGroupMembersOut> {
  return apiFetch<AddGroupMembersOut>(`/admin/student-groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
