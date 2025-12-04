"""
Admin Router - Administrative panel API endpoints.

Provides endpoints for system administration including:
- Admin verification and authentication
- AI model configuration
- User management
- Workspace management
- System dashboard and metrics
- System settings

All endpoints require super_admin role.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from llm_service import list_models as fetch_openrouter_models, list_embedding_models as fetch_openrouter_embedding_models
from models import ChatConversation, Document, User
from schemas import (
    AdminVerifyResponse,
    AIModelConfig,
    AIModelConfigUpdate,
    AvailableModel,
    ModelValidationRequest,
    ModelValidationResponse,
)
from services.admin_service import AdminService
from services.model_config_service import ModelConfigService
from supabase_auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/verify", response_model=AdminVerifyResponse)
async def verify_admin_access(
    admin: User = Depends(require_admin),
):
    """
    Verify admin access.

    This endpoint verifies that the current user has admin privileges.
    Used by the frontend to determine if the user can access the admin panel.

    Returns 200 with admin info if authorized, 403 if not.
    """
    return AdminVerifyResponse(
        is_admin=True,
        user_id=str(admin.id),
        email=admin.email,
    )


# =============================================================================
# Phase 3 (US1): AI Model Configuration Endpoints
# =============================================================================


@router.get("/models/config", response_model=AIModelConfig)
async def get_model_config(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get current AI model configuration.

    Returns the current configuration for all AI model types including
    default models, fallback models, and visible models for user selection.
    """
    service = ModelConfigService(db)
    config = service.get_all_model_config()
    visible = service.get_visible_models()
    visible_text = service.get_visible_text_models()
    visible_image = service.get_visible_image_models()

    return AIModelConfig(
        defaults=config.get("defaults", {}),
        fallbacks=config.get("fallbacks", {}),
        visible_models=visible,  # Deprecated - keep for backward compatibility
        visible_text_models=visible_text,
        visible_image_models=visible_image,
    )


