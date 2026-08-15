from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("username", "school_id"),
        UniqueConstraint("email", "school_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    full_name: Mapped[str] = mapped_column(nullable=False)
    username: Mapped[str] = mapped_column(nullable=False)
    email: Mapped[str] = mapped_column(nullable=False)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    account_type: Mapped[str] = mapped_column(
        nullable=False, server_default=text("'institutional'")
    )
    must_change_password: Mapped[bool] = mapped_column(
        nullable=False, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
