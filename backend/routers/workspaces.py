from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from database import get_db
from schemas import WorkspaceCreate, Workspace, ProjectCreate, Project, WorkspaceUpdate
from crud import (
    create_workspace, get_user_workspaces, create_project, get_workspace_projects,
    update_workspace, get_workspace_members, add_workspace_member, remove_workspace_member,
    get_workspace
)
from auth import get_current_user
from models import User

router = APIRouter(
    prefix="/workspaces",
    tags=["workspaces"],
)

@router.post("/", response_model=Workspace)
def create_new_workspace(workspace: WorkspaceCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return create_workspace(db=db, workspace=workspace, user_id=current_user.id)

@router.get("/", response_model=List[Workspace])
def read_user_workspaces(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_user_workspaces(db=db, user_id=current_user.id)

@router.post("/{workspace_id}/projects", response_model=Project)
def create_new_project(workspace_id: str, project: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # TODO: Check if user belongs to workspace
    project.workspace_id = workspace_id
    return create_project(db=db, project=project)

@router.get("/{workspace_id}/projects", response_model=List[Project])
def read_workspace_projects(workspace_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # TODO: Check if user belongs to workspace
    return get_workspace_projects(db=db, workspace_id=workspace_id)

@router.get("/{workspace_id}", response_model=Workspace)
def read_workspace(workspace_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace = get_workspace(db=db, workspace_id=workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace

@router.put("/{workspace_id}", response_model=Workspace)
def update_workspace_settings(
    workspace_id: str,
    workspace_update: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # TODO: Check if user has permission to update workspace
    updated_workspace = update_workspace(db=db, workspace_id=workspace_id, workspace_update=workspace_update)
    if not updated_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return updated_workspace

# Schemas for member management
class AddMemberRequest(BaseModel):
    email: str
    role: str = "member"

@router.get("/{workspace_id}/members")
def read_workspace_members(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # TODO: Check if user belongs to workspace
    return get_workspace_members(db=db, workspace_id=workspace_id)

@router.post("/{workspace_id}/members")
def add_member_to_workspace(
    workspace_id: str,
    request: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # TODO: Check if user has permission to add members
    inviter_name = current_user.full_name or current_user.email
    result = add_workspace_member(
        db=db,
        workspace_id=workspace_id,
        user_email=request.email,
        role=request.role,
        inviter_name=inviter_name
    )

    if result is None:
        raise HTTPException(status_code=404, detail="User not found with that email")

    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"message": "Member added successfully", "user": result["user"]}

@router.delete("/{workspace_id}/members/{user_id}")
def remove_member_from_workspace(
    workspace_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # TODO: Check if user has permission to remove members
    success = remove_workspace_member(db=db, workspace_id=workspace_id, user_id=user_id)

    if not success:
        raise HTTPException(status_code=400, detail="Cannot remove member (user not found or is owner)")

    return {"message": "Member removed successfully"}
