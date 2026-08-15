from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


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
