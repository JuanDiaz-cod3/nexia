import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_academic_year, require_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.models import (
    ProjectMember,
    Role,
    Section,
    StudentGroup,
    StudentGroupMember,
    User,
    UserRole,
)
from app.schemas.admin import (
    AddGroupMembersInput,
    AddGroupMembersOut,
    SectionOut,
    StudentGroupCreate,
    StudentGroupCreateOut,
    StudentGroupMemberOut,
    StudentGroupOut,
    StudentGroupStudentInput,
    StudentGroupStudentOut,
    StudentSearchResultOut,
)

router = APIRouter()

# Sin simbolos ambiguos (0/O, 1/l/I) - el estudiante la va a transcribir a
# mano en el primer login, no vale la pena arriesgar una contraseña
# ilegible por un capricho de entropia extra.
_PASSWORD_ALPHABET = "".join(
    c for c in string.ascii_letters + string.digits if c not in "0O1lI"
)


def _generate_temp_password(length: int = 12) -> str:
    # secrets, no random: son cuentas reales de estudiantes menores de edad,
    # random.choice() es predecible y no corresponde para esto.
    return "".join(secrets.choice(_PASSWORD_ALPHABET) for _ in range(length))


def _unique_username(db: Session, school_id: int, base: str) -> str:
    # username es UNIQUE por colegio (ver User.__table_args__). Si "juan"
    # ya existe, prueba "juan2", "juan3", etc. - simple y visible en la
    # respuesta (el admin ve el username real asignado), no hace falta
    # pedirle al admin que resuelva colisiones a mano.
    candidate = base
    suffix = 1
    while db.query(User).filter_by(school_id=school_id, username=candidate).first() is not None:
        suffix += 1
        candidate = f"{base}{suffix}"
    return candidate


def _find_group_project_id(db: Session, group_id: int, academic_year_id: int) -> int | None:
    # No hay FK directa de project a student_group - se infiere: si CUALQUIER
    # integrante actual del grupo ya es ProjectMember este año, ese es "el
    # proyecto del grupo". Es la misma asuncion que ya usa create_project
    # para el agregado automatico de companeros (un grupo comparte un solo
    # proyecto), solo que aca hace falta encontrarlo en vez de crearlo.
    member_ids = [
        row.user_id
        for row in db.query(StudentGroupMember.user_id).filter_by(group_id=group_id).all()
    ]
    if not member_ids:
        return None
    project_member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.user_id.in_(member_ids),
            ProjectMember.academic_year_id == academic_year_id,
        )
        .first()
    )
    return project_member.project_id if project_member else None


def _get_student_role(db: Session) -> Role:
    role = db.query(Role).filter_by(name="student").first()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"detail": "Falta el rol 'student' en la base de datos", "code": "missing_role"},
        )
    return role


# Se llama ANTES de cualquier lookup a la base (academic_year, rol
# student, etc.) en los dos endpoints que reciben estudiantes nuevos: un
# error de formato es responsabilidad de quien llama (400) y tiene que
# detectarse antes que un problema interno como un rol faltante (500) - si
# se invierte el orden, un correo mal escrito puede terminar reportado como
# error de servidor en vez de error de input.
def _validate_new_students(students: list[StudentGroupStudentInput]) -> None:
    for student in students:
        if "@" not in student.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"detail": f"Correo inválido: {student.email}", "code": "invalid_email"},
            )


# Compartido entre create_student_group y add_group_members: crea N cuentas
# nuevas y las agrega al grupo. No hace commit/rollback - eso lo maneja
# quien llama, para que new_students y existing_student_ids (en
# add_group_members) queden en la misma transaccion atomica. Asume que
# _validate_new_students ya corrio.
def _create_students_in_group(
    db: Session,
    admin: User,
    section: Section,
    group: StudentGroup,
    academic_year_id: int,
    students: list[StudentGroupStudentInput],
    student_role: Role | None,
) -> list[StudentGroupStudentOut]:
    created: list[StudentGroupStudentOut] = []
    for student in students:
        base_username = student.email.split("@", 1)[0]
        username = _unique_username(db, admin.school_id, base_username)
        temp_password = _generate_temp_password()

        user = User(
            school_id=admin.school_id,
            section_id=section.id,
            full_name=student.full_name,
            username=username,
            email=student.email,
            password_hash=hash_password(temp_password),
        )
        db.add(user)
        db.flush()  # asigna user.id antes de crear rol/membresia de grupo

        db.add(UserRole(user_id=user.id, role_id=student_role.id))
        db.add(
            StudentGroupMember(
                group_id=group.id,
                user_id=user.id,
                academic_year_id=academic_year_id,
            )
        )

        created.append(
            StudentGroupStudentOut(
                id=user.id,
                full_name=user.full_name,
                username=user.username,
                email=user.email,
                temporary_password=temp_password,
            )
        )
    return created


