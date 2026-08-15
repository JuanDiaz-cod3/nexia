# Schemas = la "forma" de los datos que entran y salen de la API.
# No son modelos de base de datos (esos estan en app/models/): un schema
# describe un request/response HTTP, un modelo describe una fila de tabla.
# A veces coinciden en campos, pero son conceptos distintos a proposito:
# nunca queremos exponer password_hash en una respuesta, por ejemplo.

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool
