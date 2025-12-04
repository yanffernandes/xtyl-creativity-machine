"""
Test data factories for creating test objects.

Uses factory_boy for flexible, readable test data creation.
Factories can be used without database fixtures for unit tests.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class UserFactory:
    """Factory for creating User test data."""

    @staticmethod
    def create(
        id: Optional[str] = None,
        email: str = "test@example.com",
        full_name: str = "Test User",
        is_super_admin: bool = False,
        is_blocked: bool = False,
        **overrides: Any,
    ) -> Dict[str, Any]:
        """Create user data dictionary."""
        return {
            "id": id or str(uuid.uuid4()),
            "email": email,
            "full_name": full_name,
            "is_super_admin": is_super_admin,
            "is_blocked": is_blocked,
            "created_at": datetime.now(timezone.utc),
            **overrides,
        }

    @staticmethod
    def create_batch(count: int, **overrides: Any) -> list:
        """Create multiple user data dictionaries."""
        return [
            UserFactory.create(
                email=f"user{i}@example.com",
                full_name=f"Test User {i}",
                **overrides,
            )
            for i in range(count)
        ]


class WorkspaceFactory:
    """Factory for creating Workspace test data."""

    @staticmethod
    def create(
        id: Optional[str] = None,
        name: str = "Test Workspace",
        description: str = "A test workspace",
        default_text_model: Optional[str] = None,
        default_vision_model: Optional[str] = None,
        **overrides: Any,
    ) -> Dict[str, Any]:
        """Create workspace data dictionary."""
        return {
            "id": id or str(uuid.uuid4()),
            "name": name,
            "description": description,
            "default_text_model": default_text_model,
            "default_vision_model": default_vision_model,
            "created_at": datetime.now(timezone.utc),
            **overrides,
        }


class ProjectFactory:
    """Factory for creating Project test data."""

    @staticmethod
    def create(
        id: Optional[str] = None,
        name: str = "Test Project",
        description: str = "A test project",
        workspace_id: Optional[str] = None,
        settings: Optional[Dict] = None,
        **overrides: Any,
    ) -> Dict[str, Any]:
        """Create project data dictionary."""
        return {
            "id": id or str(uuid.uuid4()),
            "name": name,
            "description": description,
            "workspace_id": workspace_id or str(uuid.uuid4()),
            "settings": settings or {},
            "created_at": datetime.now(timezone.utc),
            **overrides,
        }


class DocumentFactory:
    """Factory for creating Document test data."""

    @staticmethod
    def create(
        id: Optional[str] = None,
        title: str = "Test Document",
        content: str = "# Test Content\n\nThis is test content.",
        status: str = "draft",
        project_id: Optional[str] = None,
        folder_id: Optional[str] = None,
        media_type: str = "text",
        file_url: Optional[str] = None,
        **overrides: Any,
    ) -> Dict[str, Any]:
        """Create document data dictionary."""
        return {
            "id": id or str(uuid.uuid4()),
            "title": title,
            "content": content,
            "status": status,
            "project_id": project_id or str(uuid.uuid4()),
            "folder_id": folder_id,
            "media_type": media_type,
            "file_url": file_url,
            "created_at": datetime.now(timezone.utc),
            **overrides,
        }

    @staticmethod
    def create_batch(count: int, project_id: Optional[str] = None, **overrides: Any) -> list:
        """Create multiple document data dictionaries."""
        pid = project_id or str(uuid.uuid4())
        return [
            DocumentFactory.create(
                title=f"Test Document {i}",
                project_id=pid,
                **overrides,
            )
            for i in range(count)
        ]


class WorkflowTemplateFactory:
    """Factory for creating WorkflowTemplate test data."""

    @staticmethod
    def create(
        id: Optional[str] = None,
        name: str = "Test Workflow",
        description: str = "A test workflow",
        workspace_id: Optional[str] = None,
        project_id: Optional[str] = None,
        category: str = "custom",
        nodes_json: Optional[list] = None,
        edges_json: Optional[list] = None,
        **overrides: Any,
    ) -> Dict[str, Any]:
        """Create workflow template data dictionary."""
        default_nodes = [
            {
                "id": "start_1",
                "type": "start",
                "position": {"x": 0, "y": 0},
                "data": {"input_variables": ["input"]},
            },
            {
                "id": "finish_1",
                "type": "finish",
                "position": {"x": 200, "y": 0},
                "data": {},
            },
        ]
        default_edges = [
            {"id": "e1", "source": "start_1", "target": "finish_1"},
        ]

        return {
            "id": id or str(uuid.uuid4()),
            "name": name,
            "description": description,
            "workspace_id": workspace_id,
            "project_id": project_id,
            "category": category,
            "nodes_json": nodes_json or default_nodes,
            "edges_json": edges_json or default_edges,
            "created_at": datetime.now(timezone.utc),
            **overrides,
        }

    @staticmethod
    def create_text_generation_workflow(
        id: Optional[str] = None,
        name: str = "Text Generation Workflow",
        **overrides: Any,
    ) -> Dict[str, Any]:
        """Create a workflow with text generation node."""
        nodes = [
            {
                "id": "start_1",
                "type": "start",
                "position": {"x": 0, "y": 0},
                "data": {"input_variables": ["topic"]},
            },
            {
                "id": "text_gen_1",
                "type": "text_generation",
                "position": {"x": 200, "y": 0},
                "data": {
                    "prompt": "Write about {{start_1.topic}}",
                    "model": "anthropic/claude-sonnet-4-20250514",
                },
            },
            {
                "id": "finish_1",
                "type": "finish",
                "position": {"x": 400, "y": 0},
                "data": {},
            },
        ]
        edges = [
            {"id": "e1", "source": "start_1", "target": "text_gen_1"},
            {"id": "e2", "source": "text_gen_1", "target": "finish_1"},
        ]

        return WorkflowTemplateFactory.create(
            id=id,
            name=name,
            nodes_json=nodes,
            edges_json=edges,
            **overrides,
        )


class WorkflowExecutionFactory:
    """Factory for creating WorkflowExecution test data."""

    @staticmethod
    def create(
        id: Optional[str] = None,
        template_id: Optional[str] = None,
        status: str = "pending",
        config_json: Optional[Dict] = None,
        execution_context: Optional[Dict] = None,
        **overrides: Any,
    ) -> Dict[str, Any]:
        """Create workflow execution data dictionary."""
        return {
            "id": id or str(uuid.uuid4()),
            "template_id": template_id or str(uuid.uuid4()),
            "status": status,
            "config_json": config_json or {"variables": {}},
            "execution_context": execution_context or {},
            "created_at": datetime.now(timezone.utc),
            **overrides,
        }


class ChatConversationFactory:
    """Factory for creating ChatConversation test data."""

    @staticmethod
    def create(
        id: Optional[str] = None,
        project_id: Optional[str] = None,
        user_id: Optional[str] = None,
        title: str = "Test Conversation",
        messages_json: Optional[list] = None,
        **overrides: Any,
    ) -> Dict[str, Any]:
        """Create chat conversation data dictionary."""
        return {
            "id": id or str(uuid.uuid4()),
            "project_id": project_id or str(uuid.uuid4()),
            "user_id": user_id or str(uuid.uuid4()),
            "title": title,
            "messages_json": messages_json or [],
            "created_at": datetime.now(timezone.utc),
            **overrides,
        }


class LLMResponseFactory:
    """Factory for creating mock LLM response data."""

    @staticmethod
    def create(
        content: str = "This is a mock LLM response.",
        role: str = "assistant",
        finish_reason: str = "stop",
        prompt_tokens: int = 10,
        completion_tokens: int = 20,
        **overrides: Any,
    ) -> Dict[str, Any]:
        """Create LLM response data dictionary."""
        return {
            "choices": [
                {
                    "message": {
                        "content": content,
                        "role": role,
                    },
                    "finish_reason": finish_reason,
                }
            ],
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
            },
            **overrides,
        }

    @staticmethod
    def create_stream_chunks(content: str = "Hello world!") -> list:
        """Create list of streaming response chunks."""
        return [
            {"choices": [{"delta": {"content": char}}]}
            for char in content
        ]
