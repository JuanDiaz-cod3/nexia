from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_academic_year, require_password_changed
from app.db.session import get_db
from app.models import Section, StudentGroup, StudentGroupMember, User
from app.schemas.user import UserOut

router = APIRouter()


def _compute_group_label(db: Session, user: User, academic_year_id: int) -> str | None:
    membership = (
        db.query(StudentGroupMember)
        .filter_by(user_id=user.id, academic_year_id=academic_year_id)
        .first()
    )
    if membership is None:
        return None
    group = db.get(StudentGroup, membership.group_id)
    if group is None:
        return None

    # Mismo numero que ya usa la pantalla de admin (ver AdminStudentsPage.tsx):
    # posicion del grupo dentro de su seccion, no el id global entre todas
    # las secciones (eso mostraba "Grupo 5" en la primera seccion que se usa).
    section_groups = (
        db.query(StudentGroup)
        .filter_by(
            school_id=group.school_id,
            academic_year_id=academic_year_id,
            section_id=group.section_id,
        )
        .order_by(StudentGroup.id)
        .all()
    )
    index = next((i for i, g in enumerate(section_groups) if g.id == group.id), None)
    if index is None:
        return None
    return f"Grupo {index + 1}"


@router.get("/users/me", response_model=UserOut)
def read_current_user(
    user: User = Depends(require_password_changed),
    db: Session = Depends(get_db),
) -> UserOut:
    section = db.get(Section, user.section_id) if user.section_id is not None else None
    group_label = None
    if user.section_id is not None:
        academic_year = get_current_academic_year(db, user.school_id)
        group_label = _compute_group_label(db, user, academic_year.id)

    # Construido a mano en vez de "return user": UserOut.roles es list[str]
    # (nombres), pero user.roles trae objetos Role - no hay mapeo automatico
    # de uno a otro via from_attributes.
    return UserOut(
        id=user.id,
        full_name=user.full_name,
        username=user.username,
        email=user.email,
        account_type=user.account_type,
        must_change_password=user.must_change_password,
        roles=[role.name for role in user.roles],
        section_name=section.name if section else None,
        group_label=group_label,
    )
