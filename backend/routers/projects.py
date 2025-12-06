"""
Project Settings Router
Endpoints for managing project settings (client info, target audience, brand voice, etc.)
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
import httpx

from database import get_db
from models import Project, Document
from schemas import (
    ProjectSettings, ProjectSettingsUpdate, ProjectContext,
    ColorExtractionResult, AssetColorExtractionRequest, AssetColorExtractionResult,
    DeleteProjectResponse, CascadeSummary
)
from supabase_auth import get_current_user
from services.color_extraction import extract_colors, validate_image
from crud import can_delete_project, soft_delete_project

router = APIRouter(prefix="/projects", tags=["projects"])


def format_project_context(settings: dict) -> str:
    """Format project settings as context for AI prompts"""
    if not settings or not settings.get("client_name"):
        return ""

    context_parts = []

    # Basic info
    context_parts.append(f"Client/Company: {settings.get('client_name')}")

    if settings.get("description"):
        context_parts.append(f"Project Description: {settings.get('description')}")

    if settings.get("target_audience"):
        context_parts.append(f"Target Audience: {settings.get('target_audience')}")

    # Brand voice
    brand_voice = settings.get("brand_voice")
    if brand_voice:
        voice_labels = {
            "professional_formal": "Professional and Formal",
            "casual_friendly": "Casual and Friendly",
            "technical_precise": "Technical and Precise",
            "creative_playful": "Creative and Playful",
            "authoritative_expert": "Authoritative and Expert",
            "custom": settings.get("brand_voice_custom", "Custom")
        }
        context_parts.append(f"Brand Voice/Tone: {voice_labels.get(brand_voice, brand_voice)}")

    # Key messages
    if settings.get("key_messages"):
        messages = settings.get("key_messages")
        if messages:
            context_parts.append(f"Key Messages: {'; '.join(messages)}")

    # Competitors
    if settings.get("competitors"):
        competitors = settings.get("competitors")
        if competitors:
            context_parts.append(f"Competitors: {', '.join(competitors)}")

    # Custom notes
    if settings.get("custom_notes"):
        context_parts.append(f"Additional Context: {settings.get('custom_notes')}")

    # Brand Identity (Feature 012)
    brand_identity = settings.get("brand_identity")
    if brand_identity:
        # Color palette
        colors = brand_identity.get("color_palette", [])
        if colors:
            color_str = ", ".join(colors)
            context_parts.append(f"Brand Colors: {color_str} (ordered by priority: primary, secondary, accent)")

        # Typography
        typography = brand_identity.get("typography")
        if typography:
            fonts = []
            if typography.get("primary"):
                fonts.append(f"Primary/Headlines: {typography['primary']}")
            if typography.get("secondary"):
                fonts.append(f"Secondary/Body: {typography['secondary']}")
            if typography.get("tertiary"):
                fonts.append(f"Tertiary/Accents: {typography['tertiary']}")
            if fonts:
                context_parts.append(f"Brand Fonts: {'; '.join(fonts)}")

    return "\n".join(context_parts)


def get_missing_fields(settings: dict) -> List[str]:
    """Get list of fields that would improve AI responses if filled"""
    missing = []

    if not settings:
        return ["client_name", "description", "target_audience", "brand_voice", "brand_identity"]

    if not settings.get("description"):
        missing.append("description")
    if not settings.get("target_audience"):
        missing.append("target_audience")
    if not settings.get("brand_voice"):
        missing.append("brand_voice")
    if not settings.get("key_messages"):
        missing.append("key_messages")

    # Brand Identity (Feature 012) - suggest if not configured
    brand_identity = settings.get("brand_identity")
    if not brand_identity or (
        not brand_identity.get("color_palette") and
        not brand_identity.get("typography")
    ):
        missing.append("brand_identity")

    return missing


@router.get("/{project_id}/settings", response_model=dict)
async def get_project_settings(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get project settings"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Return settings or empty dict
    return project.settings or {}


@router.put("/{project_id}/settings", response_model=dict)
async def update_project_settings(
    project_id: str,
    settings: ProjectSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update project settings and sync project name with client_name"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate client_name is provided
    if not settings.client_name or not settings.client_name.strip():
        raise HTTPException(status_code=400, detail="client_name is required")

    # Update settings
    project.settings = settings.model_dump(exclude_none=True)

    # Sync project.name with client_name for consistent display
    project.name = settings.client_name.strip()

    db.commit()
    db.refresh(project)

    return {"settings": project.settings, "project_name": project.name}


@router.get("/{project_id}/settings/context", response_model=ProjectContext)
async def get_project_context(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get formatted AI context from project settings"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    settings = project.settings or {}
    has_settings = bool(settings.get("client_name"))

    return ProjectContext(
        formatted_context=format_project_context(settings),
        has_settings=has_settings,
        missing_fields=get_missing_fields(settings)
    )


# ============================================================================
# COLOR EXTRACTION ENDPOINTS (Feature 012)
# ============================================================================

@router.post("/{project_id}/extract-colors", response_model=ColorExtractionResult)
async def extract_colors_from_upload(
    project_id: str,
    file: UploadFile = File(...),
    n_colors: int = Query(default=6, ge=1, le=6),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Extract dominant colors from an uploaded image using K-means clustering.

    - Accepts PNG, JPG, WEBP images up to 5MB
    - Returns up to 6 dominant colors sorted by prevalence
    - Colors are returned as HEX codes (#RRGGBB)
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file is provided
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # Read file content
    content = await file.read()

    # Validate file type and size
    is_valid, error_message = validate_image(
        content_type=file.content_type or "",
        file_size=len(content),
        max_size_mb=5.0
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)

    # Extract colors
    try:
        result = extract_colors(content, n_colors=n_colors)
        return ColorExtractionResult(
            colors=result["colors"],
            source_filename=file.filename,
            processing_time_ms=result["processing_time_ms"],
            message=result.get("message")
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process image: {str(e)}"
        )


@router.post("/{project_id}/extract-colors-from-asset", response_model=AssetColorExtractionResult)
async def extract_colors_from_asset(
    project_id: str,
    request: AssetColorExtractionRequest,
    n_colors: int = Query(default=6, ge=1, le=6),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Extract dominant colors from an existing visual asset in the project.

    - Looks up the asset by ID in the project's visual assets
    - Downloads the image from storage
    - Extracts colors using K-means clustering
    - Returns up to 6 dominant colors sorted by prevalence
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Look up the asset
    asset = db.query(Document).filter(
        Document.id == request.asset_id,
        Document.project_id == project_id,
        Document.is_reference_asset == True,
        Document.deleted_at == None
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Visual asset not found in this project")

    if not asset.file_url:
        raise HTTPException(status_code=400, detail="Asset has no file URL")

    # Download the image from storage
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(asset.file_url, timeout=30.0)
            response.raise_for_status()
            content = response.content
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to download asset image: {str(e)}"
        )

    # Validate file size (reuse existing limit)
    if len(content) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="Asset image exceeds 5MB size limit")

    # Extract colors
    try:
        result = extract_colors(content, n_colors=n_colors)
        return AssetColorExtractionResult(
            colors=result["colors"],
            source_filename=asset.title or f"asset_{asset.id}",
            processing_time_ms=result["processing_time_ms"],
            message=result.get("message"),
            source_asset_id=asset.id,
            source_asset_name=asset.title or f"Asset {asset.id}"
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process image: {str(e)}"
        )


# ============================================================================
# PROJECT DELETION ENDPOINT (Feature 020)
# ============================================================================

@router.delete("/{project_id}", response_model=DeleteProjectResponse)
async def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Soft delete a project and cascade to all child entities.

    - Requires workspace owner or admin role
    - Sets deleted_at timestamp on project and all related entities
    - Cascades to: documents, folders, workflow templates, workflow executions
    - Data remains in database for potential recovery

    Returns cascade summary with counts of affected entities.
    """
    user_id = str(current_user.id)

    # Check authorization
    if not can_delete_project(db, user_id, project_id):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this project. Only workspace owners and admins can delete projects."
        )

    # Get project info for response message
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.deleted_at == None
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found or already deleted"
        )

    project_name = project.name

    # Perform soft delete with cascade
    result = soft_delete_project(db, project_id, user_id)

    if not result:
        raise HTTPException(
            status_code=500,
            detail="Failed to delete project"
        )

    return DeleteProjectResponse(
        success=True,
        message=f"Project '{project_name}' has been deleted",
        deleted_at=result["deleted_at"],
        cascade_summary=CascadeSummary(**result["cascade_summary"])
    )
