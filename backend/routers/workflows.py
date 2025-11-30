"""
Workflow Templates API Router

Endpoints for managing workflow templates:
- List templates (system + workspace)
- Get template details
- Create custom template
- Update template
- Delete template
- Clone template
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import WorkflowTemplate, User, Workspace, Project, WorkflowExecution
from schemas import (
    WorkflowTemplateCreate,
    WorkflowTemplateUpdate,
    WorkflowTemplateDetail,
    WorkflowNode,
    WorkflowEdge
)
from supabase_auth import get_current_user
from services.workflow_validator import WorkflowValidator
import uuid
from datetime import datetime

router = APIRouter(
    prefix="/workflows",
    tags=["workflows"],
)


@router.get("/", response_model=List[WorkflowTemplateDetail])
async def list_workflow_templates(
    workspace_id: Optional[str] = None,
    project_id: Optional[str] = None,
    category: Optional[str] = None,
    is_system: Optional[bool] = None,
    is_recommended: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List workflow templates with optional filters

    Args:
        workspace_id: Filter by workspace ID
        project_id: Filter by project ID (not implemented yet)
        category: Filter by category (social_media, paid_ads, blog, email, seo)
        is_system: Filter system templates (True/False)
        is_recommended: Filter recommended templates (True/False)
    """
    query = db.query(WorkflowTemplate)

    # Filter by workspace if provided
    if workspace_id:
        query = query.filter(
            (WorkflowTemplate.workspace_id == workspace_id) |
            (WorkflowTemplate.is_system == True)
        )

    # Filter by project_id if provided (include project-specific + workspace + system)
    if project_id:
        query = query.filter(
            (WorkflowTemplate.project_id == project_id) |
            (WorkflowTemplate.project_id.is_(None))
        )

    # Filter by category if provided
    if category:
        query = query.filter(WorkflowTemplate.category == category)

    # Filter by is_system if provided
    if is_system is not None:
        query = query.filter(WorkflowTemplate.is_system == is_system)

    # Filter by is_recommended if provided
    if is_recommended is not None:
        query = query.filter(WorkflowTemplate.is_recommended == is_recommended)

    # Order by recommended first, then usage count, then creation date
    templates = query.order_by(
        WorkflowTemplate.is_recommended.desc(),
        WorkflowTemplate.is_system.desc(),
        WorkflowTemplate.usage_count.desc(),
        WorkflowTemplate.created_at.desc()
    ).all()

    return templates


@router.get("/{template_id}", response_model=WorkflowTemplateDetail)
async def get_workflow_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific workflow template"""
    template = db.query(WorkflowTemplate).filter(
        WorkflowTemplate.id == template_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Workflow template not found")

    return template


@router.post("/", response_model=WorkflowTemplateDetail)
async def create_workflow_template(
    template: WorkflowTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new custom workflow template"""
    # Validate workspace exists
    workspace = db.query(Workspace).filter(
        Workspace.id == template.workspace_id
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Validate project exists if provided
    if template.project_id:
        project = db.query(Project).filter(Project.id == template.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    # Validate workflow structure
    validator = WorkflowValidator()
    workflow_definition = {
        "nodes": [node.model_dump() for node in template.nodes],
        "edges": [edge.model_dump() for edge in template.edges]
    }
    validation_result = validator.validate_workflow_structure(workflow_definition)

    if not validation_result["valid"]:
        raise HTTPException(
            status_code=400,
            detail={"errors": validation_result["errors"], "warnings": validation_result["warnings"]}
        )

    # Create template
    db_template = WorkflowTemplate(
        id=str(uuid.uuid4()),
        workspace_id=template.workspace_id,
        project_id=template.project_id,
        name=template.name,
        description=template.description,
        category=template.category,
        nodes_json=[node.model_dump() for node in template.nodes],
        edges_json=[edge.model_dump() for edge in template.edges],
        default_params_json=template.default_params or {},
        is_system=template.is_system,
        is_recommended=template.is_recommended,
        version=template.version,
        usage_count=0,
        created_by=str(current_user.id)
    )

    db.add(db_template)
    db.commit()
    db.refresh(db_template)

    return db_template


@router.put("/{template_id}", response_model=WorkflowTemplateDetail)
async def update_workflow_template(
    template_id: str,
    template_update: WorkflowTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing workflow template"""
    # Get template
    template = db.query(WorkflowTemplate).filter(
        WorkflowTemplate.id == template_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Workflow template not found")

    # Only allow updating custom templates (not system templates)
    if template.is_system:
        raise HTTPException(status_code=403, detail="Cannot modify system templates")

    # Only allow creator to update
    if template.created_by != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only template creator can update it")

    # Update fields
    if template_update.name is not None:
        template.name = template_update.name

    if template_update.description is not None:
        template.description = template_update.description

    if template_update.category is not None:
        template.category = template_update.category

    if template_update.nodes is not None or template_update.edges is not None:
        # Get current or updated values
        nodes = template_update.nodes if template_update.nodes is not None else template.nodes_json
        edges = template_update.edges if template_update.edges is not None else template.edges_json

        # Validate new structure
        validator = WorkflowValidator()
        workflow_definition = {
            "nodes": [node.model_dump() if hasattr(node, 'model_dump') else node for node in nodes],
            "edges": [edge.model_dump() if hasattr(edge, 'model_dump') else edge for edge in edges]
        }
        validation_result = validator.validate_workflow_structure(workflow_definition)

        if not validation_result["valid"]:
            raise HTTPException(
                status_code=400,
                detail={"errors": validation_result["errors"], "warnings": validation_result["warnings"]}
            )

        # Update nodes if provided
        if template_update.nodes is not None:
            template.nodes_json = [node.model_dump() for node in template_update.nodes]

        # Update edges if provided
        if template_update.edges is not None:
            template.edges_json = [edge.model_dump() for edge in template_update.edges]

    if template_update.default_params is not None:
        template.default_params_json = template_update.default_params

    if template_update.is_recommended is not None:
        template.is_recommended = template_update.is_recommended

    template.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(template)

    return template


@router.delete("/{template_id}")
async def delete_workflow_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a workflow template"""
    # Get template
    template = db.query(WorkflowTemplate).filter(
        WorkflowTemplate.id == template_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Workflow template not found")

    # Only allow deleting custom templates (not system templates)
    if template.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system templates")

    # Only allow creator to delete
    if template.created_by != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only template creator can delete it")

    # Check for active executions
    active_executions = db.query(WorkflowExecution).filter(
        WorkflowExecution.template_id == template_id,
        WorkflowExecution.status.in_(["running", "pending", "queued"])
    ).count()

    if active_executions > 0:
        raise HTTPException(status_code=400, detail="Cannot delete workflow with active executions")

    db.delete(template)
    db.commit()

    return {"message": "Workflow template deleted successfully", "id": template_id}


@router.post("/{template_id}/duplicate", response_model=WorkflowTemplateDetail)
async def duplicate_workflow_template(
    template_id: str,
    workspace_id: str,
    project_id: Optional[str] = None,
    name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Duplicate an existing workflow template to a workspace

    Args:
        template_id: ID of template to duplicate
        workspace_id: Target workspace ID
        name: Optional custom name for duplicated template
    """
    # Get source template
    source_template = db.query(WorkflowTemplate).filter(
        WorkflowTemplate.id == template_id
    ).first()

    if not source_template:
        raise HTTPException(status_code=404, detail="Workflow template not found")

    # Validate workspace exists
    workspace = db.query(Workspace).filter(
        Workspace.id == workspace_id
    ).first()

    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Create duplicated template
    duplicated_name = name if name else f"{source_template.name} (Copy)"

    duplicated_template = WorkflowTemplate(
        id=str(uuid.uuid4()),
        workspace_id=workspace_id,
        project_id=project_id,
        name=duplicated_name,
        description=source_template.description,
        category=source_template.category,
        nodes_json=source_template.nodes_json.copy() if source_template.nodes_json else [],
        edges_json=source_template.edges_json.copy() if source_template.edges_json else [],
        default_params_json=source_template.default_params_json.copy() if source_template.default_params_json else {},
        is_system=False,  # Duplicated templates are never system templates
        is_recommended=False,
        version=source_template.version,
        usage_count=0,
        created_by=str(current_user.id)
    )

    db.add(duplicated_template)
    db.commit()
    db.refresh(duplicated_template)

    return duplicated_template


@router.post("/validate")
async def validate_workflow(
    workflow: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validate workflow structure before saving

    Args:
        workflow: Dict with 'nodes' and 'edges' arrays

    Returns:
        ValidationResult with 'valid', 'errors', and 'warnings'
    """
    validator = WorkflowValidator()
    result = validator.validate_workflow_structure(workflow)

    return {
        "valid": result["valid"],
        "errors": result["errors"],
        "warnings": result["warnings"]
    }


@router.get("/categories/list")
async def list_workflow_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of available workflow categories"""
    return {
        "categories": [
            {"id": "social_media", "name": "Social Media", "description": "Instagram, Facebook, LinkedIn posts"},
            {"id": "paid_ads", "name": "Paid Advertising", "description": "Facebook Ads, Google Ads campaigns"},
            {"id": "blog", "name": "Blog Content", "description": "Blog posts, articles, SEO content"},
            {"id": "email", "name": "Email Marketing", "description": "Email campaigns, newsletters"},
            {"id": "seo", "name": "SEO", "description": "SEO-optimized content, meta descriptions"},
            {"id": "creative", "name": "Creative", "description": "Custom creative workflows"}
        ]
    }
