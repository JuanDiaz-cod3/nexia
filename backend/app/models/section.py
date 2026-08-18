from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Section(Base):
    __tablename__ = "sections"
    # Un mismo nombre de seccion ("11°A") no se repite dentro del mismo
    # colegio y año academico - se crea sola la primera vez que un admin la
    # usa (ver POST /admin/student-groups), no hay pantalla de gestion
    # aparte todavia.
    __table_args__ = (UniqueConstraint("school_id", "academic_year_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    academic_year_id: Mapped[int] = mapped_column(
        ForeignKey("academic_years.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(nullable=False)
