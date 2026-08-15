# Dependencias reutilizables por endpoints protegidos. FastAPI las ejecuta
# automaticamente via Depends(...) antes de correr el codigo del endpoint,
# y si alguna lanza una excepcion, el endpoint ni siquiera llega a correr.

import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.jwt import decode_access_token
from app.db.session import get_db
from app.models import User

# HTTPBearer lee el header "Authorization: Bearer <token>" y separa el
# token del prefijo "Bearer " por nosotros.
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        user_id = decode_access_token(credentials.credentials)
    except pyjwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Token inválido o vencido", "code": "invalid_token"},
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Usuario no encontrado", "code": "invalid_token"},
        )
    return user


# Dependencia que a su vez depende de get_current_user: primero confirma
# quien es el usuario, despues confirma que puede seguir usando la API.
# Se usa en TODOS los endpoints protegidos excepto login y change-password
# (esos dos tienen que funcionar incluso con la clave temporal).
def require_password_changed(user: User = Depends(get_current_user)) -> User:
    if user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "detail": "Debes cambiar tu contraseña antes de continuar",
                "code": "password_change_required",
            },
        )
    return user
