"""
Admin Service - Business logic for admin panel operations.

Provides core admin functionality including:
- Audit logging for all admin actions
- User management operations
- Workspace management operations
- System statistics calculations
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import (
    AdminAuditLog,
    ChatConversation,
    Document,
    Project,
    User,
    Workspace,
    WorkspaceUser,
)


class AdminService:
    """
    Service class for admin panel business logic.

    All admin operations should go through this service to ensure
    proper audit logging and consistent business rules.
    """

    def __init__(self, db: Session):
        """
        Initialize the admin service.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    async def audit_log(
        self,
        admin_id: UUID,
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
    ) -> AdminAuditLog:
        """
        Create an audit log entry for an admin action.

        All admin actions should be logged for compliance and debugging.

        Args:
            admin_id: UUID of the admin performing the action
            action: Action type (e.g., "user.block", "model.update", "workspace.transfer")
            entity_type: Type of entity being acted upon (e.g., "user", "workspace", "model_config")
            entity_id: ID of the entity being acted upon
            old_value: Previous state of the entity (for updates)
            new_value: New state of the entity (for updates)
            metadata: Additional context for the action
            request: FastAPI request object for extracting IP and user agent

        Returns:
            The created AdminAuditLog entry

        Example:
            await admin_service.audit_log(
                admin_id=admin.id,
                action="user.block",
                entity_type="user",
                entity_id=str(user_id),
                old_value={"is_blocked": False},
                new_value={"is_blocked": True},
                metadata={"reason": "Violation of terms"},
                request=request,
            )
        """
        ip_address = None
        user_agent = None

        if request:
            # Extract IP address (handle proxies)
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                ip_address = forwarded_for.split(",")[0].strip()
            else:
                ip_address = request.client.host if request.client else None

            user_agent = request.headers.get("User-Agent")

        log_entry = AdminAuditLog(
            admin_id=admin_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
            extra_data=metadata,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        self.db.add(log_entry)
        self.db.commit()
        self.db.refresh(log_entry)

        return log_entry

    def get_user_stats(self, user_id: UUID) -> Dict[str, Any]:
        """
        Get statistics for a specific user.

        Args:
            user_id: UUID of the user

        Returns:
            Dictionary containing user statistics
        """
        # Count workspaces
        workspace_count = (
            self.db.query(func.count(WorkspaceUser.id))
            .filter(WorkspaceUser.user_id == user_id)
            .scalar()
            or 0
        )

        # Count owned workspaces
        owned_workspace_count = (
            self.db.query(func.count(Workspace.id))
            .filter(Workspace.owner_id == user_id)
            .scalar()
            or 0
        )

        # Count conversations
        conversation_count = (
            self.db.query(func.count(ChatConversation.id))
            .filter(ChatConversation.user_id == user_id)
            .scalar()
            or 0
        )

        # Count documents
        document_count = (
            self.db.query(func.count(Document.id))
            .filter(Document.created_by == user_id)
            .scalar()
            or 0
        )

        return {
            "workspace_count": workspace_count,
            "owned_workspace_count": owned_workspace_count,
            "conversation_count": conversation_count,
            "document_count": document_count,
        }

    def get_workspace_stats(self, workspace_id) -> Dict[str, Any]:
        """
        Get statistics for a specific workspace.

        Args:
            workspace_id: UUID or string ID of the workspace

        Returns:
            Dictionary containing workspace statistics
        """
        # Ensure workspace_id is a string for comparison
        ws_id = str(workspace_id)

        # Count members (WorkspaceUser has composite PK, no 'id' column)
        member_count = (
            self.db.query(func.count(WorkspaceUser.user_id))
            .filter(WorkspaceUser.workspace_id == ws_id)
            .scalar()
            or 0
        )

        # Count projects
        project_count = (
            self.db.query(func.count(Project.id))
            .filter(Project.workspace_id == ws_id)
            .scalar()
            or 0
        )

        # Count documents in workspace projects
        document_count = (
            self.db.query(func.count(Document.id))
            .join(Project, Document.project_id == Project.id)
            .filter(Project.workspace_id == ws_id)
            .scalar()
            or 0
        )

        return {
            "member_count": member_count,
            "project_count": project_count,
            "document_count": document_count,
        }

    def get_system_metrics(self, period_days: int = 30) -> Dict[str, Any]:
        """
        Get system-wide metrics for the dashboard.

        Args:
            period_days: Number of days to look back for metrics

        Returns:
            Dictionary containing system metrics
        """
        now = datetime.utcnow()
        period_start = now - timedelta(days=period_days)

        # Total users
        total_users = self.db.query(func.count(User.id)).scalar() or 0

        # Active users (updated during period - approximation since last_login not tracked)
        active_users = (
            self.db.query(func.count(User.id))
            .filter(User.updated_at >= period_start)
            .scalar()
            or 0
        )

        # New users in period
        new_users = (
            self.db.query(func.count(User.id))
            .filter(User.created_at >= period_start)
            .scalar()
            or 0
        )

        # Total workspaces
        total_workspaces = self.db.query(func.count(Workspace.id)).scalar() or 0

        # Active workspaces (with projects created during period)
        active_workspaces = (
            self.db.query(func.count(func.distinct(Project.workspace_id)))
            .filter(Project.created_at >= period_start)
            .scalar()
            or 0
        )

        # Total conversations
        total_conversations = (
            self.db.query(func.count(ChatConversation.id)).scalar() or 0
        )

        # Conversations in period
        conversations_in_period = (
            self.db.query(func.count(ChatConversation.id))
            .filter(ChatConversation.created_at >= period_start)
            .scalar()
            or 0
        )

        # Total documents
        total_documents = self.db.query(func.count(Document.id)).scalar() or 0

        # Documents in period
        documents_in_period = (
            self.db.query(func.count(Document.id))
            .filter(Document.created_at >= period_start)
            .scalar()
            or 0
        )

        return {
            "users": {
                "total": total_users,
                "active": active_users,
                "new": new_users,
            },
            "workspaces": {
                "total": total_workspaces,
                "active": active_workspaces,
            },
            "conversations": {
                "total": total_conversations,
                "in_period": conversations_in_period,
            },
            "documents": {
                "total": total_documents,
                "in_period": documents_in_period,
            },
            "period_days": period_days,
        }

    def list_users(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        is_blocked: Optional[bool] = None,
        is_super_admin: Optional[bool] = None,
    ) -> tuple[List[User], int]:
        """
        List users with filtering and pagination.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Search term for email or name
            is_blocked: Filter by blocked status
            is_super_admin: Filter by admin status

        Returns:
            Tuple of (users list, total count)
        """
        query = self.db.query(User)

        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (User.email.ilike(search_term)) | (User.full_name.ilike(search_term))
            )

        if is_blocked is not None:
            query = query.filter(User.is_blocked == is_blocked)

        if is_super_admin is not None:
            query = query.filter(User.is_super_admin == is_super_admin)

        # Get total count before pagination
        total = query.count()

        # Apply pagination and ordering
        users = (
            query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
        )

        return users, total

    def list_workspaces(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
    ) -> tuple[List[Workspace], int]:
        """
        List workspaces with filtering and pagination.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Search term for workspace name

        Returns:
            Tuple of (workspaces list, total count)
        """
        query = self.db.query(Workspace)

        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(Workspace.name.ilike(search_term))

        # Get total count before pagination
        total = query.count()

        # Apply pagination and ordering
        workspaces = (
            query.order_by(Workspace.created_at.desc()).offset(skip).limit(limit).all()
        )

        return workspaces, total

    def block_user(
        self,
        user_id: UUID,
        blocked_by: UUID,
    ) -> User:
        """
        Block a user.

        Args:
            user_id: UUID of user to block
            blocked_by: UUID of admin performing the action

        Returns:
            Updated User object

        Raises:
            ValueError: If user is a super_admin (cannot block admins)
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        if user.is_super_admin:
            raise ValueError("Cannot block a super admin")

        user.is_blocked = True
        user.blocked_at = datetime.utcnow()
        user.blocked_by = blocked_by

        self.db.commit()
        self.db.refresh(user)

        return user

    def unblock_user(self, user_id: UUID) -> User:
        """
        Unblock a user.

        Args:
            user_id: UUID of user to unblock

        Returns:
            Updated User object
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        user.is_blocked = False
        user.blocked_at = None
        user.blocked_by = None

        self.db.commit()
        self.db.refresh(user)

        return user

    def promote_to_admin(self, user_id: UUID) -> User:
        """
        Promote a user to super_admin.

        Args:
            user_id: UUID of user to promote

        Returns:
            Updated User object
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        if user.is_blocked:
            raise ValueError("Cannot promote a blocked user")

        user.is_super_admin = True

        self.db.commit()
        self.db.refresh(user)

        return user

    def demote_from_admin(self, user_id: UUID, current_admin_id: UUID) -> User:
        """
        Demote a user from super_admin.

        Args:
            user_id: UUID of user to demote
            current_admin_id: UUID of admin performing the action

        Returns:
            Updated User object

        Raises:
            ValueError: If trying to demote yourself
        """
        if user_id == current_admin_id:
            raise ValueError("Cannot demote yourself")

        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        user.is_super_admin = False

        self.db.commit()
        self.db.refresh(user)

        return user
