"""
Minimal demo auth -- 3-4 hardcoded users tagged by approver role, so the
Approval Dashboard has real actors to log in as and click approve.
Not production auth. JWT kept intentionally simple for POC scope.
"""
import os
import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from jose import jwt

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("JWT_SECRET", "poc-dev-secret-change-me")
ALGORITHM = "HS256"

DEMO_USERS = {
    "hr@example.com": {"password": "demo123", "role": "HR"},
    "manager@example.com": {"password": "demo123", "role": "Manager"},
    "it@example.com": {"password": "demo123", "role": "IT"},
    "security@example.com": {"password": "demo123", "role": "Security"},
}


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(payload: LoginRequest):
    user = DEMO_USERS.get(payload.email)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = jwt.encode(
        {"sub": payload.email, "role": user["role"],
         "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)},
        SECRET_KEY, algorithm=ALGORITHM,
    )
    return {"access_token": token, "role": user["role"]}
