"""
Unit tests for Admin Service.

Tests admin panel business logic including audit logging, user management,
workspace management, and system statistics.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timedelta
from uuid import uuid4


class TestAdminServiceInit:
    """Tests for AdminService initialization."""

    def test_init_stores_db_session(self):
        """Should store the database session."""
        from services.admin_service import AdminService

        mock_db = MagicMock()
        service = AdminService(mock_db)

        assert service.db == mock_db


class TestAuditLog:
    """Tests for audit logging functionality."""

    @pytest.fixture
    def admin_service(self):
        """Create AdminService with mock database."""
        from services.admin_service import AdminService
        mock_db = MagicMock()
        mock_db.add = MagicMock()
        mock_db.commit = MagicMock()
        mock_db.refresh = MagicMock()
        return AdminService(mock_db)

    @pytest.mark.asyncio
    async def test_audit_log_creates_entry(self, admin_service):
        """Should create an audit log entry."""
        admin_id = uuid4()

        result = await admin_service.audit_log(
            admin_id=admin_id,
            action="user.block",
            entity_type="user",
            entity_id="user-123"
        )

        admin_service.db.add.assert_called_once()
        admin_service.db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_audit_log_stores_old_and_new_values(self, admin_service):
        """Should store old and new values for tracking changes."""
        admin_id = uuid4()

        await admin_service.audit_log(
            admin_id=admin_id,
            action="user.update",
            entity_type="user",
            entity_id="user-123",
            old_value={"is_blocked": False},
            new_value={"is_blocked": True}
        )

        # Verify the log entry was created with the values
        add_call = admin_service.db.add.call_args
        log_entry = add_call[0][0]
        assert log_entry.old_value == {"is_blocked": False}
        assert log_entry.new_value == {"is_blocked": True}

    @pytest.mark.asyncio
    async def test_audit_log_extracts_ip_from_request(self, admin_service):
        """Should extract IP address from request headers."""
        admin_id = uuid4()

        mock_request = MagicMock()
        mock_request.headers = {"X-Forwarded-For": "192.168.1.1, 10.0.0.1"}
        mock_request.client = MagicMock()
        mock_request.client.host = "127.0.0.1"

        await admin_service.audit_log(
            admin_id=admin_id,
            action="test.action",
            request=mock_request
        )

        add_call = admin_service.db.add.call_args
        log_entry = add_call[0][0]
        assert log_entry.ip_address == "192.168.1.1"

    @pytest.mark.asyncio
    async def test_audit_log_extracts_user_agent(self, admin_service):
        """Should extract user agent from request headers."""
        admin_id = uuid4()

        mock_request = MagicMock()
        mock_request.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
            "X-Forwarded-For": ""
        }
        mock_request.client = MagicMock()
        mock_request.client.host = "127.0.0.1"

        await admin_service.audit_log(
            admin_id=admin_id,
            action="test.action",
            request=mock_request
        )

        add_call = admin_service.db.add.call_args
        log_entry = add_call[0][0]
        assert "Mozilla" in log_entry.user_agent


class TestGetUserStats:
    """Tests for user statistics retrieval."""

    @pytest.fixture
    def admin_service(self):
        from services.admin_service import AdminService
        mock_db = MagicMock()
        return AdminService(mock_db)

    def test_get_user_stats_returns_counts(self, admin_service):
        """Should return workspace, conversation, and document counts."""
        user_id = uuid4()

        # Mock the query chain for all query types
        mock_query = MagicMock()
        mock_query.select_from.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.join.return_value = mock_query
        # All queries return scalars: workspace_count, owned_count, conversation_count, document_count
        mock_query.scalar.side_effect = [5, 2, 10, 25]
        admin_service.db.query.return_value = mock_query

        stats = admin_service.get_user_stats(user_id)

        assert stats["workspace_count"] == 5
        assert stats["owned_workspace_count"] == 2
        assert stats["conversation_count"] == 10
        assert stats["document_count"] == 25

    def test_get_user_stats_handles_null_counts(self, admin_service):
        """Should handle None (null) counts from database."""
        user_id = uuid4()

        # Mock the query chain to return None
        mock_query = MagicMock()
        mock_query.select_from.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.scalar.return_value = None
        admin_service.db.query.return_value = mock_query

        stats = admin_service.get_user_stats(user_id)

        assert stats["workspace_count"] == 0
        assert stats["conversation_count"] == 0


class TestGetWorkspaceStats:
    """Tests for workspace statistics retrieval."""

    @pytest.fixture
    def admin_service(self):
        from services.admin_service import AdminService
        mock_db = MagicMock()
        return AdminService(mock_db)

    def test_get_workspace_stats_returns_counts(self, admin_service):
        """Should return member, project, and document counts."""
        workspace_id = uuid4()

        admin_service.db.query.return_value.filter.return_value.scalar.side_effect = [
            3,   # member_count
            10,  # project_count
        ]
        admin_service.db.query.return_value.join.return_value.filter.return_value.scalar.return_value = 50  # document_count

        stats = admin_service.get_workspace_stats(workspace_id)

        assert stats["member_count"] == 3
        assert stats["project_count"] == 10
        assert stats["document_count"] == 50


class TestGetSystemMetrics:
    """Tests for system-wide metrics retrieval."""

    @pytest.fixture
    def admin_service(self):
        from services.admin_service import AdminService
        mock_db = MagicMock()
        return AdminService(mock_db)

    def test_get_system_metrics_returns_all_metrics(self, admin_service):
        """Should return user, workspace, conversation, and document metrics."""
        # Mock query results
        admin_service.db.query.return_value.scalar.side_effect = [
            100,  # total_users
        ]
        admin_service.db.query.return_value.filter.return_value.scalar.side_effect = [
            50,   # active_users
            10,   # new_users
        ]

        # Need to set up the chain properly for remaining queries
        mock_query = MagicMock()
        mock_query.scalar.side_effect = [100, 50, 10, 20, 5, 500, 100, 1000, 200]
        mock_query.filter.return_value = mock_query
        admin_service.db.query.return_value = mock_query

        metrics = admin_service.get_system_metrics(period_days=30)

        assert "users" in metrics
        assert "workspaces" in metrics
        assert "conversations" in metrics
        assert "documents" in metrics
        assert metrics["period_days"] == 30

    def test_get_system_metrics_uses_custom_period(self, admin_service):
        """Should respect custom period_days parameter."""
        mock_query = MagicMock()
        mock_query.scalar.return_value = 0
        mock_query.filter.return_value = mock_query
        admin_service.db.query.return_value = mock_query

        metrics = admin_service.get_system_metrics(period_days=7)

        assert metrics["period_days"] == 7


class TestListUsers:
    """Tests for user listing functionality."""

    @pytest.fixture
    def admin_service(self):
        from services.admin_service import AdminService
        mock_db = MagicMock()
        return AdminService(mock_db)

    def test_list_users_returns_users_and_count(self, admin_service):
        """Should return list of users and total count."""
        mock_users = [MagicMock(), MagicMock()]

        mock_query = MagicMock()
        mock_query.count.return_value = 2
        mock_query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_users
        admin_service.db.query.return_value = mock_query

        users, total = admin_service.list_users(skip=0, limit=50)

        assert len(users) == 2
        assert total == 2

    def test_list_users_with_search(self, admin_service):
        """Should filter users by search term."""
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 1
        mock_query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [MagicMock()]
        admin_service.db.query.return_value = mock_query

        admin_service.list_users(search="test@example.com")

        mock_query.filter.assert_called()

    def test_list_users_with_blocked_filter(self, admin_service):
        """Should filter users by blocked status."""
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 0
        mock_query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
        admin_service.db.query.return_value = mock_query

        admin_service.list_users(is_blocked=True)

        # Verify filter was called (at least for is_blocked)
        assert mock_query.filter.called

    def test_list_users_with_admin_filter(self, admin_service):
        """Should filter users by admin status."""
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 1
        mock_query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [MagicMock()]
        admin_service.db.query.return_value = mock_query

        admin_service.list_users(is_super_admin=True)

        assert mock_query.filter.called


class TestListWorkspaces:
    """Tests for workspace listing functionality."""

    @pytest.fixture
    def admin_service(self):
        from services.admin_service import AdminService
        mock_db = MagicMock()
        return AdminService(mock_db)

    def test_list_workspaces_returns_workspaces_and_count(self, admin_service):
        """Should return list of workspaces and total count."""
        mock_workspaces = [MagicMock(), MagicMock(), MagicMock()]

        mock_query = MagicMock()
        mock_query.count.return_value = 3
        mock_query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = mock_workspaces
        admin_service.db.query.return_value = mock_query

        workspaces, total = admin_service.list_workspaces(skip=0, limit=50)

        assert len(workspaces) == 3
        assert total == 3

    def test_list_workspaces_with_search(self, admin_service):
        """Should filter workspaces by name."""
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 1
        mock_query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [MagicMock()]
        admin_service.db.query.return_value = mock_query

        admin_service.list_workspaces(search="Marketing")

        mock_query.filter.assert_called()


class TestBlockUser:
    """Tests for user blocking functionality."""

    @pytest.fixture
    def admin_service(self):
        from services.admin_service import AdminService
        mock_db = MagicMock()
        return AdminService(mock_db)

    def test_block_user_success(self, admin_service):
        """Should successfully block a non-admin user."""
        user_id = uuid4()
        admin_id = uuid4()

        mock_user = MagicMock()
        mock_user.is_super_admin = False
        mock_user.is_blocked = False
        admin_service.db.query.return_value.filter.return_value.first.return_value = mock_user

        result = admin_service.block_user(user_id, admin_id)

        assert mock_user.is_blocked is True
        assert mock_user.blocked_by == admin_id
        admin_service.db.commit.assert_called()

    def test_block_user_raises_for_admin(self, admin_service):
        """Should raise error when trying to block a super admin."""
        user_id = uuid4()
        admin_id = uuid4()

        mock_user = MagicMock()
        mock_user.is_super_admin = True
        admin_service.db.query.return_value.filter.return_value.first.return_value = mock_user

        with pytest.raises(ValueError, match="Cannot block a super admin"):
            admin_service.block_user(user_id, admin_id)

    def test_block_user_raises_for_not_found(self, admin_service):
        """Should raise error when user not found."""
        user_id = uuid4()
        admin_id = uuid4()

        admin_service.db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(ValueError, match="User not found"):
            admin_service.block_user(user_id, admin_id)


class TestUnblockUser:
    """Tests for user unblocking functionality."""

    @pytest.fixture
    def admin_service(self):
        from services.admin_service import AdminService
        mock_db = MagicMock()
        return AdminService(mock_db)

    def test_unblock_user_success(self, admin_service):
        """Should successfully unblock a user."""
        user_id = uuid4()

        mock_user = MagicMock()
        mock_user.is_blocked = True
        mock_user.blocked_at = datetime.utcnow()
        mock_user.blocked_by = uuid4()
        admin_service.db.query.return_value.filter.return_value.first.return_value = mock_user

        result = admin_service.unblock_user(user_id)

        assert mock_user.is_blocked is False
        assert mock_user.blocked_at is None
        assert mock_user.blocked_by is None
        admin_service.db.commit.assert_called()

    def test_unblock_user_raises_for_not_found(self, admin_service):
        """Should raise error when user not found."""
        user_id = uuid4()

        admin_service.db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(ValueError, match="User not found"):
            admin_service.unblock_user(user_id)


class TestPromoteToAdmin:
    """Tests for admin promotion functionality."""

    @pytest.fixture
    def admin_service(self):
        from services.admin_service import AdminService
        mock_db = MagicMock()
        return AdminService(mock_db)

    def test_promote_to_admin_success(self, admin_service):
        """Should successfully promote user to admin."""
        user_id = uuid4()

        mock_user = MagicMock()
        mock_user.is_super_admin = False
        mock_user.is_blocked = False
        admin_service.db.query.return_value.filter.return_value.first.return_value = mock_user

        result = admin_service.promote_to_admin(user_id)

        assert mock_user.is_super_admin is True
        admin_service.db.commit.assert_called()

    def test_promote_to_admin_raises_for_blocked_user(self, admin_service):
        """Should raise error when promoting a blocked user."""
        user_id = uuid4()

        mock_user = MagicMock()
        mock_user.is_blocked = True
        admin_service.db.query.return_value.filter.return_value.first.return_value = mock_user

        with pytest.raises(ValueError, match="Cannot promote a blocked user"):
            admin_service.promote_to_admin(user_id)


class TestDemoteFromAdmin:
    """Tests for admin demotion functionality."""

    @pytest.fixture
    def admin_service(self):
        from services.admin_service import AdminService
        mock_db = MagicMock()
        return AdminService(mock_db)

    def test_demote_from_admin_success(self, admin_service):
        """Should successfully demote admin to regular user."""
        user_id = uuid4()
        current_admin_id = uuid4()

        mock_user = MagicMock()
        mock_user.is_super_admin = True
        admin_service.db.query.return_value.filter.return_value.first.return_value = mock_user

        result = admin_service.demote_from_admin(user_id, current_admin_id)

        assert mock_user.is_super_admin is False
        admin_service.db.commit.assert_called()

    def test_demote_from_admin_raises_for_self_demotion(self, admin_service):
        """Should raise error when trying to demote yourself."""
        user_id = uuid4()

        with pytest.raises(ValueError, match="Cannot demote yourself"):
            admin_service.demote_from_admin(user_id, user_id)

    def test_demote_from_admin_raises_for_not_found(self, admin_service):
        """Should raise error when user not found."""
        user_id = uuid4()
        current_admin_id = uuid4()

        admin_service.db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(ValueError, match="User not found"):
            admin_service.demote_from_admin(user_id, current_admin_id)
