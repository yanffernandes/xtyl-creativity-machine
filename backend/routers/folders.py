from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from database import get_db
from auth import get_current_user
from models import User, Folder
from crud import (
    create_folder, list_folders, get_folder, update_folder,
    move_folder, soft_delete_folder, restore_folder, list_archived_folders
)

router = APIRouter(
    prefix="/folders",
    tags=["folders"],
)

class FolderCreate(BaseModel):
    name: str
    parent_folder_id: Optional[str] = None
    project_id: str

class FolderUpdate(BaseModel):
    name: Optional[str] = None

class FolderMove(BaseModel):
    new_parent_id: Optional[str] = None

class FolderDelete(BaseModel):
    cascade: bool = True

class FolderResponse(BaseModel):
    id: str
    name: str
    parent_folder_id: Optional[str]
    project_id: str
    created_at: str
    updated_at: Optional[str]
    deleted_at: Optional[str]

    class Config:
        from_attributes = True

@router.post("/", response_model=dict)
async def create_new_folder(
    folder_data: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new folder in a project"""
    try:
        new_folder = create_folder(
            db=db,
            name=folder_data.name,
            project_id=folder_data.project_id,
            parent_folder_id=folder_data.parent_folder_id,
            user_id=current_user.id
        )

        return {
            "id": new_folder.id,
            "name": new_folder.name,
            "parent_folder_id": new_folder.parent_folder_id,
            "project_id": new_folder.project_id,
            "created_at": str(new_folder.created_at),
            "message": "Folder created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/project/{project_id}", response_model=dict)
async def get_project_folders(
    project_id: str,
    parent_folder_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all folders in a project, optionally filtered by parent"""
    folders = list_folders(db, project_id, parent_folder_id)

    return {
        "folders": [
            {
                "id": folder.id,
                "name": folder.name,
                "parent_folder_id": folder.parent_folder_id,
                "project_id": folder.project_id,
                "created_at": str(folder.created_at),
                "updated_at": str(folder.updated_at) if folder.updated_at else None
            }
            for folder in folders
        ],
        "count": len(folders)
    }

@router.get("/{folder_id}", response_model=dict)
async def get_folder_by_id(
    folder_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific folder by ID"""
    folder = get_folder(db, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    return {
        "id": folder.id,
        "name": folder.name,
        "parent_folder_id": folder.parent_folder_id,
        "project_id": folder.project_id,
        "created_at": str(folder.created_at),
        "updated_at": str(folder.updated_at) if folder.updated_at else None
    }

@router.put("/{folder_id}", response_model=dict)
async def update_folder_name(
    folder_id: str,
    folder_data: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update folder name"""
    updated_folder = update_folder(
        db=db,
        folder_id=folder_id,
        name=folder_data.name,
        user_id=current_user.id
    )

    if not updated_folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    return {
        "id": updated_folder.id,
        "name": updated_folder.name,
        "parent_folder_id": updated_folder.parent_folder_id,
        "updated_at": str(updated_folder.updated_at) if updated_folder.updated_at else None,
        "message": "Folder updated successfully"
    }

@router.post("/{folder_id}/move", response_model=dict)
async def move_folder_to_parent(
    folder_id: str,
    move_data: FolderMove,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Move a folder to a new parent"""
    result = move_folder(
        db=db,
        folder_id=folder_id,
        new_parent_id=move_data.new_parent_id,
        user_id=current_user.id
    )

    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    if not result:
        raise HTTPException(status_code=404, detail="Folder not found")

    return {
        "id": result.id,
        "name": result.name,
        "parent_folder_id": result.parent_folder_id,
        "message": "Folder moved successfully"
    }

@router.delete("/{folder_id}", response_model=dict)
async def delete_folder_by_id(
    folder_id: str,
    cascade: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete (archive) a folder"""
    deleted_folder = soft_delete_folder(
        db=db,
        folder_id=folder_id,
        cascade=cascade,
        user_id=current_user.id
    )

    if not deleted_folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    return {
        "id": deleted_folder.id,
        "name": deleted_folder.name,
        "deleted_at": str(deleted_folder.deleted_at),
        "message": f"Folder archived successfully. Use restore endpoint to recover."
    }

@router.post("/{folder_id}/restore", response_model=dict)
async def restore_folder_by_id(
    folder_id: str,
    restore_contents: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Restore a soft-deleted folder"""
    restored_folder = restore_folder(
        db=db,
        folder_id=folder_id,
        restore_contents=restore_contents,
        user_id=current_user.id
    )

    if not restored_folder:
        raise HTTPException(status_code=404, detail="Folder not found or not deleted")

    return {
        "id": restored_folder.id,
        "name": restored_folder.name,
        "parent_folder_id": restored_folder.parent_folder_id,
        "message": "Folder restored successfully"
    }

@router.get("/project/{project_id}/archived", response_model=dict)
async def get_archived_folders(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all archived folders in a project"""
    archived = list_archived_folders(db, project_id)

    return {
        "folders": [
            {
                "id": folder.id,
                "name": folder.name,
                "parent_folder_id": folder.parent_folder_id,
                "deleted_at": str(folder.deleted_at)
            }
            for folder in archived
        ],
        "count": len(archived)
    }
