from fastapi import APIRouter, Depends

from app.api.deps import require_password_changed
from app.models import User
from app.schemas.user import UserOut

router = APIRouter()


@router.get("/users/me", response_model=UserOut)
def read_current_user(user: User = Depends(require_password_changed)) -> User:
    return user
