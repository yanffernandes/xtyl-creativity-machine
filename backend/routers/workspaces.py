"""
Workspace Router - Workspace management endpoints.

Provides endpoints for:
- Inviting members by email (creates user if doesn't exist)
- Managing workspace invitations
"""

from datetime import datetime, timedelta
from typing import Optional
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from database import get_db
from models import User, Workspace, WorkspaceInvite, WorkspaceUser
from email_service import send_workspace_invite_email, send_welcome_email
from supabase_auth import get_current_user

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: str = "member"


class InviteMemberResponse(BaseModel):
    success: bool
    message: str
    user_exists: bool
    invite_sent: bool


@router.post("/{workspace_id}/members", response_model=InviteMemberResponse)
async def invite_workspace_member(
    workspace_id: str,
    request: InviteMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Invite a member to workspace by email.

    If user exists: adds them directly and sends welcome email
    If user doesn't exist: creates invitation and sends invite email with signup link
    """
    # Verify workspace exists
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Verify current user is member of workspace (owner or admin)
    membership = (
        db.query(WorkspaceUser)
        .filter(
            WorkspaceUser.workspace_id == workspace_id,
            WorkspaceUser.user_id == str(current_user.id)
        )
        .first()
    )

    if not membership or membership.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only workspace owners and admins can invite members"
        )

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()

    if existing_user:
        # User exists - check if already a member
        existing_membership = (
            db.query(WorkspaceUser)
            .filter(
                WorkspaceUser.workspace_id == workspace_id,
                WorkspaceUser.user_id == str(existing_user.id)
            )
            .first()
        )

        if existing_membership:
            raise HTTPException(
                status_code=400,
                detail="User is already a member of this workspace"
            )

        # Add user to workspace
        new_membership = WorkspaceUser(
            workspace_id=workspace_id,
            user_id=str(existing_user.id),
            role=request.role
        )
        db.add(new_membership)
        db.commit()

        # Send welcome email
        send_welcome_email(
            email=request.email,
            workspace_name=workspace.name,
            invited_by=current_user.full_name or current_user.email,
            user_name=existing_user.full_name
        )

        return InviteMemberResponse(
            success=True,
            message=f"User {request.email} added to workspace",
            user_exists=True,
            invite_sent=False
        )

    else:
        # User doesn't exist - check if already invited
        existing_invite = (
            db.query(WorkspaceInvite)
            .filter(
                WorkspaceInvite.workspace_id == workspace_id,
                WorkspaceInvite.email == request.email,
                WorkspaceInvite.status == "pending"
            )
            .first()
        )

        if existing_invite:
            # Update expiry and resend
            existing_invite.expires_at = datetime.utcnow() + timedelta(days=7)
            existing_invite.created_at = datetime.utcnow()
            db.commit()

            send_workspace_invite_email(
                email=request.email,
                workspace_name=workspace.name,
                invited_by=current_user.full_name or current_user.email,
                invite_token=existing_invite.token
            )

            return InviteMemberResponse(
                success=True,
                message=f"Invitation resent to {request.email}",
                user_exists=False,
                invite_sent=True
            )

        # Create new invitation
        invite_token = secrets.token_urlsafe(32)
        new_invite = WorkspaceInvite(
            workspace_id=workspace_id,
            email=request.email,
            role=request.role,
            invited_by_id=current_user.id,
            token=invite_token,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="pending"
        )
        db.add(new_invite)
        db.commit()

        # Send invitation email
        send_workspace_invite_email(
            email=request.email,
            workspace_name=workspace.name,
            invited_by=current_user.full_name or current_user.email,
            invite_token=invite_token
        )

        return InviteMemberResponse(
            success=True,
            message=f"Invitation sent to {request.email}",
            user_exists=False,
            invite_sent=True
        )
