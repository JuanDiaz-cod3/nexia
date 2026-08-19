import logging
import secrets

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import is_admin, require_password_changed
from app.core import storage
from app.db.session import get_db
from app.models import Document, Project, User
from app.schemas.document import DocumentOut

logger = logging.getLogger("innovalab.documents")

router = APIRouter()

# CWE-434 (Unrestricted Upload): allowlist por content-type, no por
# extension del nombre de archivo (el cliente puede mentir sobre el
# nombre, el content-type que declara el navegador al armar el
# multipart es lo que se valida aca).
ALLOWED_CONTENT_TYPES = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
}
MAX_SIZE_BYTES = 25 * 1024 * 1024


def _project_or_404(db: Session, project_id: int, school_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.school_id != school_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Proyecto no encontrado", "code": "not_found"},
        )
    return project


def _require_member_or_admin(project: Project, user: User) -> None:
    # Mismo criterio que PATCH/DELETE /projects/{id}: cualquier integrante,
    # o el admin sobre cualquier proyecto del colegio (ver CLAUDE.md).
    is_member = any(member.id == user.id for member in project.members)
    if not is_member and not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"detail": "No eres integrante de este proyecto", "code": "not_a_member"},
        )


def _to_out(document: Document) -> DocumentOut:
    return DocumentOut(
        id=document.id,
        file_name=document.file_name,
        file_type=document.file_type,
        size_bytes=document.size_bytes,
        uploaded_at=document.uploaded_at,
        url=storage.public_url(document.storage_path),
    )


# Publico, sin auth - mismo criterio que GET /projects (ver CLAUDE.md: el
# archivo de investigacion del colegio esta abierto a todo el mundo).
@router.get("/projects/{project_id}/documents", response_model=list[DocumentOut])
def list_documents(project_id: int, db: Session = Depends(get_db)) -> list[DocumentOut]:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Proyecto no encontrado", "code": "not_found"},
        )
    documents = (
        db.query(Document)
        .filter_by(project_id=project_id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )
    return [_to_out(d) for d in documents]


@router.post(
    "/projects/{project_id}/documents",
    response_model=DocumentOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_password_changed),
    db: Session = Depends(get_db),
) -> DocumentOut:
    project = _project_or_404(db, project_id, current_user.school_id)
    _require_member_or_admin(project, current_user)

    content_type = file.content_type or ""
    extension = ALLOWED_CONTENT_TYPES.get(content_type)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "detail": "Tipo de archivo no permitido (solo PDF, Word o PowerPoint)",
                "code": "invalid_file_type",
            },
        )

    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "El archivo supera el máximo de 25MB", "code": "file_too_large"},
        )

    # Nombre unico en Storage, no el nombre original - evita colisiones y
    # no depende de sanitizar lo que mando el usuario como nombre de archivo.
    storage_path = f"{project_id}/{secrets.token_hex(16)}{extension}"
    storage.upload_file(storage_path, content, content_type)

    document = Document(
        project_id=project_id,
        file_name=file.filename or "documento",
        file_type=content_type,
        size_bytes=len(content),
        storage_path=storage_path,
        uploaded_by=current_user.id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    logger.info(
        "document_uploaded project_id=%s document_id=%s user_id=%s",
        project_id,
        document.id,
        current_user.id,
    )
    return _to_out(document)


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    current_user: User = Depends(require_password_changed),
    db: Session = Depends(get_db),
) -> None:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "Documento no encontrado", "code": "not_found"},
        )

    project = _project_or_404(db, document.project_id, current_user.school_id)
    _require_member_or_admin(project, current_user)

    storage.delete_file(document.storage_path)
    db.delete(document)
    db.commit()
    logger.info(
        "document_deleted project_id=%s document_id=%s user_id=%s",
        document.project_id,
        document_id,
        current_user.id,
    )
