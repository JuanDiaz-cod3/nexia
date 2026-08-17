import jwt as pyjwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.jwt import create_access_token, create_refresh_token, decode_refresh_token
from app.core.security import hash_password, verify_password
from app.db.session import get_db
from app.models import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RefreshResponse,
)

router = APIRouter()


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    # Fase actual: un solo colegio activo (La Salle), asi que el username
    # alcanza para identificar al usuario. Cuando haya mas de un colegio,
    # este query va a necesitar filtrar tambien por school_id.
    user = db.query(User).filter_by(username=payload.username).first()

    # Mismo mensaje generico si el usuario no existe o si la password esta
    # mal: no le decimos a un atacante cual de las dos cosas fallo.
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Usuario o contraseña incorrectos", "code": "invalid_credentials"},
        )

    access_token = create_access_token(user_id=user.id)
    refresh_token = create_refresh_token(user_id=user.id)
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        must_change_password=user.must_change_password,
    )


@router.post("/auth/refresh", response_model=RefreshResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> RefreshResponse:
    try:
        user_id = decode_refresh_token(payload.refresh_token)
    except pyjwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Refresh token inválido o vencido", "code": "invalid_refresh_token"},
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Usuario no encontrado", "code": "invalid_refresh_token"},
        )

    # No rotamos el refresh token: se queda vigente hasta su propio "exp"
    # (7 dias). Mantiene el flujo simple para este corte - si mas adelante
    # hace falta poder revocar sesiones antes de que expiren, ahi si hace
    # falta pasar a refresh tokens con estado (tabla en base de datos).
    return RefreshResponse(access_token=create_access_token(user_id=user.id))


@router.post("/auth/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if not verify_password(payload.current_password, current_user.password_hash):
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
