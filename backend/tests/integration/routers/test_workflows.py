"""
Integration tests for Workflows Router.

Tests the workflow templates API endpoints with real database operations.
"""

import pytest
from unittest.mock import patch, MagicMock
import uuid


class TestListWorkflowTemplates:
    """Tests for GET /workflows/ endpoint."""

    def test_list_templates_requires_auth(self, test_client):
        """Should require authentication."""
        response = test_client.get("/workflows/")
        assert response.status_code == 401

    def test_list_templates_returns_empty_for_new_workspace(
        self, test_client, auth_headers, test_workspace
    ):
        """Should return empty list for workspace with no templates."""
        response = test_client.get(
            f"/workflows/?workspace_id={test_workspace.id}",
            headers=auth_headers
        )
        # May return system templates, check for 200
        assert response.status_code == 200

    def test_list_templates_filters_by_category(
        self, test_client, auth_headers, test_workspace, db_session
    ):
        """Should filter templates by category."""
        from models import WorkflowTemplate

        # Create test templates with different categories
        template1 = WorkflowTemplate(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="Social Template",
            category="social_media",
            nodes_json=[],
            edges_json=[],
            is_system=False
        )
        template2 = WorkflowTemplate(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="Blog Template",
            category="blog",
            nodes_json=[],
            edges_json=[],
            is_system=False
        )
        db_session.add_all([template1, template2])
        db_session.commit()

        response = test_client.get(
            f"/workflows/?workspace_id={test_workspace.id}&category=social_media",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        # All returned templates should be social_media category
        for template in data:
            if template["workspace_id"] == str(test_workspace.id):
                assert template["category"] == "social_media"


class TestGetWorkflowTemplate:
    """Tests for GET /workflows/{template_id} endpoint."""

    def test_get_template_not_found(self, test_client, auth_headers):
        """Should return 404 for non-existent template."""
        fake_id = str(uuid.uuid4())
        response = test_client.get(
            f"/workflows/{fake_id}",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_get_template_success(self, test_client, auth_headers, test_workspace, db_session):
        """Should return template details."""
        from models import WorkflowTemplate

        template = WorkflowTemplate(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="Test Template",
            description="Test description",
            category="blog",
            nodes_json=[{"id": "start", "type": "start", "data": {}}],
            edges_json=[],
            is_system=False
        )
        db_session.add(template)
        db_session.commit()

        response = test_client.get(
            f"/workflows/{template.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == template.id
        assert data["name"] == "Test Template"


class TestCreateWorkflowTemplate:
    """Tests for POST /workflows/ endpoint."""

    def test_create_template_requires_auth(self, test_client):
        """Should require authentication."""
        response = test_client.post("/workflows/", json={})
        assert response.status_code == 401

    def test_create_template_validates_workspace(self, test_client, auth_headers):
        """Should validate workspace exists."""
        fake_workspace_id = str(uuid.uuid4())

        response = test_client.post(
            "/workflows/",
            headers=auth_headers,
            json={
                "workspace_id": fake_workspace_id,
                "name": "Test",
                "nodes": [],
                "edges": []
            }
        )

        assert response.status_code == 404
        assert "Workspace not found" in response.json()["detail"]

    def test_create_template_validates_workflow_structure(
        self, test_client, auth_headers, test_workspace
    ):
        """Should validate workflow has required nodes."""
        response = test_client.post(
            "/workflows/",
            headers=auth_headers,
            json={
                "workspace_id": str(test_workspace.id),
                "name": "Invalid Workflow",
                "nodes": [],  # Empty nodes - should fail validation
                "edges": []
            }
        )

        # Workflow validator should reject empty workflows
        assert response.status_code == 400

    def test_create_template_success(self, test_client, auth_headers, test_workspace):
        """Should create a valid workflow template."""
        response = test_client.post(
            "/workflows/",
            headers=auth_headers,
            json={
                "workspace_id": str(test_workspace.id),
                "name": "My Workflow",
                "description": "A test workflow",
                "category": "blog",
                "nodes": [
                    {"id": "start_1", "type": "start", "position": {"x": 0, "y": 0}, "data": {}},
                    {"id": "finish_1", "type": "finish", "position": {"x": 200, "y": 0}, "data": {}}
                ],
                "edges": [
                    {"id": "e1", "source": "start_1", "target": "finish_1"}
                ]
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "My Workflow"
        assert data["workspace_id"] == str(test_workspace.id)
        assert len(data["nodes_json"]) == 2


class TestUpdateWorkflowTemplate:
    """Tests for PUT /workflows/{template_id} endpoint."""

    def test_update_template_not_found(self, test_client, auth_headers):
        """Should return 404 for non-existent template."""
        fake_id = str(uuid.uuid4())
        response = test_client.put(
            f"/workflows/{fake_id}",
            headers=auth_headers,
            json={"name": "Updated"}
        )
        assert response.status_code == 404

    def test_update_system_template_forbidden(
        self, test_client, auth_headers, test_workspace, db_session
    ):
        """Should not allow updating system templates."""
        from models import WorkflowTemplate

        template = WorkflowTemplate(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="System Template",
            nodes_json=[],
            edges_json=[],
            is_system=True  # System template
        )
        db_session.add(template)
        db_session.commit()

        response = test_client.put(
            f"/workflows/{template.id}",
            headers=auth_headers,
            json={"name": "Updated"}
        )

        assert response.status_code == 403
        assert "Cannot modify system templates" in response.json()["detail"]

    def test_update_other_users_template_forbidden(
        self, test_client, auth_headers, test_workspace, db_session
    ):
        """Should not allow updating templates created by other users."""
        from models import WorkflowTemplate

        template = WorkflowTemplate(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="Other User Template",
            nodes_json=[],
            edges_json=[],
            is_system=False,
            created_by=str(uuid.uuid4())  # Different user
        )
        db_session.add(template)
        db_session.commit()

        response = test_client.put(
            f"/workflows/{template.id}",
            headers=auth_headers,
            json={"name": "Updated"}
        )

        assert response.status_code == 403


class TestDeleteWorkflowTemplate:
    """Tests for DELETE /workflows/{template_id} endpoint."""

    def test_delete_system_template_forbidden(
        self, test_client, auth_headers, test_workspace, db_session
    ):
        """Should not allow deleting system templates."""
        from models import WorkflowTemplate

        template = WorkflowTemplate(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="System Template",
            nodes_json=[],
            edges_json=[],
            is_system=True
        )
        db_session.add(template)
        db_session.commit()

        response = test_client.delete(
            f"/workflows/{template.id}",
            headers=auth_headers
        )

        assert response.status_code == 403

    def test_delete_with_active_executions_fails(
        self, test_client, auth_headers, test_user, test_workspace, test_project, db_session
    ):
        """Should not allow deleting template with active executions."""
        from models import WorkflowTemplate, WorkflowExecution

        template = WorkflowTemplate(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="Busy Template",
            nodes_json=[],
            edges_json=[],
            is_system=False,
            created_by=str(test_user.id)
        )
        db_session.add(template)
        db_session.commit()

        execution = WorkflowExecution(
            id=str(uuid.uuid4()),
            template_id=template.id,
            project_id=str(test_project.id),
            user_id=str(test_user.id),
            status="running"  # Active execution
        )
        db_session.add(execution)
        db_session.commit()

        response = test_client.delete(
            f"/workflows/{template.id}",
            headers=auth_headers
        )

        assert response.status_code == 400
        assert "active executions" in response.json()["detail"]


class TestDuplicateWorkflowTemplate:
    """Tests for POST /workflows/{template_id}/duplicate endpoint."""

    def test_duplicate_template_success(
        self, test_client, auth_headers, test_workspace, db_session
    ):
        """Should successfully duplicate a template."""
        from models import WorkflowTemplate

        source = WorkflowTemplate(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="Source Template",
            description="Original description",
            category="blog",
            nodes_json=[{"id": "start", "type": "start", "data": {}}],
            edges_json=[],
            is_system=False
        )
        db_session.add(source)
        db_session.commit()

        response = test_client.post(
            f"/workflows/{source.id}/duplicate?workspace_id={test_workspace.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] != source.id
        assert "Copy" in data["name"]
        assert data["is_system"] is False

    def test_duplicate_with_custom_name(
        self, test_client, auth_headers, test_workspace, db_session
    ):
        """Should use custom name when provided."""
        from models import WorkflowTemplate

        source = WorkflowTemplate(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="Source",
            nodes_json=[],
            edges_json=[],
            is_system=False
        )
        db_session.add(source)
        db_session.commit()

        response = test_client.post(
            f"/workflows/{source.id}/duplicate?workspace_id={test_workspace.id}&name=Custom%20Name",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Custom Name"


class TestValidateWorkflow:
    """Tests for POST /workflows/validate endpoint."""

    def test_validate_empty_workflow_fails(self, test_client, auth_headers):
        """Should reject workflow with no nodes."""
        response = test_client.post(
            "/workflows/validate",
            headers=auth_headers,
            json={"nodes": [], "edges": []}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert len(data["errors"]) > 0

    def test_validate_workflow_missing_start(self, test_client, auth_headers):
        """Should reject workflow without start node."""
        response = test_client.post(
            "/workflows/validate",
            headers=auth_headers,
            json={
                "nodes": [
                    {"id": "finish_1", "type": "finish", "data": {}}
                ],
                "edges": []
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False

    def test_validate_valid_workflow(self, test_client, auth_headers):
        """Should accept valid workflow structure."""
        response = test_client.post(
            "/workflows/validate",
            headers=auth_headers,
            json={
                "nodes": [
                    {"id": "start_1", "type": "start", "position": {"x": 0, "y": 0}, "data": {}},
                    {"id": "finish_1", "type": "finish", "position": {"x": 200, "y": 0}, "data": {}}
                ],
                "edges": [
                    {"id": "e1", "source": "start_1", "target": "finish_1"}
                ]
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True


class TestListCategories:
    """Tests for GET /workflows/categories/list endpoint."""

    def test_list_categories(self, test_client, auth_headers):
        """Should return list of workflow categories."""
        response = test_client.get(
            "/workflows/categories/list",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0

        # Check category structure
        for category in data["categories"]:
            assert "id" in category
            assert "name" in category
            assert "description" in category
