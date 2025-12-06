"""
User Memory Router - Feature 024

REST API endpoints for managing user memories.
Memories are scoped to user + project for isolation.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from database import get_db
from models import Project, User
from schemas import (
    MemoryCreate,
    MemoryUpdate,
    MemoryResponse,
    MemoryListResponse,
    MemorySearchRequest,
    MemorySearchResponse,
    DeleteAllMemoriesResponse,
)
from supabase_auth import get_current_user
from services.memory_service import MemoryService

router = APIRouter(prefix="/projects/{project_id}/memories", tags=["memories"])


def get_project_or_404(db: Session, project_id: str) -> Project:
    """Get project by ID or raise 404."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.deleted_at:
        raise HTTPException(status_code=404, detail="Project has been deleted")
    return project


@router.get("", response_model=MemoryListResponse)
async def list_memories(
    project_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List memories for the current user in a project.

    Supports pagination and optional category filtering.
    """
    get_project_or_404(db, project_id)
    user_id = current_user.id

    service = MemoryService(db)
    memories, total = service.list(
        user_id=user_id,
        project_id=project_id,
        category=category,
        page=page,
        per_page=per_page,
    )

    return MemoryListResponse(
        memories=[MemoryResponse.model_validate(m) for m in memories],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=MemoryResponse, status_code=201)
async def create_memory(
    project_id: str,
    memory: MemoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new memory manually.

    Note: Memories are typically created automatically via chat extraction,
    but this endpoint allows manual creation.
    """
    get_project_or_404(db, project_id)
    user_id = current_user.id

    service = MemoryService(db)
    created_memory = await service.add(
        user_id=user_id,
        project_id=project_id,
        content=memory.content,
        category=memory.category,
    )

    if not created_memory:
        raise HTTPException(
            status_code=409,
            detail="Memory already exists or memory limit reached",
        )

    return MemoryResponse.model_validate(created_memory)


@router.get("/{memory_id}", response_model=MemoryResponse)
async def get_memory(
    project_id: str,
    memory_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific memory by ID."""
    get_project_or_404(db, project_id)
    user_id = current_user.id

    service = MemoryService(db)
    memory = service.get(memory_id, user_id)

    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    # Verify memory belongs to the specified project
    if memory.project_id != project_id:
        raise HTTPException(status_code=404, detail="Memory not found in this project")

    return MemoryResponse.model_validate(memory)


@router.put("/{memory_id}", response_model=MemoryResponse)
async def update_memory(
    project_id: str,
    memory_id: UUID,
    memory_update: MemoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing memory."""
    get_project_or_404(db, project_id)
    user_id = current_user.id

    service = MemoryService(db)

    # First verify the memory exists and belongs to this project
    existing = service.get(memory_id, user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Memory not found")
    if existing.project_id != project_id:
        raise HTTPException(status_code=404, detail="Memory not found in this project")

    updated_memory = await service.update(
        memory_id=memory_id,
        user_id=user_id,
        content=memory_update.content,
        category=memory_update.category,
    )

    if not updated_memory:
        raise HTTPException(status_code=404, detail="Memory not found")

    return MemoryResponse.model_validate(updated_memory)


@router.delete("/{memory_id}", status_code=204)
async def delete_memory(
    project_id: str,
    memory_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a specific memory."""
    get_project_or_404(db, project_id)
    user_id = current_user.id

    service = MemoryService(db)

    # First verify the memory exists and belongs to this project
    existing = service.get(memory_id, user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Memory not found")
    if existing.project_id != project_id:
        raise HTTPException(status_code=404, detail="Memory not found in this project")

    success = service.delete(memory_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")

    return None


@router.delete("", response_model=DeleteAllMemoriesResponse)
async def delete_all_memories(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete all memories for the current user in a project.

    Use with caution - this action cannot be undone.
    """
    get_project_or_404(db, project_id)
    user_id = current_user.id

    service = MemoryService(db)
    deleted_count = service.delete_all(user_id, project_id)

    return DeleteAllMemoriesResponse(deleted_count=deleted_count)


@router.post("/search", response_model=MemorySearchResponse)
async def search_memories(
    project_id: str,
    search_request: MemorySearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search memories using semantic similarity.

    Uses vector embeddings for semantic search,
    returning the most relevant memories for the query.
    """
    get_project_or_404(db, project_id)
    user_id = current_user.id

    service = MemoryService(db)
    memories = await service.search(
        query=search_request.query,
        user_id=user_id,
        project_id=project_id,
        limit=search_request.limit,
        category=search_request.category,
    )

    return MemorySearchResponse(
        memories=[MemoryResponse.model_validate(m) for m in memories],
        query=search_request.query,
    )
