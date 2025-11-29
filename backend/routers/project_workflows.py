"""
Project Workflows Router

Manages workflow templates within project context:
- List workflows available for a project
- Save workflow results to project
- Link workflows to project folders
- Track workflow usage per project
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import WorkflowExecution, WorkflowTemplate, User, Project, Document
from schemas import WorkflowExecution as WorkflowExecutionSchema
from supabase_auth import get_current_user
from datetime import datetime

router = APIRouter(
    prefix="/projects/{project_id}/workflows",
    tags=["project-workflows"],
)


@router.get("/available", response_model=List[dict])
async def list_available_workflows(
    project_id: str,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List workflows available for a specific project

    Returns both system templates and workspace-specific templates
    """
    # Verify project access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get workspace ID from project
    workspace_id = project.workspace_id

    # Query templates
    query = db.query(WorkflowTemplate).filter(
        (WorkflowTemplate.is_system == True) |
        (WorkflowTemplate.workspace_id == workspace_id)
    )

    if category:
        query = query.filter(WorkflowTemplate.category == category)

    templates = query.order_by(
        WorkflowTemplate.is_recommended.desc(),
        WorkflowTemplate.usage_count.desc()
    ).all()

    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "category": t.category,
            "is_system": t.is_system,
            "is_recommended": t.is_recommended,
            "usage_count": t.usage_count,
            "node_count": len(t.nodes_json) if t.nodes_json else 0
        }
        for t in templates
    ]


@router.get("/history", response_model=List[WorkflowExecutionSchema])
async def list_project_workflow_history(
    project_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get workflow execution history for a project
    """
    # Verify project access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Query executions
    executions = (
        db.query(WorkflowExecution)
        .filter(WorkflowExecution.project_id == project_id)
        .order_by(WorkflowExecution.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return executions


@router.post("/{execution_id}/save-to-project")
async def save_workflow_output_to_project(
    project_id: str,
    execution_id: str,
    folder_id: Optional[str] = None,
    document_title: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save workflow execution output as a document in the project

    Creates a new document with the workflow's final output
    """
    # Verify project access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get execution
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id,
        WorkflowExecution.project_id == project_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Workflow execution not found")

    if execution.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot save output from {execution.status} execution"
        )

    # Get final output
    final_output = execution.outputs.get("final_output", {})
    content = final_output.get("content", "")

    if not content:
        raise HTTPException(
            status_code=400,
            detail="No content to save from workflow execution"
        )

    # Create document
    document_id = str(uuid.uuid4())
    doc = Document(
        id=document_id,
        project_id=project_id,
        folder_id=folder_id,
        title=document_title or f"Workflow Output - {execution.workflow_name}",
        content=content,
        user_id=str(current_user.id),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(doc)

    # Update execution with document link
    generated_docs = execution.generated_document_ids or []
    generated_docs.append(document_id)
    execution.generated_document_ids = generated_docs

    db.commit()
    db.refresh(doc)

    return {
        "document_id": document_id,
        "title": doc.title,
        "created_at": doc.created_at,
        "message": "Workflow output saved to project successfully"
    }


@router.get("/{execution_id}/generated-documents")
async def list_generated_documents(
    project_id: str,
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all documents generated by a workflow execution
    """
    # Get execution
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id,
        WorkflowExecution.project_id == project_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Workflow execution not found")

    # Get generated documents
    doc_ids = execution.generated_document_ids or []

    if not doc_ids:
        return []

    documents = db.query(Document).filter(Document.id.in_(doc_ids)).all()

    return [
        {
            "id": doc.id,
            "title": doc.title,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
            "folder_id": doc.folder_id
        }
        for doc in documents
    ]


@router.get("/stats")
async def get_project_workflow_stats(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get workflow usage statistics for a project
    """
    # Verify project access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Count executions by status
    from sqlalchemy import func

    status_counts = (
        db.query(
            WorkflowExecution.status,
            func.count(WorkflowExecution.id).label("count")
        )
        .filter(WorkflowExecution.project_id == project_id)
        .group_by(WorkflowExecution.status)
        .all()
    )

    # Count total tokens used
    total_tokens = (
        db.query(func.sum(WorkflowExecution.total_tokens_used))
        .filter(WorkflowExecution.project_id == project_id)
        .scalar()
    ) or 0

    # Count documents generated
    doc_count = (
        db.query(func.count(Document.id))
        .join(WorkflowExecution, Document.id == func.any(WorkflowExecution.generated_document_ids))
        .filter(WorkflowExecution.project_id == project_id)
        .scalar()
    ) or 0

    # Most used templates
    template_usage = (
        db.query(
            WorkflowExecution.workflow_template_id,
            WorkflowExecution.workflow_name,
            func.count(WorkflowExecution.id).label("count")
        )
        .filter(WorkflowExecution.project_id == project_id)
        .group_by(WorkflowExecution.workflow_template_id, WorkflowExecution.workflow_name)
        .order_by(func.count(WorkflowExecution.id).desc())
        .limit(5)
        .all()
    )

    return {
        "project_id": project_id,
        "executions_by_status": {status: count for status, count in status_counts},
        "total_tokens_used": total_tokens,
        "documents_generated": doc_count,
        "most_used_templates": [
            {
                "template_id": t_id,
                "template_name": t_name,
                "execution_count": count
            }
            for t_id, t_name, count in template_usage
        ]
    }


import uuid
