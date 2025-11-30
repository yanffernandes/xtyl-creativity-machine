"""
Workflow Executions API Router

Endpoints for managing workflow executions:
- Launch workflow execution
- Get execution status
- List executions
- Pause/Resume/Stop execution
- Get execution results
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import WorkflowExecution, WorkflowTemplate, User, Project, AgentJob
from schemas import (
    WorkflowExecutionCreate,
    WorkflowExecution as WorkflowExecutionSchema,
    AgentJob as AgentJobSchema
)
from supabase_auth import get_current_user, get_current_user_from_token
from services.workflow_executor import WorkflowExecutor
import uuid
import json
import asyncio
from datetime import datetime

router = APIRouter(
    prefix="/workflows/executions",
    tags=["workflows"],
)


@router.post("/", response_model=WorkflowExecutionSchema)
async def launch_workflow_execution(
    execution_data: WorkflowExecutionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Launch a new workflow execution

    Args:
        execution_data: Execution configuration
    """
    # Validate template exists
    template = db.query(WorkflowTemplate).filter(
        WorkflowTemplate.id == execution_data.template_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Workflow template not found")

    # Validate project exists
    project = db.query(Project).filter(
        Project.id == execution_data.project_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Create execution record
    # Convert UUID to string for WorkflowExecution table
    user_id_str = str(current_user.id)
    execution = WorkflowExecution(
        id=str(uuid.uuid4()),
        template_id=execution_data.template_id,
        project_id=execution_data.project_id,
        workspace_id=project.workspace_id,
        user_id=user_id_str,
        status="pending",
        config_json=execution_data.config_json or {},
        progress_percent=0
    )

    db.add(execution)
    db.commit()
    db.refresh(execution)

    # Increment template usage count
    template.usage_count += 1
    db.commit()

    # Try to launch async execution via Celery
    # If Celery is not available, execution will happen via SSE stream instead
    try:
        from tasks.workflow_tasks import execute_workflow
        execute_workflow.delay(execution.id)
    except Exception as e:
        print(f"Warning: Could not queue Celery task: {e}")
        # Execution will proceed via SSE streaming endpoint instead

    return execution


@router.get("/{execution_id}", response_model=WorkflowExecutionSchema)
async def get_workflow_execution(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific workflow execution"""
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Workflow execution not found")

    # Verify user has access (must be the user who created it)
    if execution.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    return execution


@router.get("/", response_model=List[WorkflowExecutionSchema])
async def list_workflow_executions(
    project_id: Optional[str] = None,
    workspace_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List workflow executions

    Args:
        project_id: Filter by project
        workspace_id: Filter by workspace
        status: Filter by status (pending, running, completed, failed, stopped, paused)
        limit: Maximum number of results
        offset: Offset for pagination
    """
    query = db.query(WorkflowExecution).filter(
        WorkflowExecution.user_id == str(current_user.id)
    )

    if project_id:
        query = query.filter(WorkflowExecution.project_id == project_id)

    if workspace_id:
        query = query.filter(WorkflowExecution.workspace_id == workspace_id)

    if status:
        query = query.filter(WorkflowExecution.status == status)

    # Order by creation date (newest first)
    executions = query.order_by(
        WorkflowExecution.created_at.desc()
    ).limit(limit).offset(offset).all()

    return executions


@router.get("/{execution_id}/jobs", response_model=List[AgentJobSchema])
async def get_execution_jobs(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all agent jobs for a workflow execution"""
    # Verify execution exists and user has access
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Workflow execution not found")

    if execution.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Get all jobs for this execution
    jobs = db.query(AgentJob).filter(
        AgentJob.execution_id == execution_id
    ).order_by(AgentJob.created_at).all()

    return jobs


@router.post("/{execution_id}/pause")
async def pause_execution(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pause a running workflow execution"""
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Workflow execution not found")

    if execution.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    if execution.status != "running":
        raise HTTPException(status_code=400, detail="Can only pause running executions")

    # Trigger pause via Celery
    try:
        from tasks.workflow_tasks import pause_workflow
        pause_workflow.delay(execution_id)
    except Exception as e:
        print(f"Warning: Could not queue Celery task: {e}")
        # Fallback: update directly
        execution.status = "paused"
        db.commit()

    return {"message": "Workflow execution pause requested", "execution_id": execution_id}


@router.post("/{execution_id}/resume")
async def resume_execution(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resume a paused workflow execution"""
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Workflow execution not found")

    if execution.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    if execution.status != "paused":
        raise HTTPException(status_code=400, detail="Can only resume paused executions")

    # Trigger resume via Celery
    try:
        from tasks.workflow_tasks import resume_workflow
        resume_workflow.delay(execution_id)
    except Exception as e:
        print(f"Warning: Could not queue Celery task: {e}")
        # Fallback: update directly and execution will proceed via SSE
        execution.status = "running"
        db.commit()

    return {"message": "Workflow execution resume requested", "execution_id": execution_id}


@router.post("/{execution_id}/stop")
async def stop_execution(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Stop a running or paused workflow execution"""
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Workflow execution not found")

    if execution.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    if execution.status not in ["running", "paused"]:
        raise HTTPException(status_code=400, detail="Can only stop running or paused executions")

    # Trigger stop via Celery
    try:
        from tasks.workflow_tasks import stop_workflow
        stop_workflow.delay(execution_id)
    except Exception as e:
        print(f"Warning: Could not queue Celery task: {e}")
        # Fallback: update directly
        execution.status = "stopped"
        execution.completed_at = datetime.utcnow()
        db.commit()

    return {"message": "Workflow execution stop requested", "execution_id": execution_id}


@router.get("/{execution_id}/status")
async def get_execution_status(
    execution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed status of a workflow execution including progress and current node"""
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Workflow execution not found")

    if execution.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Get job statistics
    total_jobs = db.query(AgentJob).filter(
        AgentJob.execution_id == execution_id
    ).count()

    completed_jobs = db.query(AgentJob).filter(
        AgentJob.execution_id == execution_id,
        AgentJob.status == "completed"
    ).count()

    failed_jobs = db.query(AgentJob).filter(
        AgentJob.execution_id == execution_id,
        AgentJob.status == "failed"
    ).count()

    running_jobs = db.query(AgentJob).filter(
        AgentJob.execution_id == execution_id,
        AgentJob.status == "running"
    ).count()

    # Get current job if any
    current_job = None
    if execution.current_node_id:
        current_job = db.query(AgentJob).filter(
            AgentJob.execution_id == execution_id,
            AgentJob.node_id == execution.current_node_id,
            AgentJob.status == "running"
        ).first()

    return {
        "execution_id": execution_id,
        "status": execution.status,
        "progress_percent": execution.progress_percent,
        "current_node_id": execution.current_node_id,
        "error_message": execution.error_message,
        "total_cost": float(execution.total_cost),
        "started_at": execution.started_at.isoformat() if execution.started_at else None,
        "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
        "created_at": execution.created_at.isoformat(),
        "job_stats": {
            "total": total_jobs,
            "completed": completed_jobs,
            "failed": failed_jobs,
            "running": running_jobs,
            "pending": total_jobs - completed_jobs - failed_jobs - running_jobs
        },
        "current_job": {
            "id": current_job.id,
            "node_id": current_job.node_id,
            "job_type": current_job.job_type,
            "started_at": current_job.started_at.isoformat() if current_job.started_at else None
        } if current_job else None
    }


@router.get("/{execution_id}/stream")
async def stream_execution_progress(
    execution_id: str,
    token: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Stream real-time execution progress via Server-Sent Events (SSE)

    Returns an event stream with progress updates as the workflow executes.
    Token is passed via query parameter since EventSource doesn't support headers.
    """
    # Authenticate via query parameter token (SSE doesn't support headers)
    if not token:
        raise HTTPException(status_code=401, detail="Token required")

    current_user = await get_current_user_from_token(token, db)

    # Verify execution exists and user has access
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution:
        raise HTTPException(status_code=404, detail="Workflow execution not found")

    if execution.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    async def event_generator():
        """Generate SSE events from workflow execution"""
        try:
            # Create workflow executor
            executor = WorkflowExecutor(db)

            # Execute workflow and yield progress
            async for progress_update in executor.execute_workflow(
                execution_id=execution_id,
                user_id=str(current_user.id),
                yield_progress=True
            ):
                # Format as SSE event
                event_data = json.dumps(progress_update)
                yield f"data: {event_data}\n\n"

                # Small delay to prevent overwhelming the client
                await asyncio.sleep(0.1)

        except Exception as e:
            # Send error event
            error_event = {
                "type": "error",
                "message": str(e),
                "progress": 0
            }
            yield f"data: {json.dumps(error_event)}\n\n"

        finally:
            # Send completion signal
            yield "data: {\"type\": \"done\"}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )
