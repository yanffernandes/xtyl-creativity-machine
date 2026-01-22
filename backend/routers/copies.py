"""
Copy Library Router - Feature 028

REST API endpoints for managing copy library items.
Copies are scoped to workspace level for reuse across projects.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from uuid import UUID

from database import get_db
from models import CopyLibraryItem, Workspace, WorkspaceUser
from schemas import (
    CopyLibraryItemCreate,
    CopyLibraryItemUpdate,
    CopyLibraryItem as CopyLibraryItemSchema,
    CopyLibraryList,
)
from supabase_auth import get_current_user
from models import User

router = APIRouter(prefix="/workspaces/{workspace_id}/copies", tags=["copy-library"])


def get_workspace_or_404(db: Session, workspace_id: str, user: User) -> Workspace:
    """Get workspace by ID or raise 404. Also verifies user access."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Verify user has access to this workspace
    membership = db.query(WorkspaceUser).filter(
        WorkspaceUser.workspace_id == workspace_id,
        WorkspaceUser.user_id == str(user.id)
    ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="Access denied to this workspace")

    return workspace


@router.get("", response_model=CopyLibraryList)
async def list_copies(
    workspace_id: str,
    search: Optional[str] = None,
    tags: Optional[List[str]] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List copy library items for a workspace.

    Supports search in title/content and tag filtering.
    """
    get_workspace_or_404(db, workspace_id, current_user)

    query = db.query(CopyLibraryItem).filter(
        CopyLibraryItem.workspace_id == workspace_id
    )

    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                CopyLibraryItem.title.ilike(search_term),
                CopyLibraryItem.content.ilike(search_term),
            )
        )

    # Apply tag filter
    if tags:
        query = query.filter(CopyLibraryItem.tags.overlap(tags))

    # Get total count
    total = query.count()

    # Apply pagination and ordering
    copies = query.order_by(CopyLibraryItem.updated_at.desc()).offset(offset).limit(limit).all()

    return CopyLibraryList(
        items=[CopyLibraryItemSchema.model_validate(c) for c in copies],
        total=total,
    )


@router.post("", response_model=CopyLibraryItemSchema, status_code=201)
async def create_copy(
    workspace_id: str,
    copy: CopyLibraryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new copy library item.
    """
    get_workspace_or_404(db, workspace_id, current_user)

    # Validate input
    if len(copy.title) > 255:
        raise HTTPException(status_code=400, detail="Title must be 255 characters or less")
    if len(copy.content) > 10000:
        raise HTTPException(status_code=400, detail="Content must be 10000 characters or less")
    if copy.tags and len(copy.tags) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 tags allowed")

    new_copy = CopyLibraryItem(
        workspace_id=workspace_id,
        title=copy.title,
        content=copy.content,
        tags=copy.tags or [],
        created_by=current_user.id,
    )

    db.add(new_copy)
    db.commit()
    db.refresh(new_copy)

    return CopyLibraryItemSchema.model_validate(new_copy)


@router.get("/{copy_id}", response_model=CopyLibraryItemSchema)
async def get_copy(
    workspace_id: str,
    copy_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific copy library item by ID."""
    get_workspace_or_404(db, workspace_id, current_user)

    copy = db.query(CopyLibraryItem).filter(
        CopyLibraryItem.id == copy_id,
        CopyLibraryItem.workspace_id == workspace_id,
    ).first()

    if not copy:
        raise HTTPException(status_code=404, detail="Copy not found")

    return CopyLibraryItemSchema.model_validate(copy)


@router.put("/{copy_id}", response_model=CopyLibraryItemSchema)
async def update_copy(
    workspace_id: str,
    copy_id: UUID,
    copy_update: CopyLibraryItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing copy library item."""
    get_workspace_or_404(db, workspace_id, current_user)

    copy = db.query(CopyLibraryItem).filter(
        CopyLibraryItem.id == copy_id,
        CopyLibraryItem.workspace_id == workspace_id,
    ).first()

    if not copy:
        raise HTTPException(status_code=404, detail="Copy not found")

    # Update fields if provided
    if copy_update.title is not None:
        if len(copy_update.title) > 255:
            raise HTTPException(status_code=400, detail="Title must be 255 characters or less")
        copy.title = copy_update.title

    if copy_update.content is not None:
        if len(copy_update.content) > 10000:
            raise HTTPException(status_code=400, detail="Content must be 10000 characters or less")
        copy.content = copy_update.content

    if copy_update.tags is not None:
        if len(copy_update.tags) > 20:
            raise HTTPException(status_code=400, detail="Maximum 20 tags allowed")
        copy.tags = copy_update.tags

    db.commit()
    db.refresh(copy)

    return CopyLibraryItemSchema.model_validate(copy)


@router.delete("/{copy_id}", status_code=204)
async def delete_copy(
    workspace_id: str,
    copy_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a copy library item."""
    get_workspace_or_404(db, workspace_id, current_user)

    copy = db.query(CopyLibraryItem).filter(
        CopyLibraryItem.id == copy_id,
        CopyLibraryItem.workspace_id == workspace_id,
    ).first()

    if not copy:
        raise HTTPException(status_code=404, detail="Copy not found")

    db.delete(copy)
    db.commit()

    return None
