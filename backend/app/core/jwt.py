# Emite y valida los JWT que usa la API para saber quien esta autenticado.
# Modulo separado de security.py a proposito: hashear passwords y firmar
# tokens son responsabilidades distintas, cada una en su propio archivo.

from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),  # "subject": de quien es este token (claim estandar de JWT)
        "iat": now,  # "issued at": cuando se emitio
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int:
    # jwt.decode valida la firma y el "exp" automaticamente; si el token
    # esta vencido o fue alterado, lanza una excepcion (jwt.PyJWTError).
    # No la atrapamos aqui: quien llame esta funcion decide como responder
    # (en el endpoint, se traduce a un 401).
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    return int(payload["sub"])
