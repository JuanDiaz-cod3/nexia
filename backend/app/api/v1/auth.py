from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.jwt import create_access_token
from app.core.security import verify_password
from app.db.session import get_db
from app.models import User
from app.schemas.auth import LoginRequest, LoginResponse

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

    token = create_access_token(user_id=user.id)
    return LoginResponse(access_token=token, must_change_password=user.must_change_password)
