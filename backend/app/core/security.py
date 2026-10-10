from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hash = PasswordHash.recommended()
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user_id: int, role: str) -> str:
    secret = jwt_secret()
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(user_id),
            "role": role,
            "iat": now,
            "exp": now + timedelta(minutes=settings.access_token_minutes),
        },
        secret,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> dict[str, object]:
    return jwt.decode(token, jwt_secret(), algorithms=[ALGORITHM])


def jwt_secret() -> str:
    secret = settings.jwt_secret_key
    if len(secret) < 32 or secret.lower().startswith(("change_me", "replace_me")):
        raise RuntimeError(
            "JWT_SECRET_KEY must be set to a random secret of at least 32 characters."
        )
    return secret
