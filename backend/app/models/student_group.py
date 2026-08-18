from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


# "Grupo" (equipo de 2-4 estudiantes que va a compartir un proyecto), no
# confundir con "seccion" (11°A/B/C, el salon completo - ver Section). Vive
# aparte de Project porque existe ANTES de que el proyecto exista: el admin
# arma el grupo primero, y recien cuando uno de los integrantes crea el
# proyecto (POST /projects) se usa StudentGroupMember para agregar tambien
# a sus compañeros como ProjectMember - ver create_project en projects.py.
class StudentGroup(Base):
    __tablename__ = "student_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id"), nullable=False
    )
    section_id: Mapped[int] = mapped_column(ForeignKey("sections.id"), nullable=False)
