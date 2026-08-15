from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AcademicYear(Base):
    __tablename__ = "academic_years"
    __table_args__ = (UniqueConstraint("school_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    name: Mapped[str] = mapped_column(nullable=False)
