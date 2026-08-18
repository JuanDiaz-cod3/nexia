from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class StudentGroupMember(Base):
    __tablename__ = "student_group_members"
    # Mismo criterio que ProjectMember: un estudiante pertenece a un solo
    # grupo por año academico. academic_year_id vive tambien aca (no solo
    # en student_groups) para que el UNIQUE se pueda chequear en esta fila
    # sin join - mismo patron que project_members.
    __table_args__ = (UniqueConstraint("user_id", "academic_year_id"),)

    group_id: Mapped[int] = mapped_column(
        ForeignKey("student_groups.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id"), nullable=False
    )
