from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserPreferencesRead, UserPreferencesUpdate
from auth import get_current_user
from crud import get_or_create_user_preferences, update_user_preferences

router = APIRouter(
    prefix="/preferences",
    tags=["preferences"],
)


@router.get("", response_model=UserPreferencesRead)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's AI assistant preferences.
    Creates default preferences if they don't exist.
    """
    return get_or_create_user_preferences(db, current_user.id)


@router.put("", response_model=UserPreferencesRead)
def update_preferences(
    prefs_update: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current user's AI assistant preferences.

    Fields:
    - autonomous_mode: Execute all tools automatically without approval
    - max_iterations: Maximum tool call iterations per conversation (1-50)
    - default_model: Preferred LLM model
    - use_rag_by_default: Enable RAG context by default
    - settings: Additional extensible settings as JSON
    """
    return update_user_preferences(db, current_user.id, prefs_update)
