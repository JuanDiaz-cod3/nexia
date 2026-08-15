from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.user import User


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id"), nullable=False
    )
    advisor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(nullable=False)
    category: Mapped[str | None] = mapped_column()
    summary: Mapped[str | None] = mapped_column(Text())
    status: Mapped[str] = mapped_column(nullable=False, server_default=text("'draft'"))
    publication_consent: Mapped[bool] = mapped_column(
        nullable=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relacion muchos-a-muchos via la tabla project_members. viewonly=True
    # porque para CREAR una membresia tambien necesitamos academic_year_id
    # (que vive en project_members, no en users ni projects) - esas
    # inserciones se siguen haciendo a mano con el modelo ProjectMember.
    # Esta relacion es solo para LEER comodamente "quienes integran esto".
    members: Mapped[list["User"]] = relationship(secondary="project_members", viewonly=True)
