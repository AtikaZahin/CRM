from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.auth.jwt_handler import SECRET_KEY, ALGORITHM
from app.database.connection import get_db
from app.models.user import User
from app.models.customer import Customer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="staff/login")
customer_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="customer/login")


def get_current_staff(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("typ") != "staff":
            raise credentials_exception
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
        user_id = int(sub)
    except (JWTError, ValueError, TypeError):
        # JWTError  -> bad signature / expired token
        # ValueError -> sub is not a number (e.g. old email-based tokens)
        # TypeError  -> sub is missing (int(None))
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive user")
    return user


# Alias so older imports keep working
get_current_user = get_current_staff


def require_role(*allowed_roles: str):
    """Dependency factory: allows only the given staff roles."""
    def _check(current_user: User = Depends(get_current_staff)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not authorized for this action",
            )
        return current_user
    return _check


require_admin = require_role("ADMIN")
require_lead_or_admin = require_role("ADMIN", "LEAD")


def get_current_customer(
    token: str = Depends(customer_oauth2_scheme),
    db: Session = Depends(get_db),
) -> Customer:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("typ") != "customer":
            raise credentials_exception
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
        customer_id = int(sub)
    except (JWTError, ValueError, TypeError):
        raise credentials_exception

    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if customer is None:
        raise credentials_exception
    return customer
