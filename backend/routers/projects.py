"""
Project Settings Router
Endpoints for managing project settings (client info, target audience, brand voice, etc.)
Includes bootstrap endpoint for optimized project page loading (Feature 027).
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import httpx

from database import get_db
from models import Project, Document, CreativeConcept, UserMemory, Workspace, WorkspaceUser
from schemas import (
    ProjectSettings, ProjectSettingsUpdate, ProjectContext,
    ColorExtractionResult, AssetColorExtractionRequest, AssetColorExtractionResult,
    DeleteProjectResponse, CascadeSummary,
    BootstrapData, ModelsConfig, Project as ProjectSchema, VisualAsset, MemoryResponse,
    Document as DocumentSchema, CreativeConcept as CreativeConceptSchema, AvailableModel
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


# ============================================================================
# BOOTSTRAP ENDPOINT (Feature 027 - Visual Generation Studio)
# ============================================================================

async def get_available_models(db: Session) -> dict:
    """Get available image models and default model from system_config.
    Text models are fetched separately by pages that need them (admin, settings)."""
    from image_generation_service import get_available_models as get_available_image_models
    from models import SystemConfig
    import json

    image_models = []
    default_image_model = None

    # Get default image model from system_config
    try:
        ai_models_config = db.query(SystemConfig).filter(SystemConfig.key == "ai_models").first()
        if ai_models_config and ai_models_config.value:
            config_data = json.loads(ai_models_config.value) if isinstance(ai_models_config.value, str) else ai_models_config.value
            default_image_model = config_data.get("defaults", {}).get("image_generation")
    except Exception:
        pass

    try:
        image_models_data = await get_available_image_models()
        image_models = [
            AvailableModel(
                id=m.get("id", ""),
                name=m.get("name", m.get("id", "")),
                description=m.get("description"),
                output_modalities=["image"],
            )
            for m in image_models_data
        ]
    except Exception:
        pass

    return {"text": [], "image": image_models, "default_image_model": default_image_model}


@router.get("/{project_id}/bootstrap", response_model=BootstrapData)
async def get_project_bootstrap(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all data needed to load the project page in a single request.

    This endpoint aggregates multiple data sources to reduce initial page load from 8+ requests to 1:
    - Project info and settings
    - Available text and image models
    - Visual context assets (up to 5)
    - User memories for this project (up to 10)
    - Recent documents (up to 10)
    - Style presets for image generation

    Feature 027 - Visual Generation Studio
    """
    user_id = str(current_user.id)

    # Get project and verify access
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.deleted_at == None
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify user has access to this project's workspace
    workspace_access = db.query(WorkspaceUser).filter(
        WorkspaceUser.workspace_id == project.workspace_id,
        WorkspaceUser.user_id == user_id
    ).first()

    if not workspace_access:
        raise HTTPException(status_code=403, detail="Access denied to this project")

    # Get models (async) - pass db for fetching default model from system_config
    models = await get_available_models(db)

    # Get visual context assets (reference images for this project)
    # Return ALL assets so frontend can filter/select as needed
    visual_assets = db.query(Document).filter(
        Document.project_id == project_id,
        Document.is_reference_asset == True,
        Document.deleted_at == None
    ).order_by(desc(Document.created_at)).all()

    visual_context = [
        VisualAsset(
            id=a.id,
            project_id=a.project_id,
            name=a.title or f"Asset {a.id}",
            file_url=a.file_url,
            thumbnail_url=a.thumbnail_url,
            category=a.asset_category,
            tags=a.asset_tags,
            ai_description=a.ai_description,
            is_classified=bool(a.asset_category),
            created_at=a.created_at,
            updated_at=a.updated_at
        )
        for a in visual_assets
    ]

    # Get user memories for this project
    memories = db.query(UserMemory).filter(
        UserMemory.user_id == current_user.id,
        UserMemory.project_id == project_id
    ).order_by(desc(UserMemory.created_at)).limit(10).all()

    memories_response = [
        MemoryResponse(
            id=m.id,
            user_id=m.user_id,
            project_id=m.project_id,
            content=m.content,
            category=m.category,
            source_conversation_id=m.source_conversation_id,
            created_at=m.created_at,
            updated_at=m.updated_at
        )
        for m in memories
    ]

    # Get recent copies (text documents only)
    recent_copies_query = db.query(Document).filter(
        Document.project_id == project_id,
        Document.is_reference_asset == False,
        Document.deleted_at == None,
        Document.media_type == 'text'
    ).order_by(desc(Document.created_at)).limit(10).all()

    recent_copies = [
        DocumentSchema.model_validate(d)
        for d in recent_copies_query
    ]

    # Get recent media (images, videos)
    recent_media_query = db.query(Document).filter(
        Document.project_id == project_id,
        Document.is_reference_asset == False,
        Document.deleted_at == None,
        Document.media_type.in_(['image', 'video'])
    ).order_by(desc(Document.created_at)).limit(10).all()

    recent_media = [
        DocumentSchema.model_validate(d)
        for d in recent_media_query
    ]

    # Deprecated: combined list for backwards compatibility
    recent_documents = recent_copies + recent_media

    # Get active creative concepts
    creative_concepts = db.query(CreativeConcept).filter(
        CreativeConcept.is_active == True
    ).order_by(CreativeConcept.sort_order).all()

    concepts_response = [
        CreativeConceptSchema.model_validate(c)
        for c in creative_concepts
    ]

    # Build project response
    project_response = ProjectSchema(
        id=project.id,
        name=project.name,
        description=project.description,
        settings=project.settings,
        created_at=project.created_at
    )

    return BootstrapData(
        project=project_response,
        settings=project.settings,
        models=ModelsConfig(
            text=models.get("text", []),
            image=models.get("image", []),
            default_image_model=models.get("default_image_model")
        ),
        visual_context=visual_context,
        memories=memories_response,
        recent_copies=recent_copies,
        recent_media=recent_media,
        recent_documents=recent_documents,  # deprecated
        creative_concepts=concepts_response
    )
