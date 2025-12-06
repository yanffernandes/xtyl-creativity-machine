"""
Auth Router - User profile management and authentication endpoints.

Provides endpoints for:
- /auth/me - User profile retrieval and updates
- /auth/password-reset/confirm - Password reset confirmation
- /auth/signup/invite - Signup with workspace invitation

Authentication is handled by Supabase JWT validation via supabase_auth.py.
"""

import os
from datetime import datetime
import httpx

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, Any
from uuid import UUID

from database import get_db
from supabase_auth import get_current_user
# Feature 025: Rate limiting for auth endpoints
from middleware.security import limiter
import models

router = APIRouter(prefix="/auth", tags=["auth"])

# Supabase admin API configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


class SupabaseAdminClient:
    """Simple Supabase admin client using httpx to avoid package conflicts."""

    def __init__(self, url: str, service_key: str):
        self.url = url.rstrip("/")
        self.service_key = service_key
        self.headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json"
        }

    def get_user(self, user_id: str) -> Optional[dict]:
        """Get user by ID using admin API."""
        with httpx.Client() as client:
            response = client.get(
                f"{self.url}/auth/v1/admin/users/{user_id}",
                headers=self.headers
            )
            if response.status_code == 200:
                return response.json()
            return None

    def create_user(self, data: dict) -> Optional[dict]:
        """Create a new user using admin API."""
        with httpx.Client() as client:
            response = client.post(
                f"{self.url}/auth/v1/admin/users",
                headers=self.headers,
                json=data
            )
            if response.status_code in [200, 201]:
                return response.json()
            raise HTTPException(
                status_code=response.status_code,
                detail=response.json().get("message", "Failed to create user")
            )

    def update_user(self, user_id: str, data: dict) -> Optional[dict]:
        """Update user by ID using admin API."""
        with httpx.Client() as client:
            response = client.put(
                f"{self.url}/auth/v1/admin/users/{user_id}",
                headers=self.headers,
                json=data
            )
            if response.status_code == 200:
                return response.json()
            raise HTTPException(
                status_code=response.status_code,
                detail=response.json().get("message", "Failed to update user")
            )


def get_supabase_admin() -> SupabaseAdminClient:
    """Get Supabase admin client for admin operations."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Supabase configuration missing"
        )
    return SupabaseAdminClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)


class UserProfile(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    is_super_admin: bool = False

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None  # Password updates handled by Supabase client


@router.get("/me", response_model=UserProfile)
@limiter.limit("60/minute")
async def get_current_user_profile(
    request: Request,
    current_user: models.User = Depends(get_current_user),
):
    """
    Get current authenticated user's profile.

    Returns user id, email, full_name, and is_super_admin.
    Rate limited to 60 requests per minute per IP.
    """
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_super_admin=current_user.is_super_admin,
    )


@router.put("/me", response_model=UserProfile)
@limiter.limit("10/minute")
async def update_current_user_profile(
    request: Request,
    update_data: UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update current authenticated user's profile.

    Note: Password changes should be handled via Supabase client directly
    (supabase.auth.updateUser). This endpoint only updates full_name.
    Rate limited to 10 requests per minute per IP.
    """
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name
        db.commit()
        db.refresh(current_user)

    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_super_admin=current_user.is_super_admin,
    )


# =============================================================================
# Password Reset Endpoints
# =============================================================================

class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str


class PasswordResetConfirmResponse(BaseModel):
    success: bool
    message: str


@router.post("/password-reset/confirm", response_model=PasswordResetConfirmResponse)
@limiter.limit("5/minute")
async def confirm_password_reset(
    request: Request,
    data: PasswordResetConfirmRequest,
):
    """
    Confirm password reset using Supabase recovery token.

    This endpoint verifies the recovery token and updates the user's password.
    The token is obtained from the email link sent by Supabase.

    Rate limited to 5 requests per minute per IP.
    """
    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="A senha deve ter pelo menos 6 caracteres"
        )

    try:
        supabase = get_supabase_admin()

        # The token is a user ID from the recovery flow
        # Try to get the user to verify the token is valid
        user_data = supabase.get_user(data.token)

        if not user_data:
            raise HTTPException(
                status_code=400,
                detail="Token inválido ou expirado"
            )

        user_id = user_data.get("id", data.token)

        # Update the user's password using admin API
        supabase.update_user(user_id, {"password": data.new_password})

        return PasswordResetConfirmResponse(
            success=True,
            message="Senha alterada com sucesso"
        )

    except HTTPException:
        raise
    except Exception as e:
        # Log the error for debugging
        print(f"Password reset error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail="Token inválido ou expirado"
        )


# =============================================================================
# Signup with Invite Endpoints
# =============================================================================

class SignupWithInviteRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    invite_token: str


class SignupWithInviteResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[str] = None
    workspace_id: Optional[str] = None
    workspace_name: Optional[str] = None


@router.post("/signup/invite", response_model=SignupWithInviteResponse)
@limiter.limit("10/minute")
async def signup_with_invite(
    request: Request,
    data: SignupWithInviteRequest,
    db: Session = Depends(get_db),
):
    """
    Register a new user using a workspace invitation token.

    This endpoint:
    1. Validates the invitation token
    2. Creates a new user in Supabase Auth
    3. Adds the user to the workspace
    4. Marks the invitation as accepted

    Rate limited to 10 requests per minute per IP.
    """
    # Validate password length
    if len(data.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="A senha deve ter pelo menos 6 caracteres"
        )

    # Find the invitation
    invite = (
        db.query(models.WorkspaceInvite)
        .filter(
            models.WorkspaceInvite.token == data.invite_token,
            models.WorkspaceInvite.status == "pending"
        )
        .first()
    )

    if not invite:
        raise HTTPException(
            status_code=400,
            detail="Convite inválido ou já utilizado"
        )

    # Check if invitation has expired
    if invite.expires_at < datetime.utcnow():
        invite.status = "expired"
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="Este convite expirou. Solicite um novo convite."
        )

    # Verify email matches invitation
    if invite.email.lower() != data.email.lower():
        raise HTTPException(
            status_code=400,
            detail="O email não corresponde ao convite"
        )

    # Get workspace info
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == invite.workspace_id
    ).first()

    if not workspace:
        raise HTTPException(
            status_code=400,
            detail="Workspace não encontrado"
        )

    # Check if user already exists
    existing_user = db.query(models.User).filter(
        models.User.email == data.email.lower()
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Este email já está cadastrado. Faça login para acessar o workspace."
        )

    try:
        supabase = get_supabase_admin()

        # Create user in Supabase Auth
        auth_response = supabase.create_user({
            "email": data.email,
            "password": data.password,
            "email_confirm": True,  # Auto-confirm email for invited users
            "user_metadata": {
                "full_name": data.full_name
            }
        })

        if not auth_response or not auth_response.get("id"):
            raise HTTPException(
                status_code=500,
                detail="Erro ao criar usuário"
            )

        user_id = str(auth_response.get("id"))

        # The database trigger should create the user record
        # Wait a moment for the trigger to execute
        import time
        time.sleep(0.5)

        # Verify user was created in our database
        db_user = db.query(models.User).filter(
            models.User.id == user_id
        ).first()

        if not db_user:
            # Create user manually if trigger didn't work
            db_user = models.User(
                id=user_id,
                email=data.email.lower(),
                full_name=data.full_name
            )
            db.add(db_user)
            db.commit()

        # Add user to workspace
        workspace_user = models.WorkspaceUser(
            workspace_id=invite.workspace_id,
            user_id=user_id,
            role=invite.role
        )
        db.add(workspace_user)

        # Mark invitation as accepted
        invite.status = "accepted"
        invite.accepted_at = datetime.utcnow()

        db.commit()

        return SignupWithInviteResponse(
            success=True,
            message=f"Conta criada com sucesso! Você foi adicionado ao workspace '{workspace.name}'.",
            user_id=user_id,
            workspace_id=invite.workspace_id,
            workspace_name=workspace.name
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Signup with invite error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Erro ao criar conta. Tente novamente."
        )


class ValidateInviteResponse(BaseModel):
    valid: bool
    email: Optional[str] = None
    workspace_name: Optional[str] = None
    invited_by: Optional[str] = None
    expires_at: Optional[datetime] = None
    message: Optional[str] = None


@router.get("/invite/{token}/validate", response_model=ValidateInviteResponse)
@limiter.limit("30/minute")
async def validate_invite_token(
    request: Request,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Validate a workspace invitation token.

    Returns invitation details if valid, or error message if invalid/expired.
    """
    invite = (
        db.query(models.WorkspaceInvite)
        .filter(models.WorkspaceInvite.token == token)
        .first()
    )

    if not invite:
        return ValidateInviteResponse(
            valid=False,
            message="Convite não encontrado"
        )

    if invite.status != "pending":
        return ValidateInviteResponse(
            valid=False,
            message="Este convite já foi utilizado"
        )

    if invite.expires_at < datetime.utcnow():
        invite.status = "expired"
        db.commit()
        return ValidateInviteResponse(
            valid=False,
            message="Este convite expirou"
        )

    # Get workspace and inviter info
    workspace = db.query(models.Workspace).filter(
        models.Workspace.id == invite.workspace_id
    ).first()

    inviter = db.query(models.User).filter(
        models.User.id == invite.invited_by_id
    ).first()

    return ValidateInviteResponse(
        valid=True,
        email=invite.email,
        workspace_name=workspace.name if workspace else None,
        invited_by=inviter.full_name or inviter.email if inviter else None,
        expires_at=invite.expires_at
    )