@router.get("/admin/sections", response_model=list[SectionOut])
def list_sections(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[Section]:
    academic_year = get_current_academic_year(db, admin.school_id)
    return (
        db.query(Section)
        .filter_by(school_id=admin.school_id, academic_year_id=academic_year.id)
        .order_by(Section.name)
        .all()
    )


@router.get("/admin/student-groups", response_model=list[StudentGroupOut])
def list_student_groups(
    section_id: int | None = Query(default=None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[StudentGroupOut]:
    academic_year = get_current_academic_year(db, admin.school_id)
    query = db.query(StudentGroup).filter_by(
        school_id=admin.school_id, academic_year_id=academic_year.id
    )
    if section_id is not None:
        query = query.filter_by(section_id=section_id)
    groups = query.order_by(StudentGroup.id).all()

    out: list[StudentGroupOut] = []
    for group in groups:
        section = db.get(Section, group.section_id)
        members = (
            db.query(User)
            .join(StudentGroupMember, StudentGroupMember.user_id == User.id)
            .filter(StudentGroupMember.group_id == group.id)
            .all()
        )
        out.append(
            StudentGroupOut(
                id=group.id,
                section_id=group.section_id,
                section_name=section.name if section else "",
                students=[
                    StudentGroupMemberOut(
                        id=m.id, full_name=m.full_name, username=m.username, email=m.email
                    )
                    for m in members
                ],
            )
        )
    return out


@router.get("/admin/students/search", response_model=list[StudentSearchResultOut])
def search_students(
    q: str = Query(min_length=1),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[StudentSearchResultOut]:
    academic_year = get_current_academic_year(db, admin.school_id)
    student_role = _get_student_role(db)

    like = f"%{q}%"
    matches = (
        db.query(User)
        .join(UserRole, UserRole.user_id == User.id)
        .filter(
            User.school_id == admin.school_id,
            UserRole.role_id == student_role.id,
            (User.full_name.ilike(like) | User.username.ilike(like)),
        )
        .order_by(User.full_name)
        .limit(10)
        .all()
    )

    occupied_ids = {
        row.user_id
        for row in db.query(StudentGroupMember.user_id)
        .filter(
            StudentGroupMember.academic_year_id == academic_year.id,
            StudentGroupMember.user_id.in_([m.id for m in matches]),
        )
        .all()
    }

    return [
        StudentSearchResultOut(
            id=m.id,
            full_name=m.full_name,
            username=m.username,
            email=m.email,
            already_in_group=m.id in occupied_ids,
        )
        for m in matches
    ]


@router.post(
    "/admin/student-groups",
    response_model=StudentGroupCreateOut,
    status_code=status.HTTP_201_CREATED,
)
def create_student_group(
    payload: StudentGroupCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> StudentGroupCreateOut:
    if not payload.students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "El grupo necesita al menos un estudiante", "code": "empty_group"},
        )
    _validate_new_students(payload.students)

    academic_year = get_current_academic_year(db, admin.school_id)
    student_role = _get_student_role(db)

    # Todo el bloque en una sola transaccion (a diferencia del agregado de
    # companeros en create_project, que es "best effort" con savepoints):
    # esto lo dispara el admin a proposito, si algo falla es mejor no dejar
    # a medio crear un grupo con 2 de 4 estudiantes.
    try:
        section = (
            db.query(Section)
            .filter_by(
                school_id=admin.school_id,
                academic_year_id=academic_year.id,
                name=payload.section_name,
            )
            .first()
        )
        if section is None:
            section = Section(
                school_id=admin.school_id,
                academic_year_id=academic_year.id,
                name=payload.section_name,
            )
            db.add(section)
            db.flush()

        group = StudentGroup(
            school_id=admin.school_id,
            academic_year_id=academic_year.id,
            section_id=section.id,
        )
        db.add(group)
        db.flush()

        created = _create_students_in_group(
            db, admin, section, group, academic_year.id, payload.students, student_role
        )

        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "detail": "Alguno de los correos ya existe en este colegio",
                "code": "duplicate_student",
            },
        )

    return StudentGroupCreateOut(
        group_id=group.id,
        section_id=section.id,
        section_name=section.name,
        students=created,
    )


@router.post("/admin/student-groups/{group_id}/members", response_model=AddGroupMembersOut)
def add_group_members(
    group_id: int,
    payload: AddGroupMembersInput,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AddGroupMembersOut:
    if not payload.new_students and not payload.existing_student_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "No mandaste ningún estudiante para agregar", "code": "empty_addition"},
        )
    _validate_new_students(payload.new_students)

    group = db.get(StudentGroup, group_id)
    if group is None or group.school_id != admin.school_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Grupo no encontrado", "code": "not_found"},
        )

    # Se valida ANTES de tocar la base (no a mitad del try/commit): si un
    # existing_student_id no existe, no queremos haber creado ya usuarios
    # nuevos que despues haya que descartar. Tambien antes que _get_student_role:
    # ese lookup solo hace falta si hay new_students, y un id invalido es un
    # error del que llama (400), no debería depender de si el rol existe.
    existing_users: list[User] = []
    for user_id in payload.existing_student_ids:
        existing_user = db.get(User, user_id)
        if existing_user is None or existing_user.school_id != admin.school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "detail": f"El estudiante {user_id} no existe en este colegio",
                    "code": "invalid_student",
                },
            )
        existing_users.append(existing_user)

    academic_year = get_current_academic_year(db, admin.school_id)
    section = db.get(Section, group.section_id)
    student_role = _get_student_role(db) if payload.new_students else None
    # Se busca ANTES de agregar a nadie: si el grupo ya tiene un proyecto
    # (alguien ya lo creo desde "Mi Proyecto"), los integrantes nuevos
    # tambien tienen que quedar como ProjectMember de ese proyecto - si no,
    # se agregan al grupo pero el proyecto ya creado nunca se entera de
    # ellos (el hallazgo real de esta ronda de pruebas).
    group_project_id = _find_group_project_id(db, group.id, academic_year.id)

    try:
        added_new = _create_students_in_group(
            db, admin, section, group, academic_year.id, payload.new_students, student_role
        )

        added_existing: list[StudentGroupMemberOut] = []
        for existing_user in existing_users:
            db.add(
                StudentGroupMember(
                    group_id=group.id,
                    user_id=existing_user.id,
                    academic_year_id=academic_year.id,
                )
            )
            db.flush()
            added_existing.append(
                StudentGroupMemberOut(
                    id=existing_user.id,
                    full_name=existing_user.full_name,
                    username=existing_user.username,
                    email=existing_user.email,
                )
            )

        if group_project_id is not None:
            # "Best effort" con savepoints, como el agregado de companeros
            # en create_project: si alguno de los recien agregados ya tiene
            # otro proyecto este año (un "existente" elegido por el admin
            # podria darse el caso), se lo saltea en vez de tumbar toda la
            # operacion de agregar al grupo.
            newly_added_ids = [s.id for s in added_new] + [s.id for s in added_existing]
            for user_id in newly_added_ids:
                try:
                    with db.begin_nested():
                        db.add(
                            ProjectMember(
                                project_id=group_project_id,
                                user_id=user_id,
                                academic_year_id=academic_year.id,
                            )
                        )
                except IntegrityError:
                    continue

        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "detail": "Alguno de los estudiantes ya pertenece a otro grupo este año, o el correo ya existe",
                "code": "duplicate_student",
            },
        )

    return AddGroupMembersOut(
        group_id=group.id,
        section_id=group.section_id,
        section_name=section.name,
        added_new=added_new,
        added_existing=added_existing,
        added_to_project_id=group_project_id,
    )
