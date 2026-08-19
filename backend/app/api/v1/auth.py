import logging

import jwt as pyjwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.cookies import (
    REFRESH_COOKIE_NAME,
    clear_auth_cookies,
    set_access_cookie,
    set_auth_cookies,
)
from app.core.jwt import create_access_token, create_refresh_token, decode_refresh_token
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, LoginResponse

logger = logging.getLogger("innovalab.auth")

router = APIRouter()


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> LoginResponse:
    # Fase actual: un solo colegio activo (La Salle), asi que el username
    # alcanza para identificar al usuario. Cuando haya mas de un colegio,
    # este query va a necesitar filtrar tambien por school_id.
    user = db.query(User).filter_by(username=payload.username).first()

    # Mismo mensaje generico si el usuario no existe o si la password esta
    # mal: no le decimos a un atacante cual de las dos cosas fallo. El log
    # si puede diferenciarlas (nos sirve a nosotros, no se expone al cliente).
    if user is None or not verify_password(payload.password, user.password_hash):
        logger.warning("login_failed username=%s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Usuario o contraseña incorrectos", "code": "invalid_credentials"},
        )

    access_token = create_access_token(user_id=user.id)
    refresh_token = create_refresh_token(user_id=user.id)
    set_auth_cookies(response, access_token, refresh_token)
    return LoginResponse(must_change_password=user.must_change_password)


@router.post("/auth/refresh", response_model=LoginResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> LoginResponse:
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Refresh token inválido o vencido", "code": "invalid_refresh_token"},
        )

    try:
        user_id = decode_refresh_token(refresh_token)
    except pyjwt.PyJWTError:
        logger.warning("refresh_failed reason=invalid_or_expired_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Refresh token inválido o vencido", "code": "invalid_refresh_token"},
        )

    user = db.get(User, user_id)
    if user is None:
        logger.warning("refresh_failed reason=user_not_found user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Usuario no encontrado", "code": "invalid_refresh_token"},
        )

    # No rotamos el refresh token: se queda vigente hasta su propio "exp"
    # (7 dias). Mantiene el flujo simple para este corte - si mas adelante
    # hace falta poder revocar sesiones antes de que expiren, ahi si hace
    # falta pasar a refresh tokens con estado (tabla en base de datos).
    set_access_cookie(response, create_access_token(user_id=user.id))
    return LoginResponse(must_change_password=user.must_change_password)


@router.post("/auth/logout")
def logout(response: Response) -> dict[str, str]:
    # JS no puede borrar una cookie httpOnly - por eso el logout tiene que
    # ser un endpoint que la borre desde el servidor (Set-Cookie con
    # Max-Age=0), no algo que el frontend resuelva solo.
    clear_auth_cookies(response)
    return {"detail": "Sesión cerrada"}


@router.post("/auth/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if not verify_password(payload.current_password, current_user.password_hash):
        logger.warning("change_password_failed user_id=%s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Contraseña actual incorrecta", "code": "invalid_credentials"},
        )

    # current_user vino de la MISMA sesion db (FastAPI cachea Depends(get_db)
    # dentro de un mismo request), asi que modificarlo y hacer commit() aqui
    # si lo persiste - no hace falta un db.add() extra.
    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.commit()

    return {"detail": "Contraseña actualizada"}
