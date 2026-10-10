from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.core.security import jwt_secret


@asynccontextmanager
async def lifespan(_app: FastAPI):
    jwt_secret()
    yield


app = FastAPI(title="Care Connect AI API", lifespan=lifespan)
app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
