from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.role import Role


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("username", "school_id"),
        UniqueConstraint("email", "school_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    # Nullable: admin/teacher/judge no tienen seccion (11°A/B/C), solo los
    # estudiantes. Se asigna al crear la cuenta via POST /admin/student-groups.
    section_id: Mapped[int | None] = mapped_column(ForeignKey("sections.id"))
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

    # viewonly: los roles se asignan por fuera (script de creacion de
    # cuentas), esta relacion es solo para leer "que roles tiene este
    # usuario" comodamente (ver is_admin en deps.py).
    roles: Mapped[list["Role"]] = relationship(secondary="user_roles", viewonly=True)
