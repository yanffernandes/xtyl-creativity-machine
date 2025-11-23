from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from database import get_db
from auth import get_current_user
from models import User, ActivityLog
from crud import get_entity_activity, list_archived_documents, restore_document

router = APIRouter(
    prefix="/activity",
    tags=["activity"],
)

class ActivityResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    actor_type: str
    user_id: Optional[str]
    changes: Optional[dict]
    created_at: str

    class Config:
        from_attributes = True

@router.get("/{entity_type}/{entity_id}", response_model=dict)
async def get_activity_history(
    entity_type: str,
    entity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get activity history for a specific entity (document or folder)"""
    if entity_type not in ["document", "folder"]:
        raise HTTPException(status_code=400, detail="entity_type must be 'document' or 'folder'")

    activities = get_entity_activity(db, entity_type, entity_id)

    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "activities": [
            {
                "id": activity.id,
                "action": activity.action,
                "actor_type": activity.actor_type,
                "user_id": activity.user_id,
                "changes": activity.changes,
                "created_at": str(activity.created_at)
            }
            for activity in activities
        ],
        "count": len(activities)
    }

@router.get("/project/{project_id}/recent", response_model=dict)
async def get_recent_project_activity(
    project_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent activity across all documents and folders in a project"""
    from models import Document, Folder

    # Get all document IDs in the project
    documents = db.query(Document).filter(Document.project_id == project_id).all()
    doc_ids = [doc.id for doc in documents]

    # Get all folder IDs in the project
    folders = db.query(Folder).filter(Folder.project_id == project_id).all()
    folder_ids = [folder.id for folder in folders]

    # Get activities for all entities
    activities = db.query(ActivityLog).filter(
        ((ActivityLog.entity_type == "document") & (ActivityLog.entity_id.in_(doc_ids))) |
        ((ActivityLog.entity_type == "folder") & (ActivityLog.entity_id.in_(folder_ids)))
    ).order_by(ActivityLog.created_at.desc()).limit(limit).all()

    # Enrich with entity names
    enriched_activities = []
    for activity in activities:
        activity_data = {
            "id": activity.id,
            "entity_type": activity.entity_type,
            "entity_id": activity.entity_id,
            "action": activity.action,
            "actor_type": activity.actor_type,
            "user_id": activity.user_id,
            "changes": activity.changes,
            "created_at": str(activity.created_at)
        }

        # Add entity name
        if activity.entity_type == "document":
            doc = next((d for d in documents if d.id == activity.entity_id), None)
            if doc:
                activity_data["entity_name"] = doc.title
        elif activity.entity_type == "folder":
            folder = next((f for f in folders if f.id == activity.entity_id), None)
            if folder:
                activity_data["entity_name"] = folder.name

        enriched_activities.append(activity_data)

    return {
        "project_id": project_id,
        "activities": enriched_activities,
        "count": len(enriched_activities)
    }

@router.get("/user/{user_id}/recent", response_model=dict)
async def get_user_recent_activity(
    user_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent activity by a specific user"""
    # Check if requesting own activity or user is admin
    if user_id != current_user.id:
        # Add admin check here if you have admin roles
        pass

    activities = db.query(ActivityLog).filter(
        ActivityLog.user_id == user_id
    ).order_by(ActivityLog.created_at.desc()).limit(limit).all()

    return {
        "user_id": user_id,
        "activities": [
            {
                "id": activity.id,
                "entity_type": activity.entity_type,
                "entity_id": activity.entity_id,
                "action": activity.action,
                "actor_type": activity.actor_type,
                "changes": activity.changes,
                "created_at": str(activity.created_at)
            }
            for activity in activities
        ],
        "count": len(activities)
    }

@router.get("/stats/ai-vs-human/{project_id}", response_model=dict)
async def get_ai_human_stats(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics on AI vs Human changes in a project"""
    from models import Document, Folder

    # Get all entity IDs in the project
    documents = db.query(Document).filter(Document.project_id == project_id).all()
    doc_ids = [doc.id for doc in documents]

    folders = db.query(Folder).filter(Folder.project_id == project_id).all()
    folder_ids = [folder.id for folder in folders]

    # Get all activities
    activities = db.query(ActivityLog).filter(
        ((ActivityLog.entity_type == "document") & (ActivityLog.entity_id.in_(doc_ids))) |
        ((ActivityLog.entity_type == "folder") & (ActivityLog.entity_id.in_(folder_ids)))
    ).all()

    # Calculate stats
    ai_count = sum(1 for a in activities if a.actor_type == "ai")
    human_count = sum(1 for a in activities if a.actor_type == "human")

    action_counts = {}
    for activity in activities:
        action_counts[activity.action] = action_counts.get(activity.action, 0) + 1

    return {
        "project_id": project_id,
        "total_activities": len(activities),
        "ai_actions": ai_count,
        "human_actions": human_count,
        "action_breakdown": action_counts
    }