@router.put("/models/config", response_model=AIModelConfig)
async def update_model_config(
    update: AIModelConfigUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Update AI model configuration.

    Updates default models, fallback models, and/or visible models.
    Only provided fields are updated; omitted fields remain unchanged.

    All admin actions are logged for audit purposes.
    """
    print(f"[ADMIN] update_model_config called by {admin.email} (id={admin.id})")
    print(f"[ADMIN] Update request: defaults={update.defaults}, fallbacks={update.fallbacks}, visible_models={update.visible_models}, visible_text_models={update.visible_text_models}, visible_image_models={update.visible_image_models}")

    service = ModelConfigService(db)
    admin_service = AdminService(db)

    # Get current config for audit log
    old_config = service.get_all_model_config()
    old_visible = service.get_visible_models()
    old_visible_text = service.get_visible_text_models()
    old_visible_image = service.get_visible_image_models()

    # Update configuration
    try:
        if update.defaults or update.fallbacks:
            service.update_model_config(
                defaults=update.defaults,
                fallbacks=update.fallbacks,
                updated_by=admin.id,
            )

        # Deprecated: update visible_models for backward compatibility
        if update.visible_models is not None:
            service.update_visible_models(
                model_ids=update.visible_models,
                updated_by=admin.id,
            )

        # New: update visible_text_models
        if update.visible_text_models is not None:
            service.update_visible_text_models(
                model_ids=update.visible_text_models,
                updated_by=admin.id,
            )

        # New: update visible_image_models
        if update.visible_image_models is not None:
            service.update_visible_image_models(
                model_ids=update.visible_image_models,
                updated_by=admin.id,
            )
    except ValueError as e:
        # Validation errors (e.g., empty model list)
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        print(f"[ADMIN] ERROR updating model config: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update model configuration: {str(e)}"
        )

    # Get new config for response and audit
    new_config = service.get_all_model_config()
    new_visible = service.get_visible_models()
    new_visible_text = service.get_visible_text_models()
    new_visible_image = service.get_visible_image_models()

    print(f"[ADMIN] Config updated successfully. New defaults: {new_config.get('defaults', {})}")

    # Log the change
    await admin_service.audit_log(
        admin_id=admin.id,
        action="models.config.update",
        entity_type="model_config",
        entity_id="ai_models",
        old_value={
            "config": old_config,
            "visible": old_visible,
            "visible_text": old_visible_text,
            "visible_image": old_visible_image,
        },
        new_value={
            "config": new_config,
            "visible": new_visible,
            "visible_text": new_visible_text,
            "visible_image": new_visible_image,
        },
        request=request,
    )

    return AIModelConfig(
        defaults=new_config.get("defaults", {}),
        fallbacks=new_config.get("fallbacks", {}),
        visible_models=new_visible,  # Deprecated
        visible_text_models=new_visible_text,
        visible_image_models=new_visible_image,
    )


@router.get("/models/available", response_model=List[AvailableModel])
async def get_available_models(
    type: Optional[str] = None,
    admin: User = Depends(require_admin),
):
    """
    Get list of available AI models from OpenRouter.

    Fetches both chat/text models and embedding models from OpenRouter API,
    including pricing and capability information.

    This is used in the admin UI to select models for configuration.

    Args:
        type: Filter by model type ("text", "image", "all"). Default is "all".

    Models are returned with their output modalities (text, embeddings, image).
    """
    # Fetch both chat models and embedding models in parallel
    import asyncio
    chat_models, embedding_models = await asyncio.gather(
        fetch_openrouter_models(),
        fetch_openrouter_embedding_models()
    )

    available = []

    # Add chat/text models
    for m in chat_models:
        pricing = m.get("pricing", {})
        architecture = m.get("architecture", {})
        output_modalities = architecture.get("output_modalities", [])

        # Filter by type if specified
        if type == "text" and "text" not in output_modalities:
            continue
        if type == "image" and "image" not in output_modalities:
            continue

        available.append(
            AvailableModel(
                id=m.get("id", ""),
                name=m.get("name", m.get("id", "")),
                description=m.get("description"),
                context_length=m.get("context_length"),
                pricing_prompt=pricing.get("prompt"),
                pricing_completion=pricing.get("completion"),
                top_provider=m.get("top_provider", {}).get("name"),
                output_modalities=output_modalities if output_modalities else None,
            )
        )

    # Add embedding models (they come from a separate endpoint) - skip if filtering for image
    if type != "image":
        for m in embedding_models:
            pricing = m.get("pricing", {})
            architecture = m.get("architecture", {})
            output_modalities = architecture.get("output_modalities", ["embeddings"])

            available.append(
                AvailableModel(
                    id=m.get("id", ""),
                    name=m.get("name", m.get("id", "")),
                    description=m.get("description"),
                    context_length=m.get("context_length"),
                    pricing_prompt=pricing.get("prompt"),
                    pricing_completion=pricing.get("completion"),
                    top_provider=m.get("top_provider", {}).get("name"),
                    output_modalities=output_modalities if output_modalities else ["embeddings"],
                )
            )

    return available


@router.post("/models/validate", response_model=ModelValidationResponse)
async def validate_model(
    validation: ModelValidationRequest,
    admin: User = Depends(require_admin),
):
    """
    Validate that a model ID exists and is available.

    Tests if the specified model can be used by checking OpenRouter's
    model list. Used by the admin UI to validate model selections.
    """
    models = await fetch_openrouter_models()

    # Check if model exists in available models
    model_exists = any(m.get("id") == validation.model_id for m in models)

    if model_exists:
        # Find the model details
        model = next(m for m in models if m.get("id") == validation.model_id)
        return ModelValidationResponse(
            valid=True,
            model_id=validation.model_id,
            model_name=model.get("name"),
            message=f"Model '{model.get('name')}' is available",
        )
    else:
        return ModelValidationResponse(
            valid=False,
            model_id=validation.model_id,
            model_name=None,
            message=f"Model '{validation.model_id}' not found in available models",
        )


# =============================================================================
# Phase 4 (US2): User Management Endpoints
# =============================================================================


@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    is_blocked: Optional[bool] = None,
    is_super_admin: Optional[bool] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    List all users with pagination, search, and filters.

    Supports filtering by blocked status and admin status.
    """
    admin_service = AdminService(db)
    users, total = admin_service.list_users(
        skip=skip,
        limit=limit,
        search=search,
        is_blocked=is_blocked,
        is_super_admin=is_super_admin,
    )

    return {
        "items": [
            {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "is_super_admin": u.is_super_admin,
                "is_blocked": u.is_blocked,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login": u.last_login.isoformat() if u.last_login else None,
            }
            for u in users
        ],
        "total": total,
        "page": skip // limit + 1 if limit > 0 else 1,
        "limit": limit,
    }


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific user.

    Includes user statistics like workspace count, conversations, and documents.
    """
    from uuid import UUID

    admin_service = AdminService(db)

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    stats = admin_service.get_user_stats(user_uuid)

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "is_super_admin": user.is_super_admin,
        "is_blocked": user.is_blocked,
        "blocked_at": user.blocked_at.isoformat() if user.blocked_at else None,
        "blocked_by": str(user.blocked_by) if user.blocked_by else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "stats": stats,
    }


@router.post("/users/{user_id}/block")
async def block_user(
    user_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Block a user from accessing the platform.

    Blocked users cannot log in or make API requests.
    """
    from uuid import UUID

    admin_service = AdminService(db)

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    try:
        user = admin_service.block_user(user_uuid, admin.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Log the action
    await admin_service.audit_log(
        admin_id=admin.id,
        action="user.block",
        entity_type="user",
        entity_id=user_id,
        old_value={"is_blocked": False},
        new_value={"is_blocked": True},
        request=request,
    )

    return {"success": True, "message": f"User {user.email} has been blocked"}


@router.post("/users/{user_id}/unblock")
async def unblock_user(
    user_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Unblock a previously blocked user.

    Restores the user's ability to log in and use the platform.
    """
    from uuid import UUID

    admin_service = AdminService(db)

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    try:
        user = admin_service.unblock_user(user_uuid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Log the action
    await admin_service.audit_log(
        admin_id=admin.id,
        action="user.unblock",
        entity_type="user",
        entity_id=user_id,
        old_value={"is_blocked": True},
        new_value={"is_blocked": False},
        request=request,
    )

    return {"success": True, "message": f"User {user.email} has been unblocked"}


@router.post("/users/{user_id}/promote")
async def promote_to_admin(
    user_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Promote a user to super_admin role.

    The promoted user will gain access to the admin panel.
    """
    from uuid import UUID

    admin_service = AdminService(db)

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    try:
        user = admin_service.promote_to_admin(user_uuid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Log the action
    await admin_service.audit_log(
        admin_id=admin.id,
        action="user.promote",
        entity_type="user",
        entity_id=user_id,
        old_value={"is_super_admin": False},
        new_value={"is_super_admin": True},
        request=request,
    )

    return {"success": True, "message": f"User {user.email} has been promoted to admin"}


@router.post("/users/{user_id}/demote")
async def demote_from_admin(
    user_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Demote a user from super_admin role.

    The user will lose access to the admin panel.
    """
    from uuid import UUID

    admin_service = AdminService(db)

    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    try:
        user = admin_service.demote_from_admin(user_uuid, admin.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Log the action
    await admin_service.audit_log(
        admin_id=admin.id,
        action="user.demote",
        entity_type="user",
        entity_id=user_id,
        old_value={"is_super_admin": True},
        new_value={"is_super_admin": False},
        request=request,
    )

    return {"success": True, "message": f"User {user.email} has been demoted from admin"}


# =============================================================================
# Phase 5 (US3): Workspace Management Endpoints
# =============================================================================


@router.get("/workspaces")
async def list_workspaces(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    List all workspaces with pagination and search.
    """
    from models import Project, Workspace, WorkspaceUser

    admin_service = AdminService(db)
    workspaces, total = admin_service.list_workspaces(
        skip=skip,
        limit=limit,
        search=search,
    )

    # Get member and project counts for each workspace
    items = []
    for w in workspaces:
        member_count = (
            db.query(WorkspaceUser)
            .filter(WorkspaceUser.workspace_id == w.id)
            .count()
        )
        project_count = (
            db.query(Project)
            .filter(Project.workspace_id == w.id)
            .count()
        )
        # Get owner from WorkspaceUser table (role="owner")
        owner_relation = (
            db.query(WorkspaceUser)
            .filter(WorkspaceUser.workspace_id == w.id, WorkspaceUser.role == "owner")
            .first()
        )
        owner = owner_relation.user if owner_relation else None
        items.append({
            "id": str(w.id),
            "name": w.name,
            "description": w.description,
            "owner_id": str(owner.id) if owner else None,
            "owner_email": owner.email if owner else None,
            "owner_name": owner.full_name if owner else None,
            "member_count": member_count,
            "project_count": project_count,
            "created_at": w.created_at.isoformat() if w.created_at else None,
            "updated_at": None,  # Workspace model doesn't have updated_at
        })

    return {
        "items": items,
        "total": total,
        "page": skip // limit + 1 if limit > 0 else 1,
        "limit": limit,
    }


@router.get("/workspaces/{workspace_id}")
async def get_workspace_details(
    workspace_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific workspace.

    Includes members list and usage statistics.
    """
    from uuid import UUID
    from models import Workspace, WorkspaceUser

    admin_service = AdminService(db)

    try:
        workspace_uuid = UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID format")

    workspace = db.query(Workspace).filter(Workspace.id == str(workspace_uuid)).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    stats = admin_service.get_workspace_stats(str(workspace_uuid))

    # Get members
    members = (
        db.query(WorkspaceUser)
        .filter(WorkspaceUser.workspace_id == str(workspace_uuid))
        .all()
    )
    member_list = [
        {
            "user_id": str(m.user_id),
            "email": m.user.email if m.user else None,
            "full_name": m.user.full_name if m.user else None,
            "role": m.role,
        }
        for m in members
    ]

    # Get owner from WorkspaceUser table (role="owner")
    owner_relation = (
        db.query(WorkspaceUser)
        .filter(WorkspaceUser.workspace_id == str(workspace_uuid), WorkspaceUser.role == "owner")
        .first()
    )
    owner = owner_relation.user if owner_relation else None

    return {
        "id": str(workspace.id),
        "name": workspace.name,
        "description": workspace.description,
        "owner_id": str(owner.id) if owner else None,
        "owner_email": owner.email if owner else None,
        "owner_name": owner.full_name if owner else None,
        "member_count": stats.get("member_count", len(member_list)),
        "project_count": stats.get("project_count", 0),
        "created_at": workspace.created_at.isoformat() if workspace.created_at else None,
        "updated_at": None,  # Workspace model doesn't have updated_at
        "members": member_list,
        "stats": {
            "document_count": stats.get("document_count", 0),
            "conversation_count": 0,  # Would need to add this query
            "storage_used_bytes": 0,  # Would need to calculate from documents
        },
    }


@router.delete("/workspaces/{workspace_id}/members/{user_id}")
async def remove_workspace_member(
    workspace_id: str,
    user_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Remove a member from a workspace.

    Cannot remove the workspace owner.
    """
    from uuid import UUID
    from models import Workspace, WorkspaceUser

    admin_service = AdminService(db)

    try:
        workspace_uuid = UUID(workspace_id)
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    workspace = db.query(Workspace).filter(Workspace.id == str(workspace_uuid)).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check if user is the owner (via WorkspaceUser role)
    owner_relation = (
        db.query(WorkspaceUser)
        .filter(WorkspaceUser.workspace_id == str(workspace_uuid), WorkspaceUser.role == "owner")
        .first()
    )
    if owner_relation and str(owner_relation.user_id) == str(user_uuid):
        raise HTTPException(
            status_code=400,
            detail="Cannot remove workspace owner. Transfer ownership first.",
        )

    # Find and remove membership
    membership = (
        db.query(WorkspaceUser)
        .filter(
            WorkspaceUser.workspace_id == str(workspace_uuid),
            WorkspaceUser.user_id == str(user_uuid),
        )
        .first()
    )

    if not membership:
        raise HTTPException(status_code=404, detail="User is not a member of this workspace")

    member_email = membership.user.email if membership.user else "Unknown"
    db.delete(membership)
    db.commit()

    # Log the action
    await admin_service.audit_log(
        admin_id=admin.id,
        action="workspace.member.remove",
        entity_type="workspace_member",
        entity_id=f"{workspace_id}/{user_id}",
        old_value={"user_id": user_id, "workspace_id": workspace_id},
        new_value=None,
        request=request,
    )

    return {"success": True, "message": f"User {member_email} has been removed from workspace"}


@router.post("/workspaces/{workspace_id}/transfer")
async def transfer_workspace_ownership(
    workspace_id: str,
    request: Request,
    new_owner_id: str = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Transfer workspace ownership to another member.

    The new owner must be an existing member of the workspace.
    """
    from uuid import UUID
    from models import Workspace, WorkspaceUser
    from pydantic import BaseModel

    admin_service = AdminService(db)

    # Get new_owner_id from request body if not provided
    if not new_owner_id:
        body = await request.json()
        new_owner_id = body.get("new_owner_id")

    if not new_owner_id:
        raise HTTPException(status_code=400, detail="new_owner_id is required")

    try:
        workspace_uuid = UUID(workspace_id)
        new_owner_uuid = UUID(new_owner_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    workspace = db.query(Workspace).filter(Workspace.id == str(workspace_uuid)).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check if new owner is a member
    new_owner_membership = (
        db.query(WorkspaceUser)
        .filter(
            WorkspaceUser.workspace_id == str(workspace_uuid),
            WorkspaceUser.user_id == str(new_owner_uuid),
        )
        .first()
    )

    if not new_owner_membership:
        raise HTTPException(
            status_code=400,
            detail="New owner must be an existing member of the workspace",
        )

    # Get current owner from WorkspaceUser table
    current_owner_relation = (
        db.query(WorkspaceUser)
        .filter(WorkspaceUser.workspace_id == str(workspace_uuid), WorkspaceUser.role == "owner")
        .first()
    )
    old_owner_id = str(current_owner_relation.user_id) if current_owner_relation else None

    # Transfer ownership by updating roles in WorkspaceUser table
    # New owner becomes owner
    new_owner_membership.role = "owner"

    # Old owner becomes admin
    if current_owner_relation and current_owner_relation.user_id != new_owner_uuid:
        current_owner_relation.role = "admin"

    db.commit()

    # Log the action
    await admin_service.audit_log(
        admin_id=admin.id,
        action="workspace.transfer",
        entity_type="workspace",
        entity_id=workspace_id,
        old_value={"owner_id": old_owner_id},
        new_value={"owner_id": new_owner_id},
        request=request,
    )

    return {
        "success": True,
        "message": f"Workspace ownership transferred to {new_owner_membership.user.email if new_owner_membership.user else 'new owner'}",
    }


# =============================================================================
# Phase 6 (US4): Dashboard Endpoints
# =============================================================================


@router.get("/dashboard/metrics")
async def get_dashboard_metrics(
    period_days: int = 30,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get system-wide metrics for the admin dashboard.

    Returns user counts, workspace counts, conversation counts, and document counts
    for both total and within the specified period.

    Args:
        period_days: Number of days to look back for period metrics (default: 30)
    """
    admin_service = AdminService(db)
    metrics = admin_service.get_system_metrics(period_days=period_days)
    return metrics


@router.get("/dashboard/activity")
async def get_activity_trends(
    period_days: int = 30,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get daily activity trends for the dashboard charts.

    Returns daily counts for new users, conversations, and documents
    over the specified period.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func, cast, Date

    now = datetime.utcnow()
    period_start = now - timedelta(days=period_days)

    # Get daily user signups
    daily_users = (
        db.query(
            cast(User.created_at, Date).label("date"),
            func.count(User.id).label("count"),
        )
        .filter(User.created_at >= period_start)
        .group_by(cast(User.created_at, Date))
        .order_by(cast(User.created_at, Date))
        .all()
    )

    # Get daily conversations
    daily_conversations = (
        db.query(
            cast(ChatConversation.created_at, Date).label("date"),
            func.count(ChatConversation.id).label("count"),
        )
        .filter(ChatConversation.created_at >= period_start)
        .group_by(cast(ChatConversation.created_at, Date))
        .order_by(cast(ChatConversation.created_at, Date))
        .all()
    )

    # Get daily documents
    daily_documents = (
        db.query(
            cast(Document.created_at, Date).label("date"),
            func.count(Document.id).label("count"),
        )
        .filter(Document.created_at >= period_start)
        .group_by(cast(Document.created_at, Date))
        .order_by(cast(Document.created_at, Date))
        .all()
    )

    return {
        "users": [
            {"date": str(row.date), "count": row.count} for row in daily_users
        ],
        "conversations": [
            {"date": str(row.date), "count": row.count} for row in daily_conversations
        ],
        "documents": [
            {"date": str(row.date), "count": row.count} for row in daily_documents
        ],
        "period_days": period_days,
    }


@router.get("/dashboard/recent-activity")
async def get_recent_activity(
    limit: int = 10,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get recent platform activity for the dashboard.

    Returns the most recent user signups, conversations, and documents.
    """
    from models import ChatConversation, Document

    # Recent users
    recent_users = (
        db.query(User)
        .order_by(User.created_at.desc())
        .limit(limit)
        .all()
    )

    # Recent conversations
    recent_conversations = (
        db.query(ChatConversation)
        .order_by(ChatConversation.created_at.desc())
        .limit(limit)
        .all()
    )

    # Recent documents
    recent_documents = (
        db.query(Document)
        .order_by(Document.created_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in recent_users
        ],
        "conversations": [
            {
                "id": str(c.id),
                "title": c.title,
                "user_id": str(c.user_id) if c.user_id else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in recent_conversations
        ],
        "documents": [
            {
                "id": str(d.id),
                "title": d.title,
                "type": d.media_type,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in recent_documents
        ],
    }


@router.get("/audit")
async def get_audit_logs(
    skip: int = 0,
    limit: int = 50,
    action: Optional[str] = None,
    admin_id: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get admin audit logs with filtering and pagination.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        action: Filter by action type (e.g., "user.block", "models.config.update")
        admin_id: Filter by admin who performed the action
    """
    from uuid import UUID
    from models import AdminAuditLog

    query = db.query(AdminAuditLog)

    if action:
        query = query.filter(AdminAuditLog.action == action)

    if admin_id:
        try:
            admin_uuid = UUID(admin_id)
            query = query.filter(AdminAuditLog.admin_id == admin_uuid)
        except ValueError:
            pass

    total = query.count()
    logs = (
        query.order_by(AdminAuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "items": [
            {
                "id": str(log.id),
                "admin_id": str(log.admin_id),
                "admin_email": log.admin.email if log.admin else None,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "old_value": log.old_value,
                "new_value": log.new_value,
                "metadata": log.extra_data,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
        "page": skip // limit + 1 if limit > 0 else 1,
        "limit": limit,
    }


# =============================================================================
# Phase 7 (US5): Settings Endpoints
# =============================================================================


@router.get("/settings")
async def get_system_settings(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get all system settings.

    Returns configuration for:
    - Global limits (max workspaces per user, max members per workspace, etc.)
    - Feature flags (enable/disable features)
    - API configuration
    """
    from models import SystemConfig

    # Define default settings
    defaults = {
        "limits": {
            "max_workspaces_per_user": 10,
            "max_members_per_workspace": 50,
            "max_projects_per_workspace": 100,
            "max_documents_per_project": 500,
            "max_file_size_mb": 50,
        },
        "features": {
            "enable_image_generation": True,
            "enable_document_analysis": True,
            "enable_rag": True,
            "enable_workflows": True,
            "enable_public_sharing": False,
        },
        "api": {
            "rate_limit_per_minute": 60,
            "max_tokens_per_request": 4096,
        },
    }

    # Get settings from database
    settings = {}
    for key in defaults.keys():
        config = db.query(SystemConfig).filter(SystemConfig.key == f"settings.{key}").first()
        if config and config.value:
            settings[key] = config.value
        else:
            settings[key] = defaults[key]

    return settings


@router.put("/settings")
async def update_system_settings(
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Update system settings.

    Accepts partial updates - only provided settings are updated.
    All changes are logged for audit purposes.
    """
    from models import SystemConfig

    admin_service = AdminService(db)
    body = await request.json()

    old_settings = {}
    new_settings = {}

    for category, values in body.items():
        if category not in ["limits", "features", "api"]:
            continue

        config_key = f"settings.{category}"

        # Get old value
        old_config = db.query(SystemConfig).filter(SystemConfig.key == config_key).first()
        old_settings[category] = old_config.value if old_config else None

        # Update or create
        if old_config:
            old_config.value = values
            old_config.updated_by = admin.id
        else:
            new_config = SystemConfig(
                key=config_key,
                value=values,
                updated_by=admin.id,
            )
            db.add(new_config)

        new_settings[category] = values

    db.commit()

    # Log the change
    await admin_service.audit_log(
        admin_id=admin.id,
        action="settings.update",
        entity_type="system_settings",
        entity_id="global",
        old_value=old_settings,
        new_value=new_settings,
        request=request,
    )

    # Return updated settings
    return await get_system_settings(admin=admin, db=db)


@router.get("/settings/limits")
async def get_limit_settings(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get limit settings only.
    """
    from models import SystemConfig

    defaults = {
        "max_workspaces_per_user": 10,
        "max_members_per_workspace": 50,
        "max_projects_per_workspace": 100,
        "max_documents_per_project": 500,
        "max_file_size_mb": 50,
    }

    config = db.query(SystemConfig).filter(SystemConfig.key == "settings.limits").first()
    return config.value if config and config.value else defaults


@router.put("/settings/limits")
async def update_limit_settings(
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Update limit settings.
    """
    from models import SystemConfig

    admin_service = AdminService(db)
    body = await request.json()

    config = db.query(SystemConfig).filter(SystemConfig.key == "settings.limits").first()
    old_value = config.value if config else None

    if config:
        # Merge with existing
        current = config.value or {}
        current.update(body)
        config.value = current
        config.updated_by = admin.id
    else:
        config = SystemConfig(
            key="settings.limits",
            value=body,
            updated_by=admin.id,
        )
        db.add(config)

    db.commit()

    # Log the change
    await admin_service.audit_log(
        admin_id=admin.id,
        action="settings.limits.update",
        entity_type="system_settings",
        entity_id="limits",
        old_value=old_value,
        new_value=config.value,
        request=request,
    )

    return config.value


@router.get("/settings/features")
async def get_feature_flags(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get feature flag settings.
    """
    from models import SystemConfig

    defaults = {
        "enable_image_generation": True,
        "enable_document_analysis": True,
        "enable_rag": True,
        "enable_workflows": True,
        "enable_public_sharing": False,
    }

    config = db.query(SystemConfig).filter(SystemConfig.key == "settings.features").first()
    return config.value if config and config.value else defaults


@router.put("/settings/features")
async def update_feature_flags(
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Update feature flag settings.
    """
    from models import SystemConfig

    admin_service = AdminService(db)
    body = await request.json()

    config = db.query(SystemConfig).filter(SystemConfig.key == "settings.features").first()
    old_value = config.value if config else None

    if config:
        # Merge with existing
        current = config.value or {}
        current.update(body)
        config.value = current
        config.updated_by = admin.id
    else:
        config = SystemConfig(
            key="settings.features",
            value=body,
            updated_by=admin.id,
        )
        db.add(config)

    db.commit()

    # Log the change
    await admin_service.audit_log(
        admin_id=admin.id,
        action="settings.features.update",
        entity_type="system_settings",
        entity_id="features",
        old_value=old_value,
        new_value=config.value,
        request=request,
    )

    return config.value
