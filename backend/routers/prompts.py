"""
Prompts Router (Feature 016 - V1 Polish)

Provides endpoints for prompt-related operations, including
the prompt enrichment service for image generation.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, Project
from schemas import EnrichPromptRequest, EnrichPromptResponse
from supabase_auth import get_current_user
from services.prompt_enrichment_service import (
    PromptEnrichmentService,
    BrandContext,
    get_brand_context_for_project
)


router = APIRouter(
    prefix="/prompts",
    tags=["prompts"],
)


@router.post("/enrich", response_model=EnrichPromptResponse)
async def enrich_prompt(
    request: EnrichPromptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enrich a user prompt with brand context and image generation best practices.

    This endpoint takes a simple prompt and enhances it with:
    - Technical details (lighting, composition, perspective)
    - Style specifications (artistic style, mood, atmosphere)
    - Quality descriptors (high resolution, professional, detailed)
    - Brand context from project settings (colors, typography) when available

    The model used for enrichment is configurable via the admin panel
    (Settings > AI Models > prompt_enrichment).

    Args:
        request: EnrichPromptRequest with prompt and project_id

    Returns:
        EnrichPromptResponse with original and enriched prompts
    """
    # Validate project exists and user has access
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Get brand context from project settings
    brand_context = await get_brand_context_for_project(db, request.project_id)

    # Create enrichment service and process
    service = PromptEnrichmentService(db)
    result = await service.enrich_prompt(
        prompt=request.prompt,
        project_id=request.project_id,
        brand_context=brand_context
    )

    return EnrichPromptResponse(
        original_prompt=result["original_prompt"],
        enriched_prompt=result["enriched_prompt"],
        brand_context_applied=result["brand_context_applied"],
        model_used=result["model_used"]
    )
