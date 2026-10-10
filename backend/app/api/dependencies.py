from collections.abc import Callable
from enum import StrEnum

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.security import decode_access_token

ACCESS_COOKIE = "care_connect_access"


class Role(StrEnum):
    PATIENT = "patient"
    DOCTOR = "doctor"


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        authorization = request.headers.get("Authorization", "")
        if authorization.lower().startswith("bearer "):
            token = authorization[7:].strip()
    if not token:
        raise _unauthorized()

    try:
        payload = decode_access_token(token)
        user_id = int(str(payload.get("sub", "")))
    except (jwt.InvalidTokenError, ValueError, TypeError) as exc:
        raise _unauthorized() from exc

    user = db.get(User, user_id)
    if user is None:
        raise _unauthorized()
    return user


def require_roles(*roles: Role) -> Callable:
    allowed_roles = {role.value for role in roles}

    def check_role(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )
        return user

    return check_role


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required or token is invalid.",
        headers={"WWW-Authenticate": "Bearer"},
    )


