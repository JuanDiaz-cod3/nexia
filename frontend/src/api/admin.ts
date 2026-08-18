import { apiFetch } from './client'

export interface StudentGroupStudentInput {
  full_name: string
  email: string
}

export interface StudentGroupCreateInput {
  section_name: string
  students: StudentGroupStudentInput[]
}

export interface StudentGroupStudentOut {
  id: number
  full_name: string
  username: string
  email: string
  // Unica vez que este valor viaja del backend - no hay forma de volver a
  // pedirlo despues (se guarda hasheado, no en texto plano).
  temporary_password: string
}

export interface StudentGroupCreateOut {
  group_id: number
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

export function createStudentGroup(
  token: string,
  input: StudentGroupCreateInput,
): Promise<StudentGroupCreateOut> {
  return apiFetch<StudentGroupCreateOut>('/admin/student-groups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
}

export function listSections(token: string): Promise<SectionOut[]> {
  return apiFetch<SectionOut[]>('/admin/sections', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function listStudentGroups(token: string, sectionId: number): Promise<StudentGroupOut[]> {
  return apiFetch<StudentGroupOut[]>(`/admin/student-groups?section_id=${sectionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function searchStudents(token: string, query: string): Promise<StudentSearchResultOut[]> {
  return apiFetch<StudentSearchResultOut[]>(
    `/admin/students/search?q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
}

export function addGroupMembers(
  token: string,
  groupId: number,
  input: AddGroupMembersInput,
): Promise<AddGroupMembersOut> {
  return apiFetch<AddGroupMembersOut>(`/admin/student-groups/${groupId}/members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  })
}
