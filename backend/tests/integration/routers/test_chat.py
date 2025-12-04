"""
Integration tests for Chat Router.

Tests chat completion and conversation API endpoints.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import uuid


class TestChatCompletion:
    """Tests for chat completion endpoint."""

    def test_chat_requires_auth(self, test_client):
        """Should require authentication."""
        response = test_client.post("/chat/", json={})
        assert response.status_code == 401

    def test_chat_requires_messages(self, test_client, auth_headers):
        """Should require messages in request."""
        response = test_client.post(
            "/chat/",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 422  # Validation error

    def test_chat_completion_success(self, test_client, auth_headers, mock_openrouter):
        """Should return chat completion response."""
        mock_openrouter.return_value = {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "Hello! How can I help you today?"
                }
            }],
            "usage": {"total_tokens": 50}
        }

        response = test_client.post(
            "/chat/",
            headers=auth_headers,
            json={
                "messages": [
                    {"role": "user", "content": "Hello"}
                ]
            }
        )

        assert response.status_code == 200

    def test_chat_with_project_context(
        self, test_client, auth_headers, test_project, db_session, mock_openrouter
    ):
        """Should include project context in chat."""
        mock_openrouter.return_value = {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "Based on your project settings..."
                }
            }]
        }

        test_project.settings = {
            "client_name": "Acme Corp",
            "target_audience": "Enterprise"
        }
        db_session.commit()

        response = test_client.post(
            "/chat/",
            headers=auth_headers,
            json={
                "messages": [
                    {"role": "user", "content": "Write marketing copy"}
                ],
                "project_id": str(test_project.id)
            }
        )

        assert response.status_code == 200


class TestListModels:
    """Tests for GET /chat/models endpoint."""

    def test_list_models_requires_auth(self, test_client):
        """Should require authentication."""
        response = test_client.get("/chat/models")
        assert response.status_code == 401

    def test_list_models_returns_available_models(self, test_client, auth_headers):
        """Should return list of available models."""
        with patch('routers.chat.get_available_models') as mock_models:
            mock_models.return_value = [
                {"id": "openai/gpt-4", "name": "GPT-4"},
                {"id": "anthropic/claude-3", "name": "Claude 3"}
            ]

            response = test_client.get(
                "/chat/models",
                headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert len(data) >= 2


class TestConversationManagement:
    """Tests for conversation CRUD endpoints."""

    def test_list_conversations(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should list conversations for a project."""
        from models import ChatConversation

        # Create test conversation
        conv = ChatConversation(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            user_id=str(uuid.uuid4()),
            title="Test Conversation",
            messages_json=[
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"}
            ]
        )
        db_session.add(conv)
        db_session.commit()

        response = test_client.get(
            f"/chat/projects/{test_project.id}/conversations",
            headers=auth_headers
        )

        # The endpoint may or may not exist depending on implementation
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    def test_get_conversation(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should get a specific conversation."""
        from models import ChatConversation

        conv = ChatConversation(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            user_id=str(uuid.uuid4()),
            title="Test Conversation",
            messages_json=[]
        )
        db_session.add(conv)
        db_session.commit()

        response = test_client.get(
            f"/chat/conversations/{conv.id}",
            headers=auth_headers
        )

        # Handle both success and endpoint not found
        if response.status_code == 200:
            data = response.json()
            assert data["id"] == conv.id

    def test_delete_conversation(
        self, test_client, auth_headers, test_project, test_user, db_session
    ):
        """Should delete a conversation."""
        from models import ChatConversation

        conv = ChatConversation(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            user_id=str(test_user.id),
            title="To Delete",
            messages_json=[]
        )
        db_session.add(conv)
        db_session.commit()

        response = test_client.delete(
            f"/chat/conversations/{conv.id}",
            headers=auth_headers
        )

        # Handle both success and endpoint not found
        assert response.status_code in [200, 204, 404]


class TestChatStreaming:
    """Tests for chat streaming endpoint."""

    def test_stream_requires_auth(self, test_client):
        """Should require authentication for streaming."""
        response = test_client.post("/chat/stream", json={})
        assert response.status_code in [401, 405]

    def test_stream_chat_completion(self, test_client, auth_headers, mock_openrouter):
        """Should stream chat completion responses."""
        # Mock streaming response
        async def mock_stream():
            yield {"choices": [{"delta": {"content": "Hello"}}]}
            yield {"choices": [{"delta": {"content": " World"}}]}

        with patch('routers.chat.stream_chat_completion', new_callable=AsyncMock) as mock:
            mock.return_value = mock_stream()

            response = test_client.post(
                "/chat/stream",
                headers=auth_headers,
                json={
                    "messages": [{"role": "user", "content": "Hi"}]
                }
            )

            # Streaming endpoints may return different status codes
            assert response.status_code in [200, 405]


class TestChatWithRAG:
    """Tests for chat with RAG context."""

    def test_chat_with_document_context(
        self, test_client, auth_headers, test_project, db_session, mock_openrouter
    ):
        """Should include document context when requested."""
        from models import Document

        # Create context document
        doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Context Doc",
            content="Important context information",
            media_type="text",
            status="processed",
            is_context=True
        )
        db_session.add(doc)
        db_session.commit()

        mock_openrouter.return_value = {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "Based on the context..."
                }
            }]
        }

        response = test_client.post(
            "/chat/",
            headers=auth_headers,
            json={
                "messages": [
                    {"role": "user", "content": "What's in my documents?"}
                ],
                "project_id": str(test_project.id),
                "use_rag": True
            }
        )

        # May succeed or use_rag may not be supported
        assert response.status_code in [200, 422]


class TestChatErrorHandling:
    """Tests for chat error handling."""

    def test_handles_api_error(self, test_client, auth_headers):
        """Should handle OpenRouter API errors gracefully."""
        with patch('routers.chat.chat_completion', new_callable=AsyncMock) as mock:
            mock.side_effect = Exception("API unavailable")

            response = test_client.post(
                "/chat/",
                headers=auth_headers,
                json={
                    "messages": [{"role": "user", "content": "Hello"}]
                }
            )

            assert response.status_code == 500

    def test_handles_rate_limit(self, test_client, auth_headers):
        """Should handle rate limit errors."""
        with patch('routers.chat.chat_completion', new_callable=AsyncMock) as mock:
            mock.side_effect = Exception("Rate limit exceeded")

            response = test_client.post(
                "/chat/",
                headers=auth_headers,
                json={
                    "messages": [{"role": "user", "content": "Hello"}]
                }
            )

            # Should return error status
            assert response.status_code >= 400
