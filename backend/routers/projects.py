"""
Project Settings Router
Endpoints for managing project settings (client info, target audience, brand voice, etc.)
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Project
from schemas import ProjectSettings, ProjectSettingsUpdate, ProjectContext
from supabase_auth import get_current_user

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

    return "\n".join(context_parts)


def get_missing_fields(settings: dict) -> List[str]:
    """Get list of fields that would improve AI responses if filled"""
    missing = []

    if not settings:
        return ["client_name", "description", "target_audience", "brand_voice"]

    if not settings.get("description"):
        missing.append("description")
    if not settings.get("target_audience"):
        missing.append("target_audience")
    if not settings.get("brand_voice"):
        missing.append("brand_voice")
    if not settings.get("key_messages"):
        missing.append("key_messages")

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
