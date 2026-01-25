"""
Image Generation Router
Endpoints for AI-powered image generation using OpenRouter and fal.ai.
Includes Visual Generation Studio endpoints (Feature 027).
Feature 029: fal.ai migration for advanced editing (inpaint, edit, utilities).
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import asyncio
import uuid
import logging
from storage_service import upload_file

logger = logging.getLogger(__name__)


class ReferenceAsset(BaseModel):
    """Reference asset with individual usage mode"""
    id: str
    usage_mode: str  # 'style', 'compose', 'base'
from database import get_db
import models
from models import StylePreset
from image_generation_service import (
    generate_and_store_image,
    DEFAULT_MODEL
)
from image_naming_service import generate_image_title
from services.model_config_service import ModelConfigService
from services.fal_ai_service import (
    fal_service,
    FalAIError,
    FalAIAuthError,
    FalAICreditsError,
    ALL_MODELS,
    TEXT_TO_IMAGE_MODELS,
    IMAGE_TO_IMAGE_MODELS,
    get_model_by_id,
    model_supports_mask,
    select_appropriate_model,
)
from ai_usage_service import log_ai_usage
from pricing_service import calculate_image_cost, fetch_generation_cost
from supabase_auth import get_current_user, get_current_user_from_token
from models import User, Project
from services.visual_asset_service import visual_asset_service
from services.prompt_enrichment_service import (
    PromptEnrichmentService,
    get_brand_context_for_project
)
from schemas import (
    StylePreset as StylePresetSchema, StylePresetList,
    ImageBatchRequest, ImageBatchResponse, ImageBatchProgress,
    InpaintRequest, EditRequest, RemoveBackgroundRequest,
    UpscaleRequest, EnhanceRequest, ImageOperationResponse,
    UnifiedGenerateRequest, UnifiedGenerateResponse,
)
import time
import json

# Feature 030: Redis service for persistent batch progress tracking
from services.redis_service import create_batch, update_image_status, get_batch_status as redis_get_batch_status

# In-memory storage for batch progress (fallback, Redis is primary)
batch_progress_store: Dict[str, ImageBatchProgress] = {}

# Feature 030: Semaphore to limit concurrent fal.ai API calls
# Prevents rate limiting and ensures UI responsiveness during batch generation
FAL_SEMAPHORE = asyncio.Semaphore(3)  # Max 3 concurrent fal.ai calls


async def with_exponential_backoff(
    func,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    *args,
    **kwargs
):
    """
    Feature 030: Execute async function with exponential backoff retry.

    Retries on rate limit (429) and server errors (5xx) with exponential delay.

    Args:
        func: Async function to call
        max_retries: Maximum number of retry attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        *args, **kwargs: Arguments to pass to func
    """
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except FalAIError as e:
            last_exception = e
            # Only retry on rate limit (429) or server errors (5xx)
            if e.status_code not in (429, 500, 502, 503, 504):
                raise

            if attempt == max_retries:
                logger.error(f"Max retries ({max_retries}) reached for fal.ai call")
                raise

            # Calculate delay with exponential backoff and jitter
            delay = min(base_delay * (2 ** attempt), max_delay)
            jitter = delay * 0.1 * (0.5 - asyncio.get_event_loop().time() % 1)
            actual_delay = delay + jitter

            logger.warning(
                f"fal.ai call failed (attempt {attempt + 1}/{max_retries + 1}), "
                f"retrying in {actual_delay:.1f}s: {e.message}"
            )
            await asyncio.sleep(actual_delay)
        except Exception as e:
            # Don't retry on other exceptions
            raise

    if last_exception:
        raise last_exception

router = APIRouter(prefix="/image-generation", tags=["image-generation"])


def get_workspace_id_from_project(db: Session, project_id: Optional[str]) -> Optional[str]:
    """Get workspace_id from project_id."""
    if not project_id:
        return None
    project = db.query(Project).filter(Project.id == project_id).first()
    return project.workspace_id if project else None


class ImageGenerationRequest(BaseModel):
    """Request to generate a new image"""
    prompt: str
    project_id: str
    title: Optional[str] = None
    model: str = DEFAULT_MODEL
    aspect_ratio: str = "1:1"  # Gemini format: 1:1, 16:9, 9:16, etc.
    quality: str = "standard"
    style: Optional[str] = None
    folder_id: Optional[str] = None
    reference_assets: Optional[List[ReferenceAsset]] = None  # Reference assets with individual usage modes
    skip_visual_context: bool = False  # T042: Skip automatic visual context injection


class ImageRefinementRequest(BaseModel):
    """Request to refine an existing image"""
    document_id: str
    refinement_prompt: str
    model: Optional[str] = None
    aspect_ratio: Optional[str] = None
    quality: str = "standard"
    style: Optional[str] = None
    reference_assets: Optional[List[ReferenceAsset]] = None  # Additional reference assets for refinement


class ImageGenerationResponse(BaseModel):
    """Response from image generation"""
    document_id: str
    file_url: str
    thumbnail_url: str
    title: str
    generation_metadata: Dict[str, Any]


@router.get("/models")
async def list_available_models(
    db: Session = Depends(get_db),
    model_type: str = None  # Optional filter: "text-to-image", "image-to-image"
):
    """
    List available fal.ai image models (8 hardcoded models).

    Feature 029: Returns the 8 supported models:
    - 4 text-to-image models (no reference image required)
    - 4 image-to-image/edit models (require reference image)

    Args:
        model_type: Optional filter ("text-to-image" or "image-to-image")
    """
    # Select model list based on filter
    if model_type == "text-to-image":
        models = TEXT_TO_IMAGE_MODELS
    elif model_type == "image-to-image":
        models = IMAGE_TO_IMAGE_MODELS
    else:
        models = ALL_MODELS

    # Transform to match AvailableModel format expected by frontend
    return [
        {
            "id": model.id,
            "name": model.name,
            "description": model.description,
            "top_provider": model.provider,
            "model_type": model.model_type,
            "supports_mask": model.supports_mask,
            "max_images": model.max_images,
            "default_params": model.default_params,
        }
        for model in models
    ]


@router.post("/generate-unified", response_model=UnifiedGenerateResponse)
async def generate_unified(
    request: UnifiedGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unified image generation endpoint.

    Feature 029: Simplified endpoint that handles both text-to-image and image-to-image.

    Logic:
    - If image_urls provided -> uses image-to-image/edit model
    - If mask_url provided -> uses GPT-Image 1.5/edit (only model with mask support)
    - Otherwise -> uses text-to-image model

    The model is automatically selected based on the presence of reference images,
    but can be overridden by the `model` parameter.
    """
    start_time = time.time()

    try:
        # Verify project exists
        project = db.query(models.Project).filter(
            models.Project.id == request.project_id,
            models.Project.deleted_at == None
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Determine if we need edit mode
        has_reference = bool(request.image_urls)
        has_mask = bool(request.mask_url)

        # Select appropriate model
        model_config = select_appropriate_model(
            has_reference_image=has_reference,
            preferred_model_id=request.model
        )

        # If mask provided but model doesn't support it, force GPT-Image 1.5/edit
        if has_mask and not model_config.supports_mask:
            logger.warning(f"Model {model_config.id} doesn't support mask, switching to GPT-Image 1.5/edit")
            model_config = get_model_by_id("fal-ai/gpt-image-1.5/edit")

        # Call fal.ai service
        result = await fal_service.generate_image(
            prompt=request.prompt,
            model_id=model_config.id,
            image_urls=request.image_urls,
            mask_url=request.mask_url,
            params=request.params or {}
        )

        # Extract image URL from result
        image_url = None
        if "images" in result and result["images"]:
            image_url = result["images"][0].get("url")
        elif "image" in result:
            image_url = result["image"].get("url")
        elif "output" in result and isinstance(result["output"], dict):
            image_url = result["output"].get("url")

        if not image_url:
            logger.error(f"Failed to extract image URL from result: {result}")
            raise FalAIError("No image returned from fal.ai")

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)

        # Download and store image
        stored = await download_and_store_fal_image(
            image_url=image_url,
            project_id=request.project_id,
            title=f"Generated: {request.prompt[:50]}...",
            prompt=request.prompt,
            operation_type="generate" if not has_reference else "edit",
            model_id=model_config.id,
            generation_metadata={
                "prompt": request.prompt,
                "model": model_config.id,
                "model_type": model_config.model_type,
                "supports_mask": model_config.supports_mask,
                "params": request.params or {},
                "has_reference": has_reference,
                "has_mask": has_mask,
                "processing_time_ms": processing_time_ms,
            },
            db=db
        )

        logger.info(f"Unified generation completed: {stored['document_id']} in {processing_time_ms}ms")

        return UnifiedGenerateResponse(
            success=True,
            document_id=stored["document_id"],
            file_url=stored["file_url"],
            thumbnail_url=stored["thumbnail_url"],
            title=f"Generated: {request.prompt[:50]}...",
            model_used=model_config.id,
            model_type=model_config.model_type,
            supports_mask=model_config.supports_mask,
            processing_time_ms=processing_time_ms,
            generation_metadata={
                "prompt": request.prompt,
                "model": model_config.id,
                "params": request.params or {},
            }
        )

    except FalAIAuthError as e:
        logger.error(f"Unified generate auth error: {e}")
        raise HTTPException(status_code=401, detail=e.message)
    except FalAICreditsError as e:
        logger.error(f"Unified generate credits error: {e}")
        raise HTTPException(status_code=402, detail=e.message)
    except FalAIError as e:
        logger.error(f"Unified generate fal.ai error: {e}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unified generate failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")


@router.post("/generate", response_model=ImageGenerationResponse)
async def generate_image(
    request: ImageGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a new image from a text prompt

    Creates a new document with media_type='image' and stores the generated image
    """
    start_time = time.time()  # Start timing
    try:
        # Verify project exists
        project = db.query(models.Project).filter(
            models.Project.id == request.project_id
        ).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Verify folder exists if provided
        if request.folder_id:
            folder = db.query(models.Folder).filter(
                models.Folder.id == request.folder_id,
                models.Folder.project_id == request.project_id
            ).first()
            if not folder:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Folder not found"
                )

        # Fetch reference assets if provided
        reference_image_urls = []
        asset_usage_instructions = []
        visual_context_asset_ids = []  # T042: Track asset IDs for usage recording
        visual_context_used = False

        if request.reference_assets:
            # Limit to 5 references
            ref_assets = request.reference_assets[:5]

            for ref_asset in ref_assets:
                asset = db.query(models.Document).filter(
                    models.Document.id == ref_asset.id,
                    models.Document.project_id == request.project_id,
                    models.Document.is_reference_asset == True,
                    models.Document.deleted_at == None
                ).first()

                if asset and asset.file_url:
                    reference_image_urls.append(asset.file_url)
                    visual_context_asset_ids.append(asset.id)

                    # Build instruction for this specific asset
                    asset_title = asset.title or "reference image"
                    if ref_asset.usage_mode == "style":
                        asset_usage_instructions.append(f"use the visual style from '{asset_title}'")
                    elif ref_asset.usage_mode == "compose":
                        asset_usage_instructions.append(f"incorporate elements from '{asset_title}'")
                    elif ref_asset.usage_mode == "base":
                        asset_usage_instructions.append(f"use '{asset_title}' as the base")
                else:
                    print(f"Warning: Asset {ref_asset.id} not found or invalid")

        # T042: Auto-inject visual context if no manual references and not skipped
        # Feature 028: Uses intelligent AI-based asset selection based on prompt
        elif not request.skip_visual_context:
            try:
                # Use intelligent selection based on prompt context
                visual_context = await visual_asset_service.get_intelligent_visual_context(
                    db, request.project_id, request.prompt
                )
                if visual_context.is_enabled and visual_context.assets:
                    for asset in visual_context.assets:
                        if asset.file_url:
                            reference_image_urls.append(asset.file_url)
                            visual_context_asset_ids.append(asset.id)
                    visual_context_used = True
                    print(f"📎 Visual context auto-injected: {len(reference_image_urls)} intelligently selected assets")
            except Exception as vc_error:
                print(f"⚠️ Failed to fetch visual context: {vc_error}")

        # Build enhanced prompt with individual asset instructions
        enhanced_prompt = request.prompt
        if asset_usage_instructions:
            instructions = ", ".join(asset_usage_instructions)
            enhanced_prompt = f"{request.prompt}. Reference instructions: {instructions}"

        # Generate and store image
        result = await generate_and_store_image(
            prompt=enhanced_prompt,
            project_id=request.project_id,
            model=request.model,
            aspect_ratio=request.aspect_ratio,
            quality=request.quality,
            style=request.style,
            reference_image_urls=reference_image_urls if reference_image_urls else None
        )

        # Create document record
        generation_metadata = result["generation_metadata"]
        if request.reference_assets:
            generation_metadata["reference_assets"] = [
                {"id": ra.id, "usage_mode": ra.usage_mode}
                for ra in request.reference_assets
            ]
        # T042: Add visual context info to metadata if auto-injected
        elif visual_context_used and visual_context_asset_ids:
            generation_metadata["visual_context"] = {
                "auto_injected": True,
                "asset_ids": visual_context_asset_ids,
                "asset_count": len(visual_context_asset_ids)
            }

        # Generate title using AI if not provided
        if request.title:
            image_title = request.title
        else:
            image_title = await generate_image_title(request.prompt)

        document = models.Document(
            title=image_title,
            content=request.prompt,  # Store the ORIGINAL prompt as content
            media_type="image",
            status="art_ok",
            project_id=request.project_id,
            folder_id=request.folder_id,
            file_url=result["file_url"],
            thumbnail_url=result["thumbnail_url"],
            generation_metadata=generation_metadata
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        # T052: Record asset usage for rotation algorithm
        if visual_context_asset_ids:
            try:
                visual_asset_service.record_asset_usage(
                    db=db,
                    asset_ids=visual_context_asset_ids,
                    generation_id=document.id
                )
                print(f"📊 Recorded usage for {len(visual_context_asset_ids)} visual assets")
            except Exception as usage_error:
                print(f"⚠️ Failed to record asset usage: {usage_error}")

        # Log AI usage
        try:
            duration_ms = int((time.time() - start_time) * 1000)

            # Fetch actual cost from OpenRouter
            cost = None
            generation_id = result.get("generation_id")
            if generation_id:
                cost = await fetch_generation_cost(generation_id)
                if cost is not None:
                    print(f"💰 OpenRouter actual image cost: ${cost:.8f}")
                else:
                    print(f"⚠️ Could not fetch cost for generation {generation_id}")

            # Create metadata JSON for image generation details
            image_metadata = {
                "aspect_ratio": request.aspect_ratio,
                "quality": request.quality,
                "style": request.style,
                "has_references": bool(request.reference_assets) or visual_context_used,
                "num_references": len(request.reference_assets) if request.reference_assets else len(visual_context_asset_ids),
                "visual_context_auto": visual_context_used
            }

            log_ai_usage(
                db=db,
                user_id=str(current_user.id),
                workspace_id=get_workspace_id_from_project(db, request.project_id),
                project_id=request.project_id,
                model=request.model,
                provider="openrouter",
                request_type="image",
                input_tokens=0,
                output_tokens=0,
                prompt_preview=request.prompt,
                response_preview=f"Image generated: {document.file_url}",
                tool_calls=[json.dumps(image_metadata)],
                duration_ms=duration_ms,
                cost=cost
            )
        except Exception as e:
            print(f"Failed to log AI usage: {e}")

        return ImageGenerationResponse(
            document_id=document.id,
            file_url=document.file_url,
            thumbnail_url=document.thumbnail_url,
            title=document.title,
            generation_metadata=document.generation_metadata
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image generation failed: {str(e)}"
        )


@router.post("/refine", response_model=ImageGenerationResponse)
async def refine_image(
    request: ImageRefinementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refine an existing image with a new prompt

    Takes an existing image document and generates a new version based on refinement instructions.
    Creates a new document to preserve the iteration history.
    """
    start_time = time.time()  # Start timing
    try:
        # Get existing document
        existing_doc = db.query(models.Document).filter(
            models.Document.id == request.document_id
        ).first()
        if not existing_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        if existing_doc.media_type != "image":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document is not an image"
            )

        # QUALITY FIX (Feature 016): Always use the ORIGINAL image as base
        # This prevents quality degradation from successive refinements
        original_image_id = existing_doc.original_image_id
        if original_image_id:
            # This is a refined image - find the original
            original_doc = db.query(models.Document).filter(
                models.Document.id == original_image_id
            ).first()
            if original_doc and original_doc.file_url:
                base_image_url = original_doc.file_url
                print(f"🔄 Refining from original image: {original_image_id}")
            else:
                # Fallback to current if original not found
                base_image_url = existing_doc.file_url
                print(f"⚠️ Original image {original_image_id} not found, using current")
        else:
            # This is an original image
            base_image_url = existing_doc.file_url
            original_image_id = existing_doc.id  # The current image IS the original

        # Get existing refinement history and accumulate prompts
        existing_history = existing_doc.refinement_history or []
        refinement_count = len(existing_history)

        # Process reference assets if provided
        reference_image_urls = []
        asset_usage_instructions = []

        if request.reference_assets:
            # Limit to 5 references
            ref_assets = request.reference_assets[:5]

            for ref_asset in ref_assets:
                asset = db.query(models.Document).filter(
                    models.Document.id == ref_asset.id,
                    models.Document.project_id == existing_doc.project_id,
                    models.Document.is_reference_asset == True,
                    models.Document.deleted_at == None
                ).first()

                if asset and asset.file_url:
                    reference_image_urls.append(asset.file_url)

                    # Build instruction for this specific asset
                    asset_title = asset.title or "reference image"
                    if ref_asset.usage_mode == "style":
                        asset_usage_instructions.append(f"use the visual style from '{asset_title}'")
                    elif ref_asset.usage_mode == "compose":
                        asset_usage_instructions.append(f"incorporate elements from '{asset_title}'")
                    elif ref_asset.usage_mode == "base":
                        asset_usage_instructions.append(f"use '{asset_title}' as the base")
                else:
                    print(f"Warning: Asset {ref_asset.id} not found or invalid")

        # Build enhanced prompt with individual asset instructions
        refinement_prompt = request.refinement_prompt
        if asset_usage_instructions:
            instructions = ", ".join(asset_usage_instructions)
            refinement_prompt = f"{request.refinement_prompt}. Reference instructions: {instructions}"

        # Use same model and aspect_ratio if not specified
        model = request.model or existing_doc.generation_metadata.get("model", DEFAULT_MODEL) if existing_doc.generation_metadata else DEFAULT_MODEL

        # Try to get aspect_ratio from metadata, fall back to size if aspect_ratio not found (for backward compatibility)
        aspect_ratio = request.aspect_ratio or existing_doc.generation_metadata.get("aspect_ratio", existing_doc.generation_metadata.get("size", "1:1")) if existing_doc.generation_metadata else "1:1"

        # Generate new image WITH base image for true refinement
        result = await generate_and_store_image(
            prompt=refinement_prompt,
            project_id=existing_doc.project_id,
            model=model,
            aspect_ratio=aspect_ratio,
            quality=request.quality,
            style=request.style,
            base_image_url=base_image_url,  # Pass the previous image!
            reference_image_urls=reference_image_urls if reference_image_urls else None
        )

        # Build accumulated refinement history (Feature 016)
        from datetime import datetime
        new_history_entry = {
            "prompt": request.refinement_prompt,
            "applied_at": datetime.utcnow().isoformat()
        }
        accumulated_history = existing_history + [new_history_entry]

        # Create new document for the refined version
        generation_metadata = {
            **result["generation_metadata"],
            "refined_from": existing_doc.id,
            "refinement_prompt": request.refinement_prompt,
            "refinement_count": refinement_count + 1
        }
        if request.reference_assets:
            generation_metadata["reference_assets"] = [
                {"id": ra.id, "usage_mode": ra.usage_mode}
                for ra in request.reference_assets
            ]

        new_document = models.Document(
            title=f"{existing_doc.title} (Refined)",
            content=request.refinement_prompt,  # Save only the original refinement instructions (not enhanced)
            media_type="image",
            status="art_ok",
            project_id=existing_doc.project_id,
            folder_id=existing_doc.folder_id,
            file_url=result["file_url"],
            thumbnail_url=result["thumbnail_url"],
            generation_metadata=generation_metadata,
            # Feature 016: Track original image and refinement history
            original_image_id=original_image_id,
            refinement_history=accumulated_history
        )

        db.add(new_document)
        db.commit()
        db.refresh(new_document)

        # Log AI usage
        try:
            duration_ms = int((time.time() - start_time) * 1000)

            # Fetch actual cost from OpenRouter
            cost = None
            generation_id = result.get("generation_id")
            if generation_id:
                cost = await fetch_generation_cost(generation_id)
                if cost is not None:
                    print(f"💰 OpenRouter actual refinement cost: ${cost:.8f}")
                else:
                    print(f"⚠️ Could not fetch cost for generation {generation_id}")

            # Create metadata JSON for image refinement details
            image_metadata = {
                "aspect_ratio": aspect_ratio,
                "quality": request.quality,
                "style": request.style,
                "is_refinement": True,
                "refined_from": existing_doc.id
            }

            log_ai_usage(
                db=db,
                user_id=str(current_user.id),
                workspace_id=get_workspace_id_from_project(db, existing_doc.project_id),
                project_id=existing_doc.project_id,
                model=model,
                provider="openrouter",
                request_type="image",
                input_tokens=0,
                output_tokens=0,
                prompt_preview=refinement_prompt,
                response_preview=f"Image refined: {new_document.file_url}",
                tool_calls=[json.dumps(image_metadata)],
                duration_ms=duration_ms,
                cost=cost
            )
        except Exception as e:
            print(f"Failed to log AI usage: {e}")

        return ImageGenerationResponse(
            document_id=new_document.id,
            file_url=new_document.file_url,
            thumbnail_url=new_document.thumbnail_url,
            title=new_document.title,
            generation_metadata=new_document.generation_metadata
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Image refinement error: {error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image refinement failed: {str(e)}"
        )


@router.get("/document/{document_id}/metadata")
async def get_image_metadata(
    document_id: str,
    db: Session = Depends(get_db)
):
    """
    Get generation metadata for an image document
    """
    document = db.query(models.Document).filter(
        models.Document.id == document_id
    ).first()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if document.media_type != "image":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not an image"
        )

    return {
        "document_id": document.id,
        "title": document.title,
        "prompt": document.content,
        "file_url": document.file_url,
        "thumbnail_url": document.thumbnail_url,
        "generation_metadata": document.generation_metadata,
        "created_at": document.created_at
    }


# ============================================================================
# VISUAL GENERATION STUDIO ENDPOINTS (Feature 027)
# ============================================================================

@router.get("/style-presets", response_model=StylePresetList)
async def get_style_presets(
    db: Session = Depends(get_db)
):
    """
    Get all active style presets for image generation, grouped by type.

    Returns:
    - visual_styles: Aesthetic/visual style presets (photographic, watercolor, etc.)
    - layouts: Structure/layout presets for marketing (banner, carousel, etc.)

    Feature 027 - Visual Generation Studio
    """
    presets = db.query(StylePreset).filter(
        StylePreset.is_active == True
    ).order_by(StylePreset.sort_order).all()

    # Separate by preset_type
    visual_styles = [StylePresetSchema.model_validate(p) for p in presets if p.preset_type == 'visual_style']
    layouts = [StylePresetSchema.model_validate(p) for p in presets if p.preset_type == 'layout']

    return StylePresetList(
        visual_styles=visual_styles,
        layouts=layouts,
        total=len(presets)
    )


async def generate_batch_variation(
    variation_index: int,
    prompt: str,
    style_modifier: str,
    project_id: str,
    model: str,
    aspect_ratio: str,
    creativity: float,
    batch_id: str,
    user_id: str,
    reference_image_url: Optional[str] = None,
    visual_context_urls: Optional[List[str]] = None,
    project_context: Optional[str] = None,
    # Feature 028: Asset tracking
    visual_context_asset_ids: Optional[List[str]] = None,
    visual_context_source: Optional[str] = None,
    asset_mode: Optional[str] = None,
    campaign_id: Optional[str] = None,
    tags: Optional[List[str]] = None,
    channel: Optional[str] = None,
    # Feature 028: Brand context tracking
    brand_context_applied: bool = False
) -> Dict[str, Any]:
    """Generate a single variation for a batch request.

    Note: Creates its own database session to avoid conflicts during parallel execution.
    """
    from database import SessionLocal

    db = SessionLocal()
    try:
        # Combine prompt with style modifier and project context
        enhanced_prompt = prompt

        # Add project context to prompt if available
        if project_context:
            enhanced_prompt = f"{enhanced_prompt}. Context: {project_context}"

        # Feature 028: Add asset mode instruction if using manual references
        if visual_context_urls and asset_mode and visual_context_source == "manual":
            if asset_mode == "style":
                enhanced_prompt = f"{enhanced_prompt}. Use the visual style from the reference images."
            elif asset_mode == "compose":
                enhanced_prompt = f"{enhanced_prompt}. Incorporate elements from the reference images."
            elif asset_mode == "base":
                enhanced_prompt = f"{enhanced_prompt}. Use the reference images as the base."

        # Add style modifier
        if style_modifier:
            enhanced_prompt = f"{enhanced_prompt}. Style: {style_modifier}"

        # Combine reference image with visual context
        all_reference_urls = []
        if reference_image_url:
            all_reference_urls.append(reference_image_url)
        if visual_context_urls:
            all_reference_urls.extend(visual_context_urls)

        # Feature 029: Use fal.ai for fal-ai models
        is_fal_model = model.startswith("fal-ai/")

        if is_fal_model:
            # Use fal.ai service with rate limiting (Feature 030)
            print(f"🎨 Using fal.ai for model {model}")

            # Build params for fal.ai
            fal_params = {"aspect_ratio": aspect_ratio}

            # Feature 030: Use semaphore to limit concurrent API calls
            # and exponential backoff for retry on rate limits
            async with FAL_SEMAPHORE:
                fal_result = await with_exponential_backoff(
                    fal_service.generate_image,
                    max_retries=3,
                    base_delay=1.0,
                    prompt=enhanced_prompt,
                    model_id=model,
                    image_urls=all_reference_urls if all_reference_urls else None,
                    params=fal_params
                )

            # Extract first image from result
            if not fal_result.get("images"):
                raise Exception("No images generated by fal.ai")

            fal_image = fal_result["images"][0]
            image_url = fal_image.get("url")

            if not image_url:
                raise Exception("No image URL in fal.ai response")

            # Download and store the image
            from storage_service import download_and_upload_image
            stored_result = await download_and_upload_image(
                image_url=image_url,
                project_id=project_id,
                filename_prefix=f"generated_{batch_id}_{variation_index}"
            )

            result = {
                "file_url": stored_result["file_url"],
                "thumbnail_url": stored_result.get("thumbnail_url", stored_result["file_url"]),
                "generation_metadata": {
                    "model": model,
                    "provider": "fal.ai",
                    "aspect_ratio": aspect_ratio,
                    "fal_response": fal_result.get("timings", {}),
                }
            }
        else:
            # Use existing OpenRouter-based generation
            print(f"🎨 Using OpenRouter for model {model}")
            result = await generate_and_store_image(
                prompt=enhanced_prompt,
                project_id=project_id,
                model=model,
                aspect_ratio=aspect_ratio,
                quality="standard",
                style=None,
                base_image_url=reference_image_url,
                reference_image_urls=all_reference_urls if all_reference_urls else None
            )

        # Generate title
        image_title = await generate_image_title(prompt)

        # Build generation metadata with visual context info (T036)
        generation_metadata = {
            **result["generation_metadata"],
            "style_modifier": style_modifier,
            "creativity": creativity,
            "batch_id": batch_id
        }

        # Feature 028: Log visual context usage
        if visual_context_asset_ids:
            generation_metadata["visual_context"] = {
                "source": visual_context_source,  # 'manual' or 'auto'
                "asset_ids": visual_context_asset_ids,
                "asset_count": len(visual_context_asset_ids),
                "asset_mode": asset_mode
            }

        # Feature 028: Add campaign metadata
        if campaign_id:
            generation_metadata["campaign_id"] = campaign_id

        # Feature 028: Log brand context usage (T040)
        generation_metadata["brand_context_applied"] = brand_context_applied

        # Create document
        variation_set_id = uuid.UUID(batch_id)
        document = models.Document(
            title=image_title,
            content=prompt,
            media_type="image",
            status="art_ok",
            project_id=project_id,
            file_url=result["file_url"],
            thumbnail_url=result["thumbnail_url"],
            generation_metadata=generation_metadata,
            variation_set_id=variation_set_id,
            variation_index=variation_index,
            variation_modifier=style_modifier,
            # Feature 028: Link to campaign
            campaign_id=campaign_id,
            tags=tags,
            channel=channel
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        return {
            "success": True,
            "index": variation_index,
            "document_id": document.id,
            "file_url": document.file_url,
            "thumbnail_url": document.thumbnail_url,
            "title": document.title,
            "modifier": style_modifier
        }

    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "index": variation_index,
            "error": str(e),
            "modifier": style_modifier
        }
    finally:
        db.close()


async def process_batch_generation(
    batch_id: str,
    request: ImageBatchRequest,
    user_id: str,
    db: Session
):
    """Background task to process batch image generation."""
    from routers.projects import format_project_context

    count = request.count

    # Feature 030: Initialize batch in Redis for persistent progress tracking
    try:
        await create_batch(
            batch_id=batch_id,
            count=count,
            project_id=request.project_id,
            user_id=user_id
        )
        logger.info(f"Batch {batch_id} initialized in Redis")
    except Exception as redis_err:
        logger.warning(f"Failed to initialize batch in Redis, using in-memory fallback: {redis_err}")

    # Keep in-memory store for backward compatibility
    batch_progress_store[batch_id] = ImageBatchProgress(
        batch_id=batch_id,
        total=count,
        completed=0,
        failed=0,
        images=[],
        errors=[]
    )

    # Fetch project settings for context
    project_context = None
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if project and project.settings:
        project_context = format_project_context(project.settings)
        if project_context:
            print(f"📋 Project context loaded for batch generation")

    # Feature 028 (T038): Apply brand context enrichment if enabled
    enriched_prompt = request.prompt
    brand_context_applied = False

    # Default to True if not specified (backwards compatible)
    apply_brand_context = request.apply_brand_context if hasattr(request, 'apply_brand_context') else True

    if apply_brand_context:
        try:
            brand_context = await get_brand_context_for_project(db, request.project_id)
            if brand_context:
                print(f"🎨 Enriching prompt with brand context...")
                enrichment_service = PromptEnrichmentService(db)
                enrichment_result = await enrichment_service.enrich_prompt(
                    prompt=request.prompt,
                    project_id=request.project_id,
                    brand_context=brand_context
                )
                enriched_prompt = enrichment_result["enriched_prompt"]
                brand_context_applied = enrichment_result["brand_context_applied"]
                if brand_context_applied:
                    print(f"✨ Prompt enriched with brand context: {enriched_prompt[:100]}...")
        except Exception as enrich_error:
            print(f"⚠️ Failed to enrich prompt with brand context: {enrich_error}")
            # Continue with original prompt

    # Feature 028: Fetch visual context assets
    # Priority: manual reference_assets > automatic intelligent selection
    visual_context_urls = []
    visual_context_asset_ids = []
    visual_context_source = None  # 'manual' or 'auto'
    asset_mode = request.asset_mode or "style"

    # Check for manual reference assets first
    if request.reference_assets:
        # Fetch manually specified assets
        for asset_id in request.reference_assets[:5]:  # Limit to 5
            asset = db.query(models.Document).filter(
                models.Document.id == asset_id,
                models.Document.project_id == request.project_id,
                models.Document.is_reference_asset == True,
                models.Document.deleted_at == None
            ).first()
            if asset and asset.file_url:
                visual_context_urls.append(asset.file_url)
                visual_context_asset_ids.append(asset.id)
        if visual_context_urls:
            visual_context_source = "manual"
            print(f"📎 Manual reference assets loaded: {len(visual_context_urls)} assets (mode: {asset_mode})")
    else:
        # Fallback to intelligent AI-based selection
        try:
            visual_context = await visual_asset_service.get_intelligent_visual_context(
                db, request.project_id, request.prompt
            )
            if visual_context.is_enabled and visual_context.assets:
                for asset in visual_context.assets:
                    if asset.file_url:
                        visual_context_urls.append(asset.file_url)
                        visual_context_asset_ids.append(asset.id)
                if visual_context_urls:
                    visual_context_source = "auto"
                    print(f"📎 Auto visual context loaded: {len(visual_context_urls)} intelligently selected assets for batch")
        except Exception as vc_error:
            print(f"⚠️ Failed to fetch visual context for batch: {vc_error}")

    # Build style modifier from visual_style and/or layout presets
    modifiers = []

    # Check for visual_style preset (new field or legacy style_preset)
    visual_style_slug = request.visual_style or request.style_preset
    if visual_style_slug:
        preset = db.query(StylePreset).filter(
            StylePreset.slug == visual_style_slug,
            StylePreset.is_active == True
        ).first()
        if preset:
            modifiers.append(preset.prompt_modifier)

    # Check for layout preset
    if request.layout:
        layout_preset = db.query(StylePreset).filter(
            StylePreset.slug == request.layout,
            StylePreset.is_active == True
        ).first()
        if layout_preset:
            modifiers.append(layout_preset.prompt_modifier)

    # Combine modifiers
    style_modifier_base = ". ".join(modifiers) if modifiers else ""

    # Default creativity-based modifiers for variations
    creativity_modifiers = [
        "faithful to the original concept",
        "with subtle creative variations",
        "with moderate artistic interpretation",
        "with bold creative expression"
    ]

    # Generate variations in parallel for better performance
    # Create all tasks first
    tasks = []
    for i in range(count):
        creativity_idx = min(i, len(creativity_modifiers) - 1)
        style_mod = f"{style_modifier_base}, {creativity_modifiers[creativity_idx]}" if style_modifier_base else creativity_modifiers[creativity_idx]

        task = generate_batch_variation(
            variation_index=i,
            prompt=enriched_prompt,  # Use enriched prompt if brand context was applied
            style_modifier=style_mod,
            project_id=request.project_id,
            model=request.model,
            aspect_ratio=request.aspect_ratio,
            creativity=request.creativity,
            batch_id=batch_id,
            user_id=user_id,
            reference_image_url=request.reference_image_url,
            visual_context_urls=visual_context_urls if visual_context_urls else None,
            project_context=project_context,
            # Feature 028: Pass visual context metadata
            visual_context_asset_ids=visual_context_asset_ids if visual_context_asset_ids else None,
            visual_context_source=visual_context_source,
            asset_mode=asset_mode,
            campaign_id=request.campaign_id,
            tags=request.tags,
            channel=request.channel,
            # Feature 028: Pass brand context flag (T040)
            brand_context_applied=brand_context_applied
        )
        tasks.append(task)

    # Execute all image generations in parallel
    print(f"🚀 Starting parallel generation of {count} images...")
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Process results and update progress
    progress = batch_progress_store[batch_id]
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            # Handle exceptions from gather
            progress.failed += 1
            progress.errors.append(str(result))
            # Feature 030: Update Redis with failure
            try:
                await update_image_status(
                    batch_id=batch_id,
                    index=i,
                    status="failed",
                    error=str(result)
                )
            except Exception as redis_err:
                logger.warning(f"Failed to update Redis for failed image {i}: {redis_err}")
        elif result.get("success"):
            progress.completed += 1
            progress.images.append(result)
            # Feature 030: Update Redis with completion
            try:
                await update_image_status(
                    batch_id=batch_id,
                    index=result.get("index", i),
                    status="completed",
                    document_id=result.get("document_id"),
                    file_url=result.get("file_url"),
                    thumbnail_url=result.get("thumbnail_url")
                )
            except Exception as redis_err:
                logger.warning(f"Failed to update Redis for completed image {i}: {redis_err}")
        else:
            progress.failed += 1
            progress.errors.append(result.get("error", "Unknown error"))
            # Feature 030: Update Redis with failure
            try:
                await update_image_status(
                    batch_id=batch_id,
                    index=result.get("index", i),
                    status="failed",
                    error=result.get("error", "Unknown error")
                )
            except Exception as redis_err:
                logger.warning(f"Failed to update Redis for failed image {i}: {redis_err}")

    batch_progress_store[batch_id] = progress
    print(f"✅ Parallel generation complete: {progress.completed} succeeded, {progress.failed} failed")


@router.post("/generate-batch", response_model=ImageBatchResponse)
async def generate_image_batch(
    request: ImageBatchRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate multiple image variations in parallel.

    Starts background generation and returns a batch_id immediately.
    Use GET /batch/{batch_id}/stream to monitor progress via SSE.

    Feature 027 - Visual Generation Studio
    """
    # Verify project exists
    project = db.query(Project).filter(
        Project.id == request.project_id,
        Project.deleted_at == None
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Generate batch ID
    batch_id = str(uuid.uuid4())

    # Start background task
    background_tasks.add_task(
        process_batch_generation,
        batch_id=batch_id,
        request=request,
        user_id=str(current_user.id),
        db=db
    )

    return ImageBatchResponse(
        batch_id=batch_id,
        status="processing",
        message=f"Generating {request.count} variations"
    )


@router.get("/batch/{batch_id}/stream")
async def stream_batch_progress(
    batch_id: str,
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Stream batch generation progress via Server-Sent Events (SSE).

    Token is passed via query parameter since EventSource doesn't support headers.

    Events:
    - variation_started: When a variation begins generating
    - variation_complete: When a variation finishes (includes image data)
    - variation_failed: When a variation fails
    - batch_complete: When all variations are done

    Feature 027 - Visual Generation Studio
    """
    # Authenticate via query parameter token (SSE doesn't support headers)
    if not token:
        raise HTTPException(status_code=401, detail="Token required for SSE authentication")

    current_user = await get_current_user_from_token(token, db)

    async def event_generator():
        last_completed = 0
        last_failed = 0
        sent_images = set()  # Track which image indices we've already sent

        while True:
            # Feature 030: Try Redis first, fallback to in-memory
            redis_progress = None
            try:
                redis_progress = await redis_get_batch_status(batch_id)
            except Exception as redis_err:
                logger.warning(f"Failed to get batch status from Redis: {redis_err}")

            if redis_progress:
                # Use Redis data
                total = redis_progress["progress"]["total"]
                completed = redis_progress["progress"]["completed"]
                failed = redis_progress["progress"]["failed"]
                status = redis_progress["progress"]["status"]
                images = redis_progress.get("images", [])

                # Send new completed images from Redis
                for img in images:
                    if img["status"] == "completed" and img["index"] not in sent_images:
                        event_data = {
                            "type": "variation_complete",
                            "data": {
                                "success": True,
                                "index": img["index"],
                                "document_id": img["document_id"],
                                "file_url": img["file_url"],
                                "thumbnail_url": img["thumbnail_url"]
                            }
                        }
                        yield f"data: {json.dumps(event_data)}\n\n"
                        sent_images.add(img["index"])

                # Send new errors from Redis
                for img in images:
                    if img["status"] == "failed" and img["index"] not in sent_images:
                        event_data = {
                            "type": "variation_failed",
                            "data": {"error": img.get("error", "Unknown error"), "index": img["index"]}
                        }
                        yield f"data: {json.dumps(event_data)}\n\n"
                        sent_images.add(img["index"])

                last_completed = completed
                last_failed = failed

                # Check if complete
                if status == "completed" or (completed + failed >= total):
                    completed_images = [
                        {
                            "success": True,
                            "index": img["index"],
                            "document_id": img["document_id"],
                            "file_url": img["file_url"],
                            "thumbnail_url": img["thumbnail_url"]
                        }
                        for img in images if img["status"] == "completed"
                    ]
                    event_data = {
                        "type": "batch_complete",
                        "data": {
                            "batch_id": batch_id,
                            "total": total,
                            "completed": completed,
                            "failed": failed,
                            "images": completed_images
                        }
                    }
                    yield f"data: {json.dumps(event_data)}\n\n"
                    # Clean up in-memory store if it exists
                    if batch_id in batch_progress_store:
                        del batch_progress_store[batch_id]
                    break
            else:
                # Fallback to in-memory store
                progress = batch_progress_store.get(batch_id)

                if not progress:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Batch not found'})}\n\n"
                    break

                # Send new completed images
                if progress.completed > last_completed:
                    for i in range(last_completed, progress.completed):
                        if i < len(progress.images):
                            event_data = {
                                "type": "variation_complete",
                                "data": progress.images[i]
                            }
                            yield f"data: {json.dumps(event_data)}\n\n"
                    last_completed = progress.completed

                # Send new errors
                if progress.failed > last_failed:
                    for i in range(last_failed, progress.failed):
                        if i < len(progress.errors):
                            event_data = {
                                "type": "variation_failed",
                                "data": {"error": progress.errors[i]}
                            }
                            yield f"data: {json.dumps(event_data)}\n\n"
                    last_failed = progress.failed

                # Check if complete
                if progress.completed + progress.failed >= progress.total:
                    event_data = {
                        "type": "batch_complete",
                        "data": {
                            "batch_id": batch_id,
                            "total": progress.total,
                            "completed": progress.completed,
                            "failed": progress.failed,
                            "images": progress.images
                        }
                    }
                    yield f"data: {json.dumps(event_data)}\n\n"
                    # Clean up
                    del batch_progress_store[batch_id]
                    break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/batch/{batch_id}/status", response_model=ImageBatchProgress)
async def get_batch_status(
    batch_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get current status of a batch generation.

    Use this for polling instead of SSE if needed.
    Feature 027 - Visual Generation Studio
    """
    progress = batch_progress_store.get(batch_id)

    if not progress:
        raise HTTPException(status_code=404, detail="Batch not found or already completed")

    return progress


# ============================================================================
# FAL.AI IMAGE OPERATIONS ENDPOINTS (Feature 029)
# ============================================================================

async def upload_image_to_r2(
    image_data: bytes,
    project_id: str,
    content_type: str = "image/png"
) -> str:
    """Upload image bytes to R2 storage"""
    import uuid
    from storage_service import upload_file

    # Generate unique filename
    ext = content_type.split('/')[-1] if '/' in content_type else 'png'
    filename = f"generated_{uuid.uuid4().hex}.{ext}"
    folder = f"projects/{project_id}/images"

    return upload_file(
        file_data=image_data,
        file_name=filename,
        content_type=content_type,
        folder=folder
    )


async def generate_thumbnail(image_data: bytes, project_id: str) -> str:
    """Generate and upload thumbnail from image bytes"""
    import io
    import uuid
    from PIL import Image
    from storage_service import upload_file

    # Open image and create thumbnail
    image = Image.open(io.BytesIO(image_data))
    thumb = image.copy()
    thumb.thumbnail((400, 400), Image.Resampling.LANCZOS)

    # Convert to WebP bytes
    thumb_io = io.BytesIO()
    thumb.save(thumb_io, format='WEBP', quality=85)
    thumb_data = thumb_io.getvalue()

    # Upload thumbnail
    filename = f"thumb_{uuid.uuid4().hex}.webp"
    folder = f"projects/{project_id}/thumbnails"

    return upload_file(
        file_data=thumb_data,
        file_name=filename,
        content_type="image/webp",
        folder=folder
    )


async def download_and_store_fal_image(
    image_url: str,
    project_id: str,
    title: str,
    prompt: Optional[str] = None,
    operation_type: str = "edit",
    model_id: str = "fal.ai",
    generation_metadata: Optional[Dict[str, Any]] = None,
    db: Session = None
) -> Dict[str, Any]:
    """
    Download image from fal.ai result URL and store in R2.
    Creates a document record with full operation metadata.

    Feature 029: Uses existing `documents` table instead of separate image_operations table.
    """
    import httpx

    async with httpx.AsyncClient() as client:
        response = await client.get(image_url)
        response.raise_for_status()
        image_data = response.content

    # Determine content type
    content_type = response.headers.get("content-type", "image/png")

    # Upload to R2
    file_url = await upload_image_to_r2(
        image_data,
        project_id=project_id,
        content_type=content_type
    )

    # Generate thumbnail
    thumbnail_url = await generate_thumbnail(image_data, project_id)

    # Build complete generation_metadata
    metadata = generation_metadata or {}
    metadata.update({
        "provider": "fal.ai",
        "model": model_id,
        "operation_type": operation_type
    })
    if prompt and "prompt" not in metadata:
        metadata["prompt"] = prompt

    # Create document record
    document = models.Document(
        title=title,
        content=prompt or "",
        media_type="image",
        status="art_ok",
        project_id=project_id,
        file_url=file_url,
        thumbnail_url=thumbnail_url,
        generation_metadata=metadata
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return {
        "document_id": document.id,
        "file_url": file_url,
        "thumbnail_url": thumbnail_url
    }


@router.post("/inpaint", response_model=ImageOperationResponse)
async def inpaint_image(
    request: InpaintRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Edit an image using a mask (inpainting).
    White areas in mask will be edited, black areas preserved.

    Feature 029: Uses fal.ai FLUX.1 Fill Pro for precise inpainting.
    Operation metadata stored in documents.generation_metadata (no separate table needed).
    """
    start_time = time.time()

    # Verify project exists
    project = db.query(Project).filter(
        Project.id == request.project_id,
        Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        # Call fal.ai inpaint API
        result = await fal_service.inpaint(
            image_url=request.image_url,
            mask_url=request.mask_url,
            prompt=request.prompt,
            model=request.model,
            guidance_scale=request.guidance_scale,
            num_inference_steps=request.num_inference_steps
        )

        # Get result image URL
        logger.info(f"fal.ai inpaint result: {result}")
        image_url = result.get("images", [{}])[0].get("url") or result.get("image", {}).get("url")
        if not image_url:
            logger.error(f"Failed to extract image URL from result: {result}")
            raise FalAIError("No image returned from fal.ai")

        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)

        # Download and store image with full metadata
        stored = await download_and_store_fal_image(
            image_url=image_url,
            project_id=request.project_id,
            title=f"Inpaint: {request.prompt[:50]}...",
            prompt=request.prompt,
            operation_type="inpaint",
            model_id=request.model,
            generation_metadata={
                "prompt": request.prompt,
                "params": {
                    "mask_url": request.mask_url,
                    "guidance_scale": request.guidance_scale,
                    "num_inference_steps": request.num_inference_steps
                },
                "processing_time_ms": processing_time,
                "cost_cents": 0  # TODO: Calculate actual cost from fal.ai response
            },
            db=db
        )

        logger.info(f"Inpaint completed: {stored['document_id']} in {processing_time}ms")

        return ImageOperationResponse(
            document_id=stored["document_id"],
            file_url=stored["file_url"],
            thumbnail_url=stored["thumbnail_url"],
            operation_type="inpaint",
            model_used=request.model,
            cost_cents=0,
            processing_time_ms=processing_time
        )

    except FalAIAuthError as e:
        logger.error(f"Inpaint auth error: {e}")
        raise HTTPException(status_code=401, detail=e.message)
    except FalAICreditsError as e:
        logger.error(f"Inpaint credits error: {e}")
        raise HTTPException(status_code=402, detail=e.message)
    except FalAIError as e:
        logger.error(f"Inpaint fal.ai error: {e}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Inpaint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Inpainting failed: {str(e)}")


@router.post("/edit", response_model=ImageOperationResponse)
async def edit_image(
    request: EditRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Edit an image using natural language instructions (no mask needed).

    Feature 029: Uses fal.ai FLUX Kontext for instruction-based editing.
    """
    start_time = time.time()

    # Verify project exists
    project = db.query(Project).filter(
        Project.id == request.project_id,
        Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        # Call fal.ai edit API
        result = await fal_service.edit(
            image_url=request.image_url,
            prompt=request.prompt,
            model=request.model,
            preserve_elements=request.preserve_elements,
            guidance_scale=request.guidance_scale
        )

        # Get result image URL
        image_url = result.get("images", [{}])[0].get("url") or result.get("image", {}).get("url")
        if not image_url:
            raise FalAIError("No image returned from fal.ai")

        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)

        # Download and store image with full metadata
        stored = await download_and_store_fal_image(
            image_url=image_url,
            project_id=request.project_id,
            title=f"Edit: {request.prompt[:50]}...",
            prompt=request.prompt,
            operation_type="edit",
            model_id=request.model,
            generation_metadata={
                "prompt": request.prompt,
                "params": {
                    "preserve_elements": request.preserve_elements,
                    "guidance_scale": request.guidance_scale
                },
                "processing_time_ms": processing_time,
                "cost_cents": 0
            },
            db=db
        )

        logger.info(f"Edit completed: {stored['document_id']} in {processing_time}ms")

        return ImageOperationResponse(
            document_id=stored["document_id"],
            file_url=stored["file_url"],
            thumbnail_url=stored["thumbnail_url"],
            operation_type="edit",
            model_used=request.model,
            cost_cents=0,
            processing_time_ms=processing_time
        )

    except FalAIAuthError as e:
        logger.error(f"Edit auth error: {e}")
        raise HTTPException(status_code=401, detail=e.message)
    except FalAICreditsError as e:
        logger.error(f"Edit credits error: {e}")
        raise HTTPException(status_code=402, detail=e.message)
    except FalAIError as e:
        logger.error(f"Edit fal.ai error: {e}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Edit failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image editing failed: {str(e)}")


@router.post("/remove-background", response_model=ImageOperationResponse)
async def remove_background(
    request: RemoveBackgroundRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove the background from an image. Returns PNG with alpha channel transparency.

    Feature 029: Uses fal.ai Bria RMBG 2.0 for professional background removal.
    """
    start_time = time.time()

    # Verify project exists
    project = db.query(Project).filter(
        Project.id == request.project_id,
        Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        # Call fal.ai remove background API
        result = await fal_service.remove_background(
            image_url=request.image_url,
            output_format=request.output_format
        )

        # Get result image URL
        image_url = result.get("image", {}).get("url")
        if not image_url:
            raise FalAIError("No image returned from fal.ai")

        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)

        # Download and store image with full metadata
        stored = await download_and_store_fal_image(
            image_url=image_url,
            project_id=request.project_id,
            title="Background Removed",
            operation_type="remove_bg",
            model_id="fal-ai/bria/background/remove",
            generation_metadata={
                "params": {"output_format": request.output_format},
                "processing_time_ms": processing_time,
                "cost_cents": 0
            },
            db=db
        )

        logger.info(f"Remove background completed: {stored['document_id']} in {processing_time}ms")

        return ImageOperationResponse(
            document_id=stored["document_id"],
            file_url=stored["file_url"],
            thumbnail_url=stored["thumbnail_url"],
            operation_type="remove_bg",
            model_used="fal-ai/bria/background/remove",
            cost_cents=0,
            processing_time_ms=processing_time
        )

    except FalAIError as e:
        logger.error(f"Remove background fal.ai error: {e}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Remove background failed: {e}")
        raise HTTPException(status_code=500, detail=f"Background removal failed: {str(e)}")


@router.post("/upscale", response_model=ImageOperationResponse)
async def upscale_image(
    request: UpscaleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upscale an image to higher resolution (2x or 4x).

    Feature 029: Uses fal.ai Clarity Upscaler for AI-powered upscaling.
    """
    start_time = time.time()

    # Verify project exists
    project = db.query(Project).filter(
        Project.id == request.project_id,
        Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        # Call fal.ai upscale API
        result = await fal_service.upscale(
            image_url=request.image_url,
            scale_factor=request.scale_factor,
            model=request.model
        )

        # Get result image URL
        image_url = result.get("image", {}).get("url")
        if not image_url:
            raise FalAIError("No image returned from fal.ai")

        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)

        # Download and store image with full metadata
        stored = await download_and_store_fal_image(
            image_url=image_url,
            project_id=request.project_id,
            title=f"Upscaled {request.scale_factor}x",
            operation_type="upscale",
            model_id=request.model,
            generation_metadata={
                "params": {"scale_factor": request.scale_factor},
                "processing_time_ms": processing_time,
                "cost_cents": 0
            },
            db=db
        )

        logger.info(f"Upscale completed: {stored['document_id']} in {processing_time}ms")

        return ImageOperationResponse(
            document_id=stored["document_id"],
            file_url=stored["file_url"],
            thumbnail_url=stored["thumbnail_url"],
            operation_type="upscale",
            model_used=request.model,
            cost_cents=0,
            processing_time_ms=processing_time
        )

    except FalAIError as e:
        logger.error(f"Upscale fal.ai error: {e}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Upscale failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upscaling failed: {str(e)}")


@router.post("/enhance", response_model=ImageOperationResponse)
async def enhance_image(
    request: EnhanceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enhance image quality (sharpness, colors, details).

    Feature 029: Uses fal.ai Clarity Upscaler with enhancement presets.
    """
    start_time = time.time()

    # Verify project exists
    project = db.query(Project).filter(
        Project.id == request.project_id,
        Project.deleted_at == None
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        # Call fal.ai enhance API
        result = await fal_service.enhance(
            image_url=request.image_url,
            enhancement_type=request.enhancement_type
        )

        # Get result image URL
        image_url = result.get("image", {}).get("url")
        if not image_url:
            raise FalAIError("No image returned from fal.ai")

        # Calculate processing time
        processing_time = int((time.time() - start_time) * 1000)

        # Download and store image with full metadata
        stored = await download_and_store_fal_image(
            image_url=image_url,
            project_id=request.project_id,
            title=f"Enhanced ({request.enhancement_type})",
            operation_type="enhance",
            model_id="fal-ai/clarity-upscaler",
            generation_metadata={
                "params": {"enhancement_type": request.enhancement_type},
                "processing_time_ms": processing_time,
                "cost_cents": 0
            },
            db=db
        )

        logger.info(f"Enhance completed: {stored['document_id']} in {processing_time}ms")

        return ImageOperationResponse(
            document_id=stored["document_id"],
            file_url=stored["file_url"],
            thumbnail_url=stored["thumbnail_url"],
            operation_type="enhance",
            model_used="fal-ai/clarity-upscaler",
            cost_cents=0,
            processing_time_ms=processing_time
        )

    except FalAIError as e:
        logger.error(f"Enhance fal.ai error: {e}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Enhance failed: {e}")
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")


# Note: /fal-models endpoint removed - follows CLAUDE.md "No Hardcoded Data" principle.
# If needed in future, implement dynamic model fetching directly from fal.ai API.
# Frontend should use hardcoded model IDs for now (e.g., "fal-ai/flux-pro/v1/fill").
