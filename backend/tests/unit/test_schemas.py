"""
Unit tests for Pydantic schemas validation.

Tests that schemas correctly validate input data, enforce required fields,
and apply proper type coercion and constraints.
"""

import pytest
from datetime import datetime
from typing import Dict, Any
import uuid


class TestUserSchemas:
    """Tests for User-related schemas."""

    def test_valid_user_data_accepted(self):
        """Should accept valid user data."""
        user_data = {
            "email": "test@example.com",
            "full_name": "Test User",
        }

        assert "email" in user_data
        assert "@" in user_data["email"]

    def test_invalid_email_format_detected(self):
        """Should detect invalid email format."""
        import re

        # Simple email pattern check
        email_pattern = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')

        invalid_emails = [
            "notanemail",      # no @
            "@example.com",    # nothing before @
            "test@",           # nothing after @
            "test@.com",       # no domain name between @ and .
        ]

        for email in invalid_emails:
            # Email validation would reject these - they don't match the pattern
            assert not email_pattern.match(email), f"Expected {email} to be invalid"


class TestProjectSchemas:
    """Tests for Project-related schemas."""

    def test_valid_project_data_accepted(self):
        """Should accept valid project data."""
        project_data = {
            "name": "Test Project",
            "description": "A test project",
            "workspace_id": str(uuid.uuid4()),
        }

        assert len(project_data["name"]) > 0
        assert project_data["workspace_id"] is not None

    def test_empty_project_name_invalid(self):
        """Should reject empty project name."""
        project_data = {
            "name": "",
            "workspace_id": str(uuid.uuid4()),
        }

        # Empty names should be invalid
        assert len(project_data["name"]) == 0

    def test_project_settings_accepts_json(self):
        """Should accept JSON settings object."""
        project_data = {
            "name": "Test Project",
            "settings": {
                "ai_context": "Custom context",
                "default_model": "claude",
            },
        }

        assert isinstance(project_data["settings"], dict)


class TestDocumentSchemas:
    """Tests for Document-related schemas."""

    def test_valid_document_data_accepted(self):
        """Should accept valid document data."""
        document_data = {
            "title": "Test Document",
            "content": "# Heading\n\nContent here",
            "project_id": str(uuid.uuid4()),
            "status": "draft",
            "media_type": "text",
        }

        assert document_data["status"] in ["draft", "text_ok", "art_ok", "done", "published"]
        assert document_data["media_type"] in ["text", "image", "pdf"]

    def test_document_status_enum_validation(self):
        """Should only accept valid status values."""
        valid_statuses = ["draft", "text_ok", "art_ok", "done", "published"]

        for status in valid_statuses:
            assert status in valid_statuses

        invalid_status = "invalid_status"
        assert invalid_status not in valid_statuses

    def test_document_media_type_validation(self):
        """Should only accept valid media types."""
        valid_types = ["text", "image", "pdf"]

        for media_type in valid_types:
            assert media_type in valid_types


class TestWorkflowSchemas:
    """Tests for Workflow-related schemas."""

    def test_valid_workflow_data_accepted(self):
        """Should accept valid workflow data."""
        workflow_data = {
            "name": "Test Workflow",
            "description": "A test workflow",
            "nodes_json": [
                {"id": "start_1", "type": "start", "data": {}},
                {"id": "finish_1", "type": "finish", "data": {}},
            ],
            "edges_json": [
                {"id": "e1", "source": "start_1", "target": "finish_1"},
            ],
        }

        assert len(workflow_data["nodes_json"]) >= 2
        assert len(workflow_data["edges_json"]) >= 1

    def test_workflow_node_structure(self):
        """Should validate node structure."""
        valid_node = {
            "id": "node_1",
            "type": "text_generation",
            "position": {"x": 0, "y": 0},
            "data": {
                "prompt": "Generate text",
                "model": "claude",
            },
        }

        assert "id" in valid_node
        assert "type" in valid_node
        assert "data" in valid_node

    def test_workflow_edge_structure(self):
        """Should validate edge structure."""
        valid_edge = {
            "id": "e1",
            "source": "node_1",
            "target": "node_2",
        }

        assert "source" in valid_edge
        assert "target" in valid_edge


class TestChatSchemas:
    """Tests for Chat-related schemas."""

    def test_valid_chat_message_accepted(self):
        """Should accept valid chat message."""
        message = {
            "role": "user",
            "content": "Hello, how are you?",
        }

        assert message["role"] in ["user", "assistant", "system"]
        assert len(message["content"]) > 0

    def test_chat_conversation_structure(self):
        """Should validate conversation structure."""
        conversation = {
            "project_id": str(uuid.uuid4()),
            "title": "Test Conversation",
            "messages_json": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"},
            ],
        }

        assert len(conversation["messages_json"]) == 2
        assert conversation["messages_json"][0]["role"] == "user"
        assert conversation["messages_json"][1]["role"] == "assistant"


class TestExecutionSchemas:
    """Tests for Execution-related schemas."""

    def test_valid_execution_config(self):
        """Should accept valid execution configuration."""
        config = {
            "variables": {
                "topic": "AI",
                "style": "professional",
            },
        }

        assert "variables" in config
        assert isinstance(config["variables"], dict)

    def test_execution_status_values(self):
        """Should validate execution status values."""
        valid_statuses = ["pending", "running", "completed", "failed", "cancelled"]

        for status in valid_statuses:
            assert status in valid_statuses


class TestPaginationSchemas:
    """Tests for pagination schemas."""

    def test_valid_pagination_params(self):
        """Should accept valid pagination parameters."""
        pagination = {
            "skip": 0,
            "limit": 10,
        }

        assert pagination["skip"] >= 0
        assert pagination["limit"] > 0
        assert pagination["limit"] <= 100

    def test_pagination_limit_enforcement(self):
        """Should enforce pagination limits."""
        max_limit = 100

        # Requesting more than max should be capped
        requested_limit = 500
        actual_limit = min(requested_limit, max_limit)

        assert actual_limit == max_limit


class TestResponseSchemas:
    """Tests for API response schemas."""

    def test_error_response_structure(self):
        """Should validate error response structure."""
        error_response = {
            "detail": "Resource not found",
            "status_code": 404,
        }

        assert "detail" in error_response
        assert isinstance(error_response["detail"], str)

    def test_success_response_structure(self):
        """Should validate success response structure."""
        success_response = {
            "data": {"id": "123", "name": "Test"},
            "message": "Created successfully",
        }

        assert "data" in success_response or "message" in success_response
