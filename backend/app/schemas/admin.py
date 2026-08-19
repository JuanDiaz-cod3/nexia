from pydantic import BaseModel


class StudentGroupStudentInput(BaseModel):
    full_name: str
    email: str
    # "11°A" - se crea sola la primera vez que se usa (ver
    # _create_students_in_group). Por estudiante, no por grupo: un grupo de
    # proyecto puede mezclar integrantes de secciones distintas.
    section_name: str


class StudentGroupCreate(BaseModel):
    students: list[StudentGroupStudentInput]


class StudentGroupStudentOut(BaseModel):
    id: int
    full_name: str
    username: str
    email: str
    section_name: str
    # Unica vez que este valor existe en texto plano - la respuesta de este
    # endpoint es la unica oportunidad de verlo, nunca se guarda asi.
    temporary_password: str


class StudentGroupCreateOut(BaseModel):
    group_id: int
    # Seccion de referencia del grupo (la del primer estudiante de la
    # lista) - organiza la navegacion del admin (GET /admin/student-groups
    # ?section_id=, el label "Grupo N"), no implica que todos los
    # integrantes pertenezcan a ella. La seccion real de cada quien esta en
    # StudentGroupStudentOut.section_name.
    section_id: int
    section_name: str
    students: list[StudentGroupStudentOut]


class SectionOut(BaseModel):
    id: int
    name: str


class StudentGroupMemberOut(BaseModel):
    id: int
    full_name: str
    username: str
    email: str


class StudentGroupOut(BaseModel):
    id: int
    # Seccion de referencia (ver StudentGroupCreateOut) - no vinculante.
    section_id: int
    section_name: str
    students: list[StudentGroupMemberOut]


class StudentSearchResultOut(BaseModel):
    id: int
    full_name: str
    username: str
    email: str
    # None si el estudiante no pertenece a ningun grupo/proyecto este año -
    # el admin lo ve antes de elegirlo, para no intentar agregar a alguien
    # que ya esta ocupado (igual queda validado en el backend si lo intenta).
    already_in_group: bool


class AddGroupMembersInput(BaseModel):
    new_students: list[StudentGroupStudentInput] = []
    existing_student_ids: list[int] = []


class AddGroupMembersOut(BaseModel):
    group_id: int
    # Seccion de referencia del grupo (ver StudentGroupCreateOut) - no cambia
    # al agregar integrantes nuevos, aunque sean de otra seccion.
    section_id: int
    section_name: str
    added_new: list[StudentGroupStudentOut]
    added_existing: list[StudentGroupMemberOut]
    # None si el grupo todavia no tiene proyecto (nadie lo creo desde "Mi
    # Proyecto" todavia) - en ese caso los recien agregados solo quedan en
    # el grupo, no en ningun proyecto (no hay ninguno que agregarlos).
    added_to_project_id: int | None
