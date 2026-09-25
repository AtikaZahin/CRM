from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.auth.jwt_handler import SECRET_KEY, ALGORITHM
from app.schemas.token import TokenData
from app.database.connection import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        identifier: str = payload.get("sub")
        if identifier is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Lookup by email only (username removed)
    user = db.query(User).filter(User.email == identifier).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    return user

# Alias used by this task and future tasks
get_current_staff = get_current_user


def require_role(*allowed_roles: str):
    """Dependency factory: returns a Depends that checks the user's role."""
    def _check(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not authorized for this action",
            )
        return current_user
    return _check


require_admin = require_role("ADMIN")
require_lead_or_admin = require_role("ADMIN", "LEAD")
# Keep old name as alias so existing routers don't break yet
require_manager_or_admin = require_lead_or_admin
