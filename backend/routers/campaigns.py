"""
Campaigns Router - Feature 028

REST API endpoints for managing campaign packages.
Campaigns are scoped to project level for organizing copies and images.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from database import get_db
from models import CampaignPackage, Project, WorkspaceUser
from schemas import (
    CampaignCreate,
    CampaignUpdate,
    Campaign as CampaignSchema,
    CampaignList,
)
from supabase_auth import get_current_user
from models import User

router = APIRouter(prefix="/projects/{project_id}/campaigns", tags=["campaigns"])


def get_project_or_404(db: Session, project_id: str, user: User) -> Project:
    """Get project by ID or raise 404. Also verifies user access."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.deleted_at:
        raise HTTPException(status_code=404, detail="Project has been deleted")

    # Verify user has access to this project's workspace
    membership = db.query(WorkspaceUser).filter(
        WorkspaceUser.workspace_id == project.workspace_id,
        WorkspaceUser.user_id == str(user.id)
    ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="Access denied to this project")

    return project


@router.get("", response_model=CampaignList)
async def list_campaigns(
    project_id: str,
    channel: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List campaign packages for a project.

    Supports optional channel filtering.
    """
    get_project_or_404(db, project_id, current_user)

    query = db.query(CampaignPackage).filter(
        CampaignPackage.project_id == project_id
    )

    # Apply channel filter
    if channel:
        query = query.filter(CampaignPackage.channel == channel)

    # Get total count
    total = query.count()

    # Order by creation date (newest first)
    campaigns = query.order_by(CampaignPackage.created_at.desc()).all()

    return CampaignList(
        items=[CampaignSchema.model_validate(c) for c in campaigns],
        total=total,
    )


@router.post("", response_model=CampaignSchema, status_code=201)
async def create_campaign(
    project_id: str,
    campaign: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new campaign package.
    """
    get_project_or_404(db, project_id, current_user)

    # Validate input
    if len(campaign.name) > 255:
        raise HTTPException(status_code=400, detail="Name must be 255 characters or less")
    if campaign.channel and len(campaign.channel) > 100:
        raise HTTPException(status_code=400, detail="Channel must be 100 characters or less")

    new_campaign = CampaignPackage(
        project_id=project_id,
        name=campaign.name,
        channel=campaign.channel,
        metadata=campaign.metadata or {},
    )

    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    return CampaignSchema.model_validate(new_campaign)


@router.get("/{campaign_id}", response_model=CampaignSchema)
async def get_campaign(
    project_id: str,
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific campaign package by ID."""
    get_project_or_404(db, project_id, current_user)

    campaign = db.query(CampaignPackage).filter(
        CampaignPackage.id == campaign_id,
        CampaignPackage.project_id == project_id,
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return CampaignSchema.model_validate(campaign)


@router.put("/{campaign_id}", response_model=CampaignSchema)
async def update_campaign(
    project_id: str,
    campaign_id: UUID,
    campaign_update: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing campaign package."""
    get_project_or_404(db, project_id, current_user)

    campaign = db.query(CampaignPackage).filter(
        CampaignPackage.id == campaign_id,
        CampaignPackage.project_id == project_id,
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Update fields if provided
    if campaign_update.name is not None:
        if len(campaign_update.name) > 255:
            raise HTTPException(status_code=400, detail="Name must be 255 characters or less")
        campaign.name = campaign_update.name

    if campaign_update.channel is not None:
        if len(campaign_update.channel) > 100:
            raise HTTPException(status_code=400, detail="Channel must be 100 characters or less")
        campaign.channel = campaign_update.channel

    if campaign_update.metadata is not None:
        campaign.metadata = campaign_update.metadata

    db.commit()
    db.refresh(campaign)

    return CampaignSchema.model_validate(campaign)


@router.delete("/{campaign_id}", status_code=204)
async def delete_campaign(
    project_id: str,
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a campaign package."""
    get_project_or_404(db, project_id, current_user)

    campaign = db.query(CampaignPackage).filter(
        CampaignPackage.id == campaign_id,
        CampaignPackage.project_id == project_id,
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    db.delete(campaign)
    db.commit()

    return None
