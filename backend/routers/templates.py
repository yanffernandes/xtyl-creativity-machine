"""
Templates Router - Chat templates for AI assistant

Templates are quick recipes that start conversations with specialized prompts.
Users fill in variables and get a pre-configured conversation.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from datetime import datetime
import re

from database import get_db
from models import Template, User, ChatConversation, Project
from schemas import (
    Template as TemplateSchema,
    TemplateCreate,
    TemplateUpdate,
    TemplateListResponse,
    CreateChatFromTemplateRequest,
    CreateChatFromTemplateResponse,
)
from supabase_auth import get_current_user

router = APIRouter(prefix="/templates", tags=["templates"])


# ============================================================================
# TEMPLATE CRUD ENDPOINTS
# ============================================================================

@router.get("/", response_model=TemplateListResponse)
async def list_templates(
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_featured: Optional[bool] = None,
    include_system: bool = True,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List available templates.

    - System templates (is_system=True) are always visible to all users
    - User can also see their own templates and workspace templates
    """
    query = db.query(Template).filter(Template.is_active == True)

    # Filter: system templates OR user's own templates
    if include_system:
        query = query.filter(
            or_(
                Template.is_system == True,
                Template.user_id == current_user.id,
            )
        )
    else:
        query = query.filter(Template.user_id == current_user.id)

    # Filter by category
    if category:
        query = query.filter(Template.category == category)

    # Filter by featured
    if is_featured is not None:
        query = query.filter(Template.is_featured == is_featured)

    # Search by name/description
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Template.name.ilike(search_term),
                Template.description.ilike(search_term),
            )
        )

    # Get total count
    total = query.count()

    # Order: featured first, then by usage, then by name
    query = query.order_by(
        Template.is_featured.desc(),
        Template.usage_count.desc(),
        Template.name,
    )

    # Pagination
    templates = query.offset(offset).limit(limit).all()

    return TemplateListResponse(
        templates=[TemplateSchema.model_validate(t) for t in templates],
        total=total,
    )


