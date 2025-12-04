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


class PendingInvite(BaseModel):
    id: str
    email: str
    role: str
    invited_by: str
    created_at: datetime
    expires_at: datetime
    status: str


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

            # Generate new temp password if it doesn't exist
            if not existing_invite.temp_password:
                existing_invite.temp_password = secrets.token_urlsafe(12)

            db.commit()

            send_workspace_invite_email(
                email=request.email,
                workspace_name=workspace.name,
                invited_by=current_user.full_name or current_user.email,
                invite_token=existing_invite.token,
                temp_password=existing_invite.temp_password
            )

            return InviteMemberResponse(
                success=True,
                message=f"Invitation resent to {request.email}",
                user_exists=False,
                invite_sent=True
            )

        # Create new invitation with temporary password
        invite_token = secrets.token_urlsafe(32)
        temp_password = secrets.token_urlsafe(12)  # Generate temporary password

        new_invite = WorkspaceInvite(
            workspace_id=workspace_id,
            email=request.email,
            role=request.role,
            invited_by_id=current_user.id,
            token=invite_token,
            temp_password=temp_password,
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
            invite_token=invite_token,
            temp_password=temp_password
        )

        return InviteMemberResponse(
            success=True,
            message=f"Invitation sent to {request.email}",
            user_exists=False,
            invite_sent=True
        )


@router.get("/{workspace_id}/invites", response_model=list[PendingInvite])
async def list_pending_invites(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List pending workspace invitations.

    Returns all pending invites for a workspace.
    """
    # Verify workspace exists and user is member
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    membership = (
        db.query(WorkspaceUser)
        .filter(
            WorkspaceUser.workspace_id == workspace_id,
            WorkspaceUser.user_id == str(current_user.id)
        )
        .first()
    )

    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    # Get pending invites
    invites = (
        db.query(WorkspaceInvite)
        .filter(
            WorkspaceInvite.workspace_id == workspace_id,
            WorkspaceInvite.status == "pending"
        )
        .all()
    )

    result = []
    for invite in invites:
        inviter = db.query(User).filter(User.id == invite.invited_by_id).first()
        result.append(PendingInvite(
            id=invite.id,
            email=invite.email,
            role=invite.role,
            invited_by=inviter.full_name or inviter.email if inviter else "Unknown",
            created_at=invite.created_at,
            expires_at=invite.expires_at,
            status=invite.status
        ))

    return result


@router.delete("/{workspace_id}/invites/{invite_id}")
async def cancel_workspace_invite(
    workspace_id: str,
    invite_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cancel a pending workspace invitation.

    Only workspace owners and admins can cancel invitations.
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
            detail="Only workspace owners and admins can cancel invitations"
        )

    # Find the invitation
    invite = (
        db.query(WorkspaceInvite)
        .filter(
            WorkspaceInvite.id == invite_id,
            WorkspaceInvite.workspace_id == workspace_id
        )
        .first()
    )

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")

    # Delete the invitation
    db.delete(invite)
    db.commit()

    return {"success": True, "message": "Invitation cancelled successfully"}
