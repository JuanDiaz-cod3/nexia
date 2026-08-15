from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    # from_attributes=True permite construir este schema directamente desde
    # un objeto SQLAlchemy (User), no solo desde un dict. Nota que NO incluye
    # password_hash: un schema de salida solo tiene los campos que si
    # queremos exponer por la API.
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    username: str
    email: str
    account_type: str
    must_change_password: bool


class UserBasicOut(BaseModel):
    # Version reducida para cuando un usuario aparece DENTRO de otro recurso
    # (ej. la lista de integrantes de un proyecto) - no tiene sentido que
    # cualquiera que ve un proyecto sepa el email o el must_change_password
    # de sus compañeros de equipo.
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    username: str
