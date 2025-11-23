from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import User, Template as TemplateModel
from schemas import Template, TemplateCreate, TemplateUpdate
from auth import get_current_user
import uuid

router = APIRouter(
    prefix="/templates",
    tags=["templates"],
)


@router.get("/", response_model=List[Template])
def list_templates(
    workspace_id: Optional[str] = None,
    category: Optional[str] = None,
    include_system: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List templates available to the user.

    - System templates (global)
    - Workspace templates (if workspace_id provided)
    - User's own templates
    """
    query = db.query(TemplateModel).filter(TemplateModel.is_active == True)

    # Build filter for accessible templates
    filters = []

    if include_system:
        filters.append(TemplateModel.is_system == True)

    if workspace_id:
        filters.append(TemplateModel.workspace_id == workspace_id)

    # User's own templates
    filters.append(TemplateModel.user_id == current_user.id)

    # Combine with OR
    from sqlalchemy import or_
    query = query.filter(or_(*filters))

    # Filter by category if provided
    if category:
        query = query.filter(TemplateModel.category == category)

    # Order by usage count (most popular first), then by created_at
    query = query.order_by(
        TemplateModel.is_system.desc(),  # System templates first
        TemplateModel.usage_count.desc(),
        TemplateModel.created_at.desc()
    )

    return query.all()


@router.get("/{template_id}", response_model=Template)
def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific template by ID."""
    template = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check access
    if not template.is_system and template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return template


@router.post("/", response_model=Template)
def create_template(
    template: TemplateCreate,
    workspace_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new user template.
    Templates are scoped to workspace if workspace_id is provided.
    """
    new_template = TemplateModel(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        user_id=current_user.id,
        name=template.name,
        description=template.description,
        category=template.category,
        icon=template.icon,
        prompt=template.prompt,
        tags=template.tags,
        is_system=False,
        is_active=True,
        usage_count=0
    )

    db.add(new_template)
    db.commit()
    db.refresh(new_template)

    return new_template


@router.put("/{template_id}", response_model=Template)
def update_template(
    template_id: str,
    template_update: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a user template (cannot update system templates)."""
    template = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Only template owner can update
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot update this template")

    # Cannot update system templates
    if template.is_system:
        raise HTTPException(status_code=403, detail="Cannot update system templates")

    # Update fields
    for field, value in template_update.model_dump(exclude_unset=True).items():
        setattr(template, field, value)

    db.commit()
    db.refresh(template)

    return template


@router.delete("/{template_id}")
def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a user template (soft delete by setting is_active=False)."""
    template = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Only template owner can delete
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete this template")

    # Cannot delete system templates
    if template.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system templates")

    template.is_active = False
    db.commit()

    return {"message": "Template deleted successfully"}


@router.post("/{template_id}/use")
def increment_usage(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Increment usage count when template is used."""
    template = db.query(TemplateModel).filter(TemplateModel.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.usage_count += 1
    db.commit()

    return {"message": "Usage count updated"}


@router.get("/categories/list")
def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of all template categories with counts."""
    from sqlalchemy import func, distinct

    # Get categories with counts
    categories = db.query(
        TemplateModel.category,
        func.count(TemplateModel.id).label('count')
    ).filter(
        TemplateModel.is_active == True
    ).group_by(TemplateModel.category).all()

    return [
        {"category": cat, "count": count}
        for cat, count in categories
    ]
