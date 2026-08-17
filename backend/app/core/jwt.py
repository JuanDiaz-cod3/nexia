# Emite y valida los JWT que usa la API para saber quien esta autenticado.
# Modulo separado de security.py a proposito: hashear passwords y firmar
# tokens son responsabilidades distintas, cada una en su propio archivo.

from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


class InvalidTokenTypeError(jwt.PyJWTError):
    """El JWT es valido (firma y exp ok) pero no es del tipo esperado.

    Ej: alguien manda un refresh token donde se espera un access token.
    Hereda de PyJWTError para que decode_access_token/decode_refresh_token
    se puedan atrapar con el mismo "except jwt.PyJWTError" que ya usa
    deps.py, sin que cada caller tenga que conocer esta clase.
    """


def _create_token(user_id: int, token_type: str, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),  # "subject": de quien es este token (claim estandar de JWT)
        "type": token_type,  # distingue access de refresh - ver InvalidTokenTypeError
        "iat": now,  # "issued at": cuando se emitio
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: int) -> str:
    return _create_token(
        user_id, "access", timedelta(minutes=settings.access_token_expire_minutes)
    )


def create_refresh_token(user_id: int) -> str:
    return _create_token(
        user_id, "refresh", timedelta(days=settings.refresh_token_expire_days)
    )


def _decode_token(token: str, expected_type: str) -> int:
    # jwt.decode valida la firma y el "exp" automaticamente; si el token
    # esta vencido o fue alterado, lanza jwt.PyJWTError. No la atrapamos
    # aqui: quien llame esta funcion decide como responder (401 en el
    # endpoint).
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != expected_type:
        raise InvalidTokenTypeError(f"Se esperaba un token de tipo '{expected_type}'")
    return int(payload["sub"])


def decode_access_token(token: str) -> int:
    return _decode_token(token, "access")


def decode_refresh_token(token: str) -> int:
    return _decode_token(token, "refresh")
