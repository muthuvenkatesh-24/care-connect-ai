from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.patients import router as patients_router
from app.api.routes.logs import router as logs_router
from app.api.routes.appointments import router as appointments_router
from app.api.routes.medications import router as medications_router
from app.api.routes.records import router as records_router
from app.api.routes.access import (
    doctor_router as doctor_workspace_router,
    patient_router as access_router,
    public_router as verify_router,
)
from app.core.security import jwt_secret


@asynccontextmanager
async def lifespan(_app: FastAPI):
    jwt_secret()
    yield


app = FastAPI(title="Care Connect AI API", lifespan=lifespan)
app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(patients_router, prefix="/api")
app.include_router(logs_router, prefix="/api")
app.include_router(appointments_router, prefix="/api")
app.include_router(medications_router, prefix="/api")
app.include_router(records_router, prefix="/api")
app.include_router(access_router, prefix="/api")
app.include_router(doctor_workspace_router, prefix="/api")
app.include_router(verify_router, prefix="/api")