@router.get("/categories")
async def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List available template categories with counts"""
    categories = [
        {"id": "trafego_pago", "name": "Trafego Pago", "icon": "target"},
        {"id": "social_media", "name": "Social Media", "icon": "smartphone"},
        {"id": "email", "name": "Email Marketing", "icon": "mail"},
        {"id": "copy", "name": "Copywriting", "icon": "pen-tool"},
        {"id": "seo", "name": "SEO & Blog", "icon": "file-text"},
        {"id": "criativo", "name": "Criativo", "icon": "palette"},
    ]

    # Get counts for each category
    for cat in categories:
        count = db.query(Template).filter(
            Template.is_active == True,
            Template.category == cat["id"],
            or_(
                Template.is_system == True,
                Template.user_id == current_user.id,
            )
        ).count()
        cat["count"] = count

    return {"categories": categories}


@router.get("/{template_id}", response_model=TemplateSchema)
async def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific template by ID"""
    template = db.query(Template).filter(Template.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check access: system templates are public, others need ownership
    if not template.is_system and template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return TemplateSchema.model_validate(template)


@router.post("/", response_model=TemplateSchema)
async def create_template(
    template_data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new user template"""
    template = Template(
        user_id=current_user.id,
        name=template_data.name,
        description=template_data.description,
        category=template_data.category,
        icon=template_data.icon,
        prompt=template_data.prompt,
        variables=[v.model_dump() for v in template_data.variables] if template_data.variables else [],
        initial_message=template_data.initial_message,
        expert_name=template_data.expert_name,
        estimated_outputs=template_data.estimated_outputs,
        tags=template_data.tags,
        is_system=False,
        is_active=True,
        is_featured=False,
    )

    db.add(template)
    db.commit()
    db.refresh(template)

    return TemplateSchema.model_validate(template)


@router.put("/{template_id}", response_model=TemplateSchema)
async def update_template(
    template_id: str,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a user template (cannot update system templates)"""
    template = db.query(Template).filter(Template.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if template.is_system:
        raise HTTPException(status_code=403, detail="Cannot modify system templates")

    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Update fields
    update_data = template_data.model_dump(exclude_unset=True)

    # Handle variables specially (convert Pydantic models to dicts)
    if "variables" in update_data and update_data["variables"] is not None:
        update_data["variables"] = [
            v.model_dump() if hasattr(v, 'model_dump') else v
            for v in update_data["variables"]
        ]

    for field, value in update_data.items():
        setattr(template, field, value)

    template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(template)

    return TemplateSchema.model_validate(template)


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a user template (cannot delete system templates)"""
    template = db.query(Template).filter(Template.id == template_id).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if template.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system templates")

    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(template)
    db.commit()

    return {"success": True, "message": "Template deleted"}


# ============================================================================
# CREATE CHAT FROM TEMPLATE
# ============================================================================

def substitute_variables(text: str, variables: dict) -> str:
    """
    Substitute {{variable}} placeholders with actual values.
    Also handles {{#if variable}}...{{/if}} conditionals.
    """
    if not text:
        return text

    # First handle conditionals: {{#if var}}content{{/if}}
    def replace_conditional(match):
        var_name = match.group(1)
        content = match.group(2)
        if var_name in variables and variables[var_name]:
            # Also substitute variables within the conditional content
            return substitute_variables(content, variables)
        return ""

    # Pattern for {{#if varname}}...{{/if}}
    conditional_pattern = r'\{\{#if\s+(\w+)\}\}(.*?)\{\{/if\}\}'
    text = re.sub(conditional_pattern, replace_conditional, text, flags=re.DOTALL)

    # Then handle simple variable substitution: {{varname}}
    for key, value in variables.items():
        text = text.replace(f"{{{{{key}}}}}", str(value) if value else "")

    return text


@router.post("/start-chat", response_model=CreateChatFromTemplateResponse)
async def create_chat_from_template(
    request: CreateChatFromTemplateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new chat conversation from a template.

    1. Fetches the template
    2. Substitutes variables in the prompt
    3. Creates a new ChatConversation with the customized system prompt
    4. Returns the conversation ID for the frontend to navigate to
    """
    # Get template
    template = db.query(Template).filter(
        Template.id == request.template_id,
        Template.is_active == True,
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check access
    if not template.is_system and template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this template")

    # Validate required variables
    template_vars = template.variables or []
    for var in template_vars:
        if var.get("required", True) and var["key"] not in request.variables:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required variable: {var['key']} ({var.get('label', var['key'])})"
            )

    # Substitute variables in the prompt
    customized_prompt = substitute_variables(template.prompt, request.variables)

    # Substitute variables in initial message if present
    customized_initial_message = None
    if template.initial_message:
        customized_initial_message = substitute_variables(
            template.initial_message, request.variables
        )

    # Generate conversation title
    conv_title = request.title
    if not conv_title:
        # Use template name + first variable value
        first_var_value = next(iter(request.variables.values()), None) if request.variables else None
        if first_var_value and len(first_var_value) <= 50:
            conv_title = f"{template.name}: {first_var_value}"
        else:
            conv_title = template.name

    # Get workspace_id from project
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Create the conversation with the system prompt as first message
    initial_messages = [
        {"role": "system", "content": customized_prompt}
    ]

    conversation = ChatConversation(
        user_id=current_user.id,
        project_id=request.project_id,
        workspace_id=project.workspace_id,
        title=conv_title,
        messages_json=initial_messages,
        message_count=1,
    )

    db.add(conversation)

    # Increment template usage count
    template.usage_count = (template.usage_count or 0) + 1

    db.commit()
    db.refresh(conversation)

    return CreateChatFromTemplateResponse(
        conversation_id=conversation.id,
        title=conversation.title,
        first_message=customized_initial_message,
    )
