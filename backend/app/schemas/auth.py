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
    # Los tokens ya no viajan en el body: login los manda como cookies
    # httpOnly (ver app/core/cookies.py). Lo unico que el frontend necesita
    # leer de la respuesta es si toca forzar el cambio de contraseña.
    must_change_password: bool


class ChangePasswordRequest(BaseModel):
    # Pedimos la clave actual aunque ya venga un token valido: es una capa
    # extra de seguridad por si el token se filtro sin que la clave se
    # filtrara tambien (el token expira en minutos, la clave no).
    current_password: str
    new_password: str
