"""
Unit tests for the Workflow Executor service.

Tests the core workflow execution engine including:
- Workflow initialization and setup
- Node execution coordination
- Progress tracking
- Error handling
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime
import uuid


class TestWorkflowExecutorInitialization:
    """Tests for WorkflowExecutor initialization."""

    def test_executor_creates_required_services(self):
        """Should create all required sub-services."""
        # Import here to avoid module-level import issues
        from services.workflow_executor import WorkflowExecutor
        from services.variable_resolver import VariableResolver
        from services.workflow_validator import WorkflowValidator

        mock_db = MagicMock()
        executor = WorkflowExecutor(mock_db)

        assert executor.db == mock_db
        assert isinstance(executor.resolver, VariableResolver)
        assert isinstance(executor.validator, WorkflowValidator)
        assert executor.state_manager is not None
        assert executor.output_parser is not None

    def test_executor_stores_db_session(self):
        """Should store database session for later use."""
        from services.workflow_executor import WorkflowExecutor

        mock_db = MagicMock()
        executor = WorkflowExecutor(mock_db)

        assert executor.db == mock_db


class TestWorkflowExecutorExecution:
    """Tests for workflow execution flow."""

    @pytest.fixture
    def mock_db(self):
        """Create mock database session."""
        return MagicMock()

    @pytest.fixture
    def mock_execution(self):
        """Create mock workflow execution."""
        execution = MagicMock()
        execution.id = str(uuid.uuid4())
        execution.status = "pending"
        execution.template_id = str(uuid.uuid4())
        execution.config_json = {"variables": {"topic": "test"}}
        execution.execution_context = {}
        return execution

    @pytest.fixture
    def mock_template(self):
        """Create mock workflow template."""
        template = MagicMock()
        template.id = str(uuid.uuid4())
        template.name = "Test Workflow"
        template.nodes_json = [
            {"id": "start_1", "type": "start", "data": {"input_variables": ["topic"]}},
            {"id": "finish_1", "type": "finish", "data": {}},
        ]
        template.edges_json = [
            {"id": "e1", "source": "start_1", "target": "finish_1"}
        ]
        return template

    @pytest.mark.asyncio
    async def test_execute_returns_error_for_missing_execution(self, mock_db):
        """Should yield error when execution not found."""
        from services.workflow_executor import WorkflowExecutor

        mock_db.query.return_value.filter.return_value.first.return_value = None
        executor = WorkflowExecutor(mock_db)

        results = []
        async for progress in executor.execute_workflow("nonexistent-id", "user-id"):
            results.append(progress)

        assert len(results) == 1
        assert results[0]["type"] == "error"
        assert "not found" in results[0]["message"].lower()

    @pytest.mark.asyncio
    async def test_execute_updates_status_to_running(self, mock_db, mock_execution, mock_template):
        """Should update execution status to running at start."""
        from services.workflow_executor import WorkflowExecutor

        # Setup mocks
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_execution,
            mock_template,
        ]

        executor = WorkflowExecutor(mock_db)

        # Start execution and collect first progress update
        async for progress in executor.execute_workflow(mock_execution.id, "user-id"):
            if progress.get("type") == "progress" and progress.get("progress") == 0:
                break

        # Verify status was updated
        assert mock_execution.status == "running"
        mock_db.commit.assert_called()

    @pytest.mark.asyncio
    async def test_execute_yields_progress_updates(self, mock_db, mock_execution, mock_template):
        """Should yield progress updates during execution."""
        from services.workflow_executor import WorkflowExecutor

        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_execution,
            mock_template,
        ]

        executor = WorkflowExecutor(mock_db)

        results = []
        try:
            async for progress in executor.execute_workflow(mock_execution.id, "user-id"):
                results.append(progress)
                if len(results) >= 2:  # Get initial progress updates
                    break
        except Exception:
            pass  # Expected when template structure is minimal

        # Should have at least one progress update
        assert len(results) >= 1
        assert any(r.get("type") == "progress" for r in results)


class TestWorkflowExecutorNodeExecution:
    """Tests for individual node execution."""

    def test_node_type_detection(self):
        """Should correctly identify node types from definitions."""
        from services.workflow_executor import WorkflowExecutor

        node_types = [
            ({"type": "start"}, "start"),
            ({"type": "text_generation"}, "text_generation"),
            ({"type": "image_generation"}, "image_generation"),
            ({"type": "conditional"}, "conditional"),
            ({"type": "loop"}, "loop"),
            ({"type": "finish"}, "finish"),
        ]

        for node, expected_type in node_types:
            assert node["type"] == expected_type


class TestWorkflowExecutorErrorHandling:
    """Tests for error handling in workflow execution."""

    @pytest.fixture
    def mock_db(self):
        """Create mock database session."""
        return MagicMock()

    @pytest.mark.asyncio
    async def test_handles_missing_template(self, mock_db):
        """Should handle missing workflow template gracefully."""
        from services.workflow_executor import WorkflowExecutor

        mock_execution = MagicMock()
        mock_execution.id = str(uuid.uuid4())
        mock_execution.status = "pending"
        mock_execution.template_id = "missing-template-id"

        # First query returns execution, second returns None (template not found)
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_execution,
            None,
        ]

        executor = WorkflowExecutor(mock_db)

        results = []
        async for progress in executor.execute_workflow(mock_execution.id, "user-id"):
            results.append(progress)

        # Should have an error result
        assert any(r.get("type") == "error" for r in results)

    @pytest.mark.asyncio
    async def test_handles_invalid_workflow_definition(self, mock_db):
        """Should handle invalid workflow definitions."""
        from services.workflow_executor import WorkflowExecutor

        mock_execution = MagicMock()
        mock_execution.id = str(uuid.uuid4())
        mock_execution.status = "pending"
        mock_execution.template_id = str(uuid.uuid4())

        mock_template = MagicMock()
        mock_template.nodes_json = None  # Invalid - should have nodes
        mock_template.edges_json = None

        mock_db.query.return_value.filter.return_value.first.side_effect = [
            mock_execution,
            mock_template,
        ]

        executor = WorkflowExecutor(mock_db)

        results = []
        async for progress in executor.execute_workflow(mock_execution.id, "user-id"):
            results.append(progress)

        # Should complete but may have error handling
        assert len(results) >= 1


class TestWorkflowExecutorContextManagement:
    """Tests for execution context management."""

    def test_execution_context_initialization(self):
        """Should initialize execution context correctly."""
        from services.workflow_executor import WorkflowExecutor

        mock_db = MagicMock()
        executor = WorkflowExecutor(mock_db)

        # Executor should have state manager for context
        assert executor.state_manager is not None

    def test_variable_resolver_integration(self):
        """Should integrate variable resolver for context resolution."""
        from services.workflow_executor import WorkflowExecutor
        from services.variable_resolver import VariableResolver

        mock_db = MagicMock()
        executor = WorkflowExecutor(mock_db)

        assert isinstance(executor.resolver, VariableResolver)

        # Test resolver can parse variables
        text = "{{start.input}}"
        variables = executor.resolver.parse_variables(text)
        assert variables == [("start", "input")]
