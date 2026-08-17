from fastapi import APIRouter, Depends

from app.api.deps import require_password_changed
from app.models import User
from app.schemas.user import UserOut

router = APIRouter()


@router.get("/users/me", response_model=UserOut)
def read_current_user(user: User = Depends(require_password_changed)) -> UserOut:
    # Construido a mano en vez de "return user": UserOut.roles es list[str]
    # (nombres), pero user.roles trae objetos Role - no hay mapeo automatico
    # de uno a otro via from_attributes.
    return UserOut(
        id=user.id,
        full_name=user.full_name,
        username=user.username,
        email=user.email,
        account_type=user.account_type,
        must_change_password=user.must_change_password,
        roles=[role.name for role in user.roles],
    )
