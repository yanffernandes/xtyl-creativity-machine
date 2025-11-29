"""
Supabase Auth - JWT Token Validation

This module validates Supabase JWT tokens using PyJWT.
Replaces the custom auth.py implementation.
"""

import os
import uuid
import time
import jwt
from typing import Optional, Dict, Tuple
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User

# Supabase JWT configuration
ALGORITHM = "HS256"

# Simple in-memory cache for user lookups
# Format: {user_id: (User, timestamp)}
# Cache entries expire after 60 seconds
_user_cache: Dict[str, Tuple[User, float]] = {}
_CACHE_TTL = 60  # seconds

def _get_jwt_secret() -> str:
    """Get JWT secret dynamically to ensure env vars are loaded."""
    return os.getenv("SUPABASE_JWT_SECRET", "")

# Use HTTPBearer instead of OAuth2PasswordBearer for Supabase tokens
security = HTTPBearer(auto_error=False)


def _validate_token(token: str) -> dict:
    """
    Validate a Supabase JWT token and return the payload.

    Args:
        token: JWT access token from Supabase

    Returns:
        Decoded JWT payload

    Raises:
        HTTPException: If token is invalid or expired
    """
    jwt_secret = _get_jwt_secret()
    if not jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_SECRET not configured",
        )

    try:
        # Supabase uses 'authenticated' as the audience
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=[ALGORITHM],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        print("[AUTH] Token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        print(f"[AUTH] Invalid token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Get current authenticated user from Supabase JWT token.

    This is the main dependency for protected endpoints.

    Args:
        credentials: Bearer token from Authorization header
        db: Database session

    Returns:
        User model instance

    Raises:
        HTTPException: If token is missing, invalid, or user not found
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _validate_token(credentials.credentials)

    # Extract user ID from 'sub' claim
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Convert user_id string to UUID for database query
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        print(f"[AUTH] Invalid UUID format: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check cache first
    now = time.time()
    if user_id in _user_cache:
        cached_user, cached_time = _user_cache[user_id]
        if now - cached_time < _CACHE_TTL:
            return cached_user
        else:
            # Cache expired, remove it
            del _user_cache[user_id]

    # Get user from database
    try:
        user = db.query(User).filter(User.id == user_uuid).first()
    except Exception as e:
        print(f"[AUTH] Database query error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}",
        )

    if not user:
        # User exists in Supabase Auth but not in our users table yet
        # This can happen if the Supabase trigger hasn't run yet
        # Create the user record from the token data
        print(f"[AUTH] User not found, creating from token data")
        email = payload.get("email")
        user_metadata = payload.get("user_metadata", {})

        if email:
            try:
                user = User(
                    id=user_uuid,
                    email=email,
                    full_name=user_metadata.get("full_name", ""),
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"[AUTH] User created successfully: {user.email}")
            except Exception as e:
                print(f"[AUTH] Error creating user: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error creating user: {str(e)}",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Cache the user for future requests
    _user_cache[user_id] = (user, time.time())

    return user


async def get_current_user_from_token(token: str, db: Session) -> User:
    """
    Get current authenticated user from JWT token string.

    Used for SSE endpoints where token is passed via query parameter.

    Args:
        token: JWT token string
        db: Database session

    Returns:
        User model instance

    Raises:
        HTTPException: If token is invalid or user not found
    """
    payload = _validate_token(token)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID",
        )

    # Convert to UUID
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format",
        )

    user = db.query(User).filter(User.id == user_uuid).first()

    if not user:
        email = payload.get("email")
        user_metadata = payload.get("user_metadata", {})

        if email:
            user = User(
                id=user_uuid,
                email=email,
                full_name=user_metadata.get("full_name", ""),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

    return user


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None.

    Use this for endpoints that work with or without authentication.

    Args:
        credentials: Optional bearer token from Authorization header
        db: Database session

    Returns:
        User model instance or None if not authenticated
    """
    if not credentials:
        return None

    try:
        payload = _validate_token(credentials.credentials)
        user_id = payload.get("sub")

        if user_id:
            try:
                user_uuid = uuid.UUID(user_id)
                return db.query(User).filter(User.id == user_uuid).first()
            except ValueError:
                pass
    except HTTPException:
        pass

    return None
