from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from .database import get_db
from .config import get_settings
from . import models

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Role-based permissions
ROLE_PERMISSIONS = {
    "admin": [
        "menu:read", "menu:write",
        "orders:read", "orders:write", "orders:void",
        "payments:read", "payments:write", "payments:refund",
        "tables:read", "tables:write", "tables:layout",
        "reports:read", "reports:export",
        "users:read", "users:write",
        "settings:read", "settings:write",
        "audit:read"
    ],
    "manager": [
        "menu:read", "menu:write",
        "orders:read", "orders:write", "orders:void",
        "payments:read", "payments:write", "payments:refund",
        "tables:read", "tables:write", "tables:layout",
        "reports:read", "reports:export",
        "users:read",
        "settings:read",
        "audit:read"
    ],
    "server": [
        "menu:read",
        "orders:read", "orders:write",
        "tables:read", "tables:write",
    ],
    "cashier": [
        "menu:read",
        "orders:read", "orders:write",
        "payments:read", "payments:write",
        "tables:read",
    ],
    "host": [
        "menu:read",
        "orders:read",
        "tables:read", "tables:write",
    ],
}

def hash_pin(pin: str) -> str:
    return pwd_context.hash(pin)

def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    return pwd_context.verify(plain_pin, hashed_pin)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

def get_permissions_for_role(role: str) -> list:
    return ROLE_PERMISSIONS.get(role, [])

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception
    
    return user

def require_permission(permission: str):
    async def permission_checker(current_user: models.User = Depends(get_current_user)):
        if permission not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission} required"
            )
        return current_user
    return permission_checker

def create_audit_log(
    db: Session,
    actor: models.User,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    metadata: dict = None
):
    log = models.AuditLog(
        actor_id=actor.id if actor else None,
        actor_name=actor.full_name if actor else "System",
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=metadata or {}
    )
    db.add(log)
    db.commit()
    return log

