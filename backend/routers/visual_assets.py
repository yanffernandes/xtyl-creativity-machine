"""
Visual Assets Router
Handles upload, management, and retrieval of visual assets (logos, backgrounds, references)
for use as context/input in AI image generation

Extended for Feature 011: Smart Visual Assets
- AI classification of uploaded assets
- Visual context settings for AI assistant
- Asset rotation for automatic selection
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query, Form, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid
import io
from PIL import Image
import os

from database import get_db
from models import User, Document, Project, AssistantVisualSettings, AssistantAssetSelection, AssetUsageHistory
from supabase_auth import get_current_user
from storage_service import upload_file
from services.visual_asset_service import visual_asset_service
from schemas import (
    AssetCategory, VisualContextMode, AssetClassificationResult, AssetMetadataUpdate,
    VisualAsset, VisualAssetList, VisualAssetsSummary,
    AssistantVisualSettings as VisualSettingsSchema, AssistantVisualSettingsUpdate,
    AssetSelection, AssetSelectionList, AssetSelectionUpdate,
    VisualContextResponse, AssetUsageRecord
)

router = APIRouter()

# Allowed image formats
ALLOWED_FORMATS = {'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB (NFR-005)
MAX_ASSETS_PER_PROJECT = 100  # T055: NFR-002 - 100 assets per project limit

# Asset type options (legacy - keeping for backwards compatibility)
ASSET_TYPES = ['logo', 'background', 'person', 'reference', 'other']

# Asset category options (new smart categories)
ASSET_CATEGORIES = ['Logo', 'Pessoa', 'Background', 'Produto', 'Referência', 'Outro']


def extract_image_metadata(image: Image.Image, file_size: int, format: str) -> dict:
    """
    Extract metadata from PIL Image

    Returns:
        Dict with dimensions, file_size, format, color_mode
    """
    width, height = image.size

    return {
        "dimensions": f"{width}x{height}",
        "width": width,
        "height": height,
        "file_size": f"{file_size / 1024:.1f}KB" if file_size < 1024 * 1024 else f"{file_size / (1024 * 1024):.1f}MB",
        "file_size_bytes": file_size,
        "format": format.upper(),
        "color_mode": image.mode,
        "tags": []
    }


def generate_thumbnail(image: Image.Image, size: tuple = (400, 400)) -> bytes:
    """
    Generate thumbnail from PIL Image

    Args:
        image: PIL Image object
        size: Tuple of (width, height) for thumbnail

    Returns:
        Thumbnail image as WebP bytes
    """
    # Create a copy to avoid modifying original
    thumb = image.copy()

    # Keep transparency! WebP supports alpha channel natively.
    # No need to convert RGBA to RGB - that would bake in a white background.

    # Use thumbnail() to maintain aspect ratio
    thumb.thumbnail(size, Image.Resampling.LANCZOS)

    # Save as WebP for efficient storage (preserves transparency if RGBA)
    output = io.BytesIO()
    thumb.save(output, format='WEBP', quality=85)
    output.seek(0)

    return output.getvalue()


@router.post("/projects/{project_id}/assets/upload")
async def upload_visual_asset(
    project_id: str,
    file: UploadFile = File(...),
    asset_type: str = Form(...),
    folder_id: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # Comma-separated tags
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a visual asset (logo, background, person photo, reference image)

    Features:
    - Validates image format and size
    - Extracts metadata (dimensions, file size, format, color mode)
    - Generates 400x400 WebP thumbnail
    - Stores original and thumbnail in R2 storage
    - Creates Document record with is_reference_asset=True

    Args:
        project_id: Project ID to attach asset to
        file: Image file upload
        asset_type: Type of asset ('logo', 'background', 'person', 'reference', 'other')
        folder_id: Optional folder ID to organize asset
        name: Optional custom name (defaults to filename)
        tags: Optional comma-separated tags

    Returns:
        Document schema with asset metadata
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # T055: Check asset count limit (NFR-002)
    current_asset_count = db.query(Document).filter(
        Document.project_id == project_id,
        Document.is_reference_asset == True,
        Document.deleted_at == None
    ).count()

    if current_asset_count >= MAX_ASSETS_PER_PROJECT:
        raise HTTPException(
            status_code=400,
            detail=f"Project has reached maximum asset limit ({MAX_ASSETS_PER_PROJECT}). Delete some assets to upload more."
        )

    # Validate asset_type
    if asset_type not in ASSET_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid asset_type. Must be one of: {', '.join(ASSET_TYPES)}"
        )

    # Validate file type
    if file.content_type not in ALLOWED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format. Allowed formats: PNG, JPEG, WebP"
        )

    # Read file content
    file_content = await file.read()
    file_size = len(file_content)

    # Validate file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024 * 1024)}MB"
        )

    try:
        # Load image with Pillow
        image = Image.open(io.BytesIO(file_content))

        # Extract metadata
        file_format = image.format or file.filename.split('.')[-1].upper()
        metadata = extract_image_metadata(image, file_size, file_format)

        # Parse tags
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
            metadata['tags'] = tag_list

        # Generate thumbnail
        thumbnail_bytes = generate_thumbnail(image)

        # Generate unique ID
        asset_id = str(uuid.uuid4())

        # Determine file extension
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'

        # Upload original to R2 storage
        original_filename = f"{asset_id}.{file_ext}"
        original_folder = f"projects/{project_id}/assets/{asset_type}"
        original_url = upload_file(
            file_data=file_content,
            file_name=original_filename,
            content_type=file.content_type,
            folder=original_folder
        )

        # Upload thumbnail to R2 storage
        thumbnail_filename = f"{asset_id}_thumb.webp"
        thumbnail_folder = f"projects/{project_id}/assets/{asset_type}/thumbnails"
        thumbnail_url = upload_file(
            file_data=thumbnail_bytes,
            file_name=thumbnail_filename,
            content_type="image/webp",
            folder=thumbnail_folder
        )

        # Create Document record
        asset_name = name or file.filename
        db_asset = Document(
            id=asset_id,
            title=asset_name,
            content="",  # No markdown content for images
            status="art_ok",  # Assets are immediately ready
            media_type="image",
            project_id=project_id,
            folder_id=folder_id,
            file_url=original_url,
            thumbnail_url=thumbnail_url,
            is_reference_asset=True,  # Mark as visual asset
            asset_type=asset_type,
            asset_metadata=metadata
        )

        db.add(db_asset)
        db.commit()
        db.refresh(db_asset)

        return {
            "id": db_asset.id,
            "title": db_asset.title,
            "asset_type": db_asset.asset_type,
            "file_url": db_asset.file_url,
            "thumbnail_url": db_asset.thumbnail_url,
            "asset_metadata": db_asset.asset_metadata,
            "created_at": db_asset.created_at,
            "message": "Visual asset uploaded successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process image: {str(e)}"
        )


@router.get("/projects/{project_id}/assets")
async def list_visual_assets(
    project_id: str,
    asset_type: Optional[str] = Query(None, description="Filter by asset type"),
    folder_id: Optional[str] = Query(None, description="Filter by folder"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    search: Optional[str] = Query(None, description="Search by title"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List visual assets for a project with filtering

    Args:
        project_id: Project ID
        asset_type: Optional filter by asset type
        folder_id: Optional filter by folder
        tags: Optional filter by tags (comma-separated, matches any)
        search: Optional search by title
        limit: Max results (default 100, max 500)
        offset: Pagination offset

    Returns:
        List of visual assets with metadata
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Build query
    query = db.query(Document).filter(
        Document.project_id == project_id,
        Document.is_reference_asset == True,
        Document.deleted_at == None  # Exclude soft-deleted
    )

    # Apply filters
    if asset_type:
        if asset_type not in ASSET_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid asset_type. Must be one of: {', '.join(ASSET_TYPES)}"
            )
        query = query.filter(Document.asset_type == asset_type)

    if folder_id:
        query = query.filter(Document.folder_id == folder_id)

    if search:
        query = query.filter(Document.title.ilike(f"%{search}%"))

    # Filter by tags (if any tag matches)
    if tags:
        tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
        # JSONB contains operator - check if any tag is in the tags array
        for tag in tag_list:
            query = query.filter(
                Document.asset_metadata['tags'].astext.contains(tag)
            )

    # Order by creation date (newest first)
    query = query.order_by(Document.created_at.desc())

    # Count total
    total = query.count()

    # Apply pagination
    assets = query.offset(offset).limit(limit).all()

    # Format response
    results = []
    for asset in assets:
        results.append({
            "id": asset.id,
            "title": asset.title,
            "asset_type": asset.asset_type,
            "file_url": asset.file_url,
            "thumbnail_url": asset.thumbnail_url,
            "asset_metadata": asset.asset_metadata,
            "folder_id": asset.folder_id,
            # Feature 011: Smart Visual Assets classification fields
            "asset_category": asset.asset_category,
            "asset_tags": asset.asset_tags,
            "ai_description": asset.ai_description,
            "created_at": asset.created_at,
            "updated_at": asset.updated_at
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "assets": results
    }


@router.get("/projects/{project_id}/assets/{asset_id}")
async def get_visual_asset(
    project_id: str,
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a single visual asset by ID

    Returns:
        Visual asset with full metadata
    """
    asset = db.query(Document).filter(
        Document.id == asset_id,
        Document.project_id == project_id,
        Document.is_reference_asset == True,
        Document.deleted_at == None
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Visual asset not found")

    return {
        "id": asset.id,
        "title": asset.title,
        "asset_type": asset.asset_type,
        "file_url": asset.file_url,
        "thumbnail_url": asset.thumbnail_url,
        "asset_metadata": asset.asset_metadata,
        "folder_id": asset.folder_id,
        "created_at": asset.created_at,
        "updated_at": asset.updated_at
    }


@router.put("/projects/{project_id}/assets/{asset_id}")
async def update_visual_asset(
    project_id: str,
    asset_id: str,
    title: Optional[str] = Form(None),
    asset_type: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    folder_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update visual asset metadata

    Args:
        project_id: Project ID
        asset_id: Asset ID
        title: Optional new title
        asset_type: Optional new asset type
        tags: Optional new comma-separated tags
        folder_id: Optional new folder ID

    Returns:
        Updated visual asset
    """
    asset = db.query(Document).filter(
        Document.id == asset_id,
        Document.project_id == project_id,
        Document.is_reference_asset == True,
        Document.deleted_at == None
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Visual asset not found")

    # Update fields
    if title is not None:
        asset.title = title

    if asset_type is not None:
        if asset_type not in ASSET_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid asset_type. Must be one of: {', '.join(ASSET_TYPES)}"
            )
        asset.asset_type = asset_type

    if tags is not None:
        tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
        # Update tags in metadata
        if asset.asset_metadata:
            asset.asset_metadata['tags'] = tag_list
        else:
            asset.asset_metadata = {'tags': tag_list}

    if folder_id is not None:
        asset.folder_id = folder_id if folder_id else None

    asset.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(asset)

    return {
        "id": asset.id,
        "title": asset.title,
        "asset_type": asset.asset_type,
        "file_url": asset.file_url,
        "thumbnail_url": asset.thumbnail_url,
        "asset_metadata": asset.asset_metadata,
        "folder_id": asset.folder_id,
        "created_at": asset.created_at,
        "updated_at": asset.updated_at,
        "message": "Visual asset updated successfully"
    }


@router.delete("/projects/{project_id}/assets/{asset_id}")
async def delete_visual_asset(
    project_id: str,
    asset_id: str,
    hard_delete: bool = Query(False, description="Permanently delete (true) or soft delete/archive (false)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete visual asset

    Args:
        project_id: Project ID
        asset_id: Asset ID
        hard_delete: If true, permanently delete. If false, soft delete (archive)

    Returns:
        Success message
    """
    asset = db.query(Document).filter(
        Document.id == asset_id,
        Document.project_id == project_id,
        Document.is_reference_asset == True
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Visual asset not found")

    if hard_delete:
        # Permanently delete from database
        # Note: Files in R2 storage are kept for now (can implement cleanup later)
        db.delete(asset)
        db.commit()
        return {"message": "Visual asset permanently deleted"}
    else:
        # Soft delete (archive)
        asset.deleted_at = datetime.utcnow()
        db.commit()
        return {
            "message": "Visual asset archived successfully",
            "id": asset.id,
            "deleted_at": asset.deleted_at
        }


# ============================================================================
# SMART VISUAL ASSETS ENDPOINTS (Feature 011)
# ============================================================================

# -----------------------------------------------------------------------------
# US1: Asset Classification
# -----------------------------------------------------------------------------

@router.post("/assets/{asset_id}/classify", response_model=AssetClassificationResult)
async def classify_asset(
    asset_id: str,
    force: bool = Query(False, description="Force re-classification even if already classified"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Classify a visual asset using AI vision (FR-001, FR-002)

    Analyzes the image and suggests:
    - Category: Logo, Pessoa, Background, Produto, Outro
    - Tags: Up to 10 descriptive tags
    - Description: Brief AI-generated description

    Args:
        asset_id: The asset (document) ID to classify
        force: Force re-classification even if already classified

    Returns:
        AssetClassificationResult with suggested classification
    """
    result = await visual_asset_service.classify_asset(db, asset_id, force)

    if not result:
        raise HTTPException(
            status_code=422,
            detail="Could not classify asset. Ensure it's a valid image asset."
        )

    return result


@router.patch("/assets/{asset_id}/metadata")
async def update_asset_metadata(
    asset_id: str,
    metadata: AssetMetadataUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update asset classification metadata (FR-003, FR-004, FR-005)

    Used when confirming AI suggestions or manually editing classification.

    Args:
        asset_id: The asset (document) ID
        metadata: Updated category, tags, and/or description

    Returns:
        Updated visual asset
    """
    asset = await visual_asset_service.update_asset_metadata(db, asset_id, metadata)

    if not asset:
        raise HTTPException(status_code=404, detail="Visual asset not found")

    return {
        "id": asset.id,
        "title": asset.title,
        "category": asset.asset_category,
        "tags": asset.asset_tags,
        "ai_description": asset.ai_description,
        "file_url": asset.file_url,
        "thumbnail_url": asset.thumbnail_url,
        "updated_at": asset.updated_at,
        "message": "Asset metadata updated successfully"
    }


# -----------------------------------------------------------------------------
# US1: Visual Assets List with Categories
# -----------------------------------------------------------------------------

@router.get("/projects/{project_id}/visual-assets", response_model=VisualAssetList)
async def list_visual_assets_with_categories(
    project_id: str,
    category: Optional[str] = Query(None, description="Filter by category"),
    include_unclassified: bool = Query(True, description="Include unclassified assets"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List visual assets organized by category (FR-008, FR-011)

    Args:
        project_id: Project ID
        category: Optional category filter
        include_unclassified: Include assets without classification

    Returns:
        VisualAssetList with assets grouped by category
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Parse category if provided
    cat_filter = None
    if category:
        try:
            cat_filter = AssetCategory(category)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category. Must be one of: {', '.join(ASSET_CATEGORIES)}"
            )

    return visual_asset_service.get_visual_assets(db, project_id, cat_filter, include_unclassified)


@router.get("/projects/{project_id}/visual-assets/summary", response_model=VisualAssetsSummary)
async def get_visual_assets_summary(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get summary of visual assets by category (FR-011)

    Args:
        project_id: Project ID

    Returns:
        VisualAssetsSummary with counts per category
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return visual_asset_service.get_visual_assets_summary(db, project_id)


# -----------------------------------------------------------------------------
# US2: Visual Context Settings
# -----------------------------------------------------------------------------

@router.get("/projects/{project_id}/assistant/visual-settings")
async def get_visual_settings(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get visual context settings for a project (FR-006, FR-007)

    Creates default settings if none exist.

    Args:
        project_id: Project ID

    Returns:
        AssistantVisualSettings
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    settings = visual_asset_service.get_or_create_visual_settings(db, project_id)

    return {
        "id": settings.id,
        "project_id": settings.project_id,
        "is_enabled": settings.is_enabled,
        "mode": settings.mode,
        "assets_per_category": settings.assets_per_category,
        "created_at": settings.created_at,
        "updated_at": settings.updated_at
    }


@router.put("/projects/{project_id}/assistant/visual-settings")
async def update_visual_settings(
    project_id: str,
    update: AssistantVisualSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update visual context settings (FR-006, FR-007, FR-009, FR-010)

    Args:
        project_id: Project ID
        update: Settings to update

    Returns:
        Updated AssistantVisualSettings
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    settings = visual_asset_service.update_visual_settings(db, project_id, update)

    return {
        "id": settings.id,
        "project_id": settings.project_id,
        "is_enabled": settings.is_enabled,
        "mode": settings.mode,
        "assets_per_category": settings.assets_per_category,
        "created_at": settings.created_at,
        "updated_at": settings.updated_at,
        "message": "Visual settings updated successfully"
    }


# -----------------------------------------------------------------------------
# US2: Asset Selections (Manual Mode)
# -----------------------------------------------------------------------------

@router.get("/projects/{project_id}/assistant/visual-settings/selections", response_model=AssetSelectionList)
async def get_asset_selections(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get manual mode asset selections (FR-008)

    Args:
        project_id: Project ID

    Returns:
        AssetSelectionList with selected assets
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return visual_asset_service.get_asset_selections(db, project_id)


@router.put("/projects/{project_id}/assistant/visual-settings/selections", response_model=AssetSelectionList)
async def update_asset_selections(
    project_id: str,
    update: AssetSelectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update manual mode asset selections (FR-008)

    Replaces all current selections with new list.

    Args:
        project_id: Project ID
        update: List of asset IDs to select

    Returns:
        Updated AssetSelectionList
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return visual_asset_service.update_asset_selections(db, project_id, update.asset_ids)


# -----------------------------------------------------------------------------
# US3: Visual Context for Generation
# -----------------------------------------------------------------------------

@router.get("/projects/{project_id}/assistant/visual-context", response_model=VisualContextResponse)
async def get_visual_context(
    project_id: str,
    limit: int = Query(5, ge=1, le=5, description="Max assets to return (NFR-003)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get resolved visual context for image generation (FR-012, FR-013, NFR-003)

    Returns the list of assets that should be used as visual references
    based on current settings (manual selections or auto rotation).

    Args:
        project_id: Project ID
        limit: Maximum assets to return (max 5 per NFR-003)

    Returns:
        VisualContextResponse with resolved assets
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return visual_asset_service.get_visual_context(db, project_id, limit)


# -----------------------------------------------------------------------------
# US4: Usage Tracking for Rotation
# -----------------------------------------------------------------------------

@router.post("/projects/{project_id}/assistant/visual-context/record-usage")
async def record_asset_usage(
    project_id: str,
    usage: AssetUsageRecord,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record asset usage for rotation algorithm (FR-016, NFR-004)

    Called after successful image generation to track which assets were used.

    Args:
        project_id: Project ID
        usage: Asset IDs and optional generation reference

    Returns:
        Success message with count
    """
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    count = visual_asset_service.record_asset_usage(
        db,
        usage.asset_ids,
        usage.generation_id
    )

    return {
        "message": f"Recorded usage for {count} assets",
        "count": count
    }
