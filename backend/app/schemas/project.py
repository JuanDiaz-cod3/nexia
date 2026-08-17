from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserBasicOut


class ProjectCreate(BaseModel):
    title: str
    category: str | None = None
    summary: str | None = None


class ProjectUpdate(BaseModel):
    # Todo opcional a proposito: es un PATCH (actualizacion parcial), no un
    # PUT (reemplazo completo) - el cliente solo manda lo que quiere cambiar.
    title: str | None = None
    category: str | None = None
    summary: str | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str | None
    summary: str | None
    status: str
    created_at: datetime
    members: list[UserBasicOut]
    advisor: UserBasicOut | None
