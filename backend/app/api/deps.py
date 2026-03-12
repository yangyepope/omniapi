from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app.core import security
from app.core.config import settings
from app.core.db import engine
from app.models import TokenPayload, User, ApiKey
from app.schemas.douyin import VideoRequest
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import select

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)

reusable_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False
)

api_key_header = HTTPBearer(auto_error=False, description="API Key using Bearer scheme")


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session




SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]



def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]

def get_current_user_or_apikey(
    session: SessionDep,
    token_oauth: Annotated[str | None, Depends(reusable_oauth2_optional)] = None,
    token_bearer: Annotated[HTTPAuthorizationCredentials | None, Depends(api_key_header)] = None
) -> User:
    """
    Get user from either OAuth2 JWT token or API Key.
    """
    token = token_oauth
    
    # If not from OAuth2, try Bearer scheme
    if not token and token_bearer:
        token = token_bearer.credentials
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Try as JWT
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        user = session.get(User, token_data.sub)
        if user and user.is_active:
            return user
    except (InvalidTokenError, ValidationError):
        pass # Not a valid JWT, proceed to check as API Key
        
    # 2. Try as API Key
    # API Keys are usually unique strings
    statement = select(ApiKey).where(ApiKey.key == token).where(ApiKey.is_active == True)
    api_key_obj = session.exec(statement).first()
    
    if api_key_obj:
        user = session.get(User, api_key_obj.user_id)
        if user and user.is_active:
            return user
            
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials",
    )

CurrentUserOrApiKey = Annotated[User, Depends(get_current_user_or_apikey)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user


def get_token_validity(token: TokenDep) -> str:
    """
    Validate that the token is a valid system-issued token.
    Does not require user lookup, just signature and expiration verification.
    Returns the valid token string.
    """
    try:
        jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        return token
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )



