"""
Image Generation Router
Endpoints for AI-powered image generation using OpenRouter
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ReferenceAsset(BaseModel):
    """Reference asset with individual usage mode"""
    id: str
    usage_mode: str  # 'style', 'compose', 'base'
from database import get_db
import models
from image_generation_service import (
    generate_and_store_image,
    get_available_models,
    DEFAULT_MODEL
)
from ai_usage_service import log_ai_usage
from pricing_config import calculate_image_cost
from auth import get_current_user
from models import User

router = APIRouter(prefix="/image-generation", tags=["image-generation"])


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


class ImageRefinementRequest(BaseModel):
    """Request to refine an existing image"""
    document_id: str
    refinement_prompt: str
    model: Optional[str] = None
    aspect_ratio: Optional[str] = None
    quality: str = "standard"
    style: Optional[str] = None


class ImageGenerationResponse(BaseModel):
    """Response from image generation"""
    document_id: str
    file_url: str
    thumbnail_url: str
    title: str
    generation_metadata: Dict[str, Any]


@router.get("/models")
async def list_available_models():
    """
    Get list of available image generation models from OpenRouter
    """
    return await get_available_models()


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

        document = models.Document(
            title=request.title or f"Generated Image - {request.model}",
            content=request.prompt,  # Store the ORIGINAL prompt as content
            media_type="image",
            status="approved",
            project_id=request.project_id,
            folder_id=request.folder_id,
            file_url=result["file_url"],
            thumbnail_url=result["thumbnail_url"],
            generation_metadata=generation_metadata
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        # Log AI usage
        try:
            cost = calculate_image_cost(request.model, request.aspect_ratio, request.quality)
            log_ai_usage(
                db=db,
                user_id=current_user.id,
                model=request.model,
                provider="openrouter",
                request_type="image",
                input_tokens=0,
                output_tokens=0,
                project_id=request.project_id,
                prompt_preview=request.prompt,
                response_preview=f"Image generated: {document.file_url}",
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

        # Get the base image URL for refinement
        base_image_url = existing_doc.file_url

        # Use refinement prompt directly (not combined with original)
        # The model will see the image and the new instructions
        refinement_prompt = request.refinement_prompt

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
            base_image_url=base_image_url  # Pass the previous image!
        )

        # Create new document for the refined version
        new_document = models.Document(
            title=f"{existing_doc.title} (Refined)",
            content=refinement_prompt,  # Save only the refinement instructions
            media_type="image",
            status="approved",
            project_id=existing_doc.project_id,
            folder_id=existing_doc.folder_id,
            file_url=result["file_url"],
            thumbnail_url=result["thumbnail_url"],
            generation_metadata={
                **result["generation_metadata"],
                "refined_from": existing_doc.id,
                "refinement_prompt": request.refinement_prompt
            }
        )

        db.add(new_document)
        db.commit()
        db.refresh(new_document)

        # Log AI usage
        try:
            cost = calculate_image_cost(model, aspect_ratio, request.quality)
            log_ai_usage(
                db=db,
                user_id=current_user.id,
                model=model,
                provider="openrouter",
                request_type="image",
                input_tokens=0,
                output_tokens=0,
                project_id=existing_doc.project_id,
                prompt_preview=refinement_prompt,
                response_preview=f"Image refined: {new_document.file_url}",
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
