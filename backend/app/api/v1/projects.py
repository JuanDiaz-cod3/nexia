from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_password_changed
from app.db.session import get_db
from app.models import AcademicYear, Project, ProjectMember, User
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter()


def _get_current_academic_year(db: Session, school_id: int) -> AcademicYear:
    # Fase actual: un solo año academico sembrado por colegio, tomamos el
    # mas reciente. Cuando exista gestion real de años academicos, esto se
    # reemplaza por una consulta al que este marcado como "activo".
    year = (
        db.query(AcademicYear)
        .filter_by(school_id=school_id)
        .order_by(AcademicYear.id.desc())
        .first()
    )
    if year is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "detail": "El colegio no tiene un año académico configurado",
                "code": "no_academic_year",
            },
        )
    return year


@router.get("/projects", response_model=list[ProjectOut])
def list_projects(
    current_user: User = Depends(require_password_changed),
    db: Session = Depends(get_db),
) -> list[Project]:
    return (
        db.query(Project)
        .filter_by(school_id=current_user.school_id)
        .order_by(Project.created_at.desc())
        .all()
    )


@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    current_user: User = Depends(require_password_changed),
    db: Session = Depends(get_db),
) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.school_id != current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Proyecto no encontrado", "code": "not_found"},
        )
    return project


@router.post("/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(require_password_changed),
    db: Session = Depends(get_db),
) -> Project:
    academic_year = _get_current_academic_year(db, current_user.school_id)

    project = Project(
        school_id=current_user.school_id,
        academic_year_id=academic_year.id,
        title=payload.title,
        category=payload.category,
        summary=payload.summary,
    )
    db.add(project)
    db.flush()  # asigna project.id antes de crear la membresia

    db.add(
        ProjectMember(
            project_id=project.id,
            user_id=current_user.id,
            academic_year_id=academic_year.id,
        )
    )

    try:
        db.commit()
    except IntegrityError:
        # Dispara el UNIQUE(user_id, academic_year_id) de project_members:
        # el usuario ya pertenece a otro proyecto este año academico.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "detail": "Ya perteneces a un proyecto en este año académico",
                "code": "already_in_project",
            },
        )

    db.refresh(project)
    return project


@router.patch("/projects/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    current_user: User = Depends(require_password_changed),
    db: Session = Depends(get_db),
) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.school_id != current_user.school_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Proyecto no encontrado", "code": "not_found"},
        )

    # Regla de negocio: cualquier integrante puede editar, no hay "dueño".
    is_member = any(member.id == current_user.id for member in project.members)
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"detail": "No eres integrante de este proyecto", "code": "not_a_member"},
        )

    # exclude_unset: solo mira los campos que el cliente realmente mando en
    # el body, para no pisar los demas con None por accidente.
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project
