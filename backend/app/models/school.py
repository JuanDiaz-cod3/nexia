from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class School(Base):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=False)
    email_domain: Mapped[str | None] = mapped_column()
