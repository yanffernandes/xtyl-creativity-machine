"""
Auth Router - User profile management endpoints.

Provides /auth/me endpoints for user profile retrieval and updates.
Authentication is handled by Supabase JWT validation via supabase_auth.py.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from uuid import UUID

from database import get_db
from supabase_auth import get_current_user
import models

router = APIRouter(prefix="/auth", tags=["auth"])


class UserProfile(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None  # Password updates handled by Supabase client


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: models.User = Depends(get_current_user),
):
    """
    Get current authenticated user's profile.

    Returns user id, email, and full_name.
    """
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name
    )


@router.put("/me", response_model=UserProfile)
async def update_current_user_profile(
    update_data: UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update current authenticated user's profile.

    Note: Password changes should be handled via Supabase client directly
    (supabase.auth.updateUser). This endpoint only updates full_name.
    """
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name
        db.commit()
        db.refresh(current_user)

    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name
    )
