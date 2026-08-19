from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    # CASCADE: si se borra el proyecto, sus documentos van con el - mismo
    # patron que project_members hacia projects (ver PROGRESS.md).
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    # Nombre original que subio el usuario (para mostrar) - no es el nombre
    # real en Storage, ver storage_path.
    file_name: Mapped[str] = mapped_column(nullable=False)
    file_type: Mapped[str] = mapped_column(nullable=False)
    size_bytes: Mapped[int] = mapped_column(nullable=False)
    # Nombre generado (project_id/token_hex + extension, ver documents.py) -
    # unico, no depende de sanitizar el nombre que mando el usuario.
    storage_path: Mapped[str] = mapped_column(nullable=False, unique=True)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
