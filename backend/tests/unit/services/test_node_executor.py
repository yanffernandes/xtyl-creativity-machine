"""
Unit tests for Node Executor service.

Tests the dispatcher and individual node type handlers.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import uuid


class TestExecuteNode:
    """Tests for the execute_node dispatcher function."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        db = MagicMock()
        db.add = MagicMock()
        db.commit = MagicMock()
        db.query = MagicMock()
        return db

    @pytest.fixture
    def mock_execution(self):
        """Create a mock workflow execution."""
        execution = MagicMock()
        execution.id = str(uuid.uuid4())
        execution.project_id = str(uuid.uuid4())
        execution.user_id = str(uuid.uuid4())
        execution.config_json = {"topic": "AI", "style": "professional"}
        execution.generated_document_ids = []
        return execution

    @pytest.mark.asyncio
    async def test_execute_node_routes_to_correct_handler(self, mock_db, mock_execution):
        """Should route node execution to the correct handler based on node type."""
        from services.node_executor import execute_node

        node = {
            "id": "start_1",
            "type": "start",
            "data": {"inputVariables": []}
        }

        with patch('services.node_executor.execute_start_node', new_callable=AsyncMock) as mock_handler:
            mock_handler.return_value = {"status": "started"}

            result = await execute_node(node, mock_execution, mock_db)

            mock_handler.assert_called_once()
            assert result == {"status": "started"}

    @pytest.mark.asyncio
    async def test_execute_node_raises_for_unknown_type(self, mock_db, mock_execution):
        """Should raise ValueError for unknown node types."""
        from services.node_executor import execute_node

        node = {
            "id": "unknown_1",
            "type": "unknown_node_type",
            "data": {}
        }

        with pytest.raises(ValueError, match="Unknown node type"):
            await execute_node(node, mock_execution, mock_db)

    @pytest.mark.asyncio
    async def test_execute_node_creates_agent_job(self, mock_db, mock_execution):
        """Should create an AgentJob record for tracking."""
        from services.node_executor import execute_node

        node = {
            "id": "start_1",
            "type": "start",
            "data": {}
        }

        with patch('services.node_executor.execute_start_node', new_callable=AsyncMock) as mock_handler:
            mock_handler.return_value = {"status": "started"}

            await execute_node(node, mock_execution, mock_db)

            # Verify db.add was called (to add the AgentJob)
            assert mock_db.add.called
            assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_execute_node_handles_handler_failure(self, mock_db, mock_execution):
        """Should mark job as failed when handler raises exception."""
        from services.node_executor import execute_node

        node = {
            "id": "text_1",
            "type": "text_generation",
            "data": {"prompt": "test"}
        }

        with patch('services.node_executor.execute_generate_copy_node', new_callable=AsyncMock) as mock_handler:
            mock_handler.side_effect = Exception("LLM service unavailable")

            with pytest.raises(Exception, match="LLM service unavailable"):
                await execute_node(node, mock_execution, mock_db)


class TestExecuteStartNode:
    """Tests for start node execution."""

    @pytest.fixture
    def mock_db(self):
        return MagicMock()

    @pytest.fixture
    def mock_execution(self):
        execution = MagicMock()
        execution.id = str(uuid.uuid4())
        execution.config_json = {"topic": "AI", "audience": "developers"}
        return execution

    @pytest.mark.asyncio
    async def test_start_node_returns_status(self, mock_db, mock_execution):
        """Should return started status."""
        from services.node_executor import execute_start_node

        node = {
            "id": "start_1",
            "type": "start",
            "data": {}
        }

        result = await execute_start_node(node, mock_execution, mock_db)

        assert result["status"] == "started"
        assert "input_variables" in result

    @pytest.mark.asyncio
    async def test_start_node_extracts_input_variables(self, mock_db, mock_execution):
        """Should extract input variables from execution config."""
        from services.node_executor import execute_start_node

        node = {
            "id": "start_1",
            "type": "start",
            "data": {
                "inputVariables": [
                    {"name": "topic", "defaultValue": "default_topic"},
                    {"name": "audience", "defaultValue": "general"}
                ]
            }
        }

        result = await execute_start_node(node, mock_execution, mock_db)

        assert result["input_variables"]["topic"] == "AI"
        assert result["input_variables"]["audience"] == "developers"

    @pytest.mark.asyncio
    async def test_start_node_uses_default_values(self, mock_db, mock_execution):
        """Should use default values when config doesn't have the variable."""
        from services.node_executor import execute_start_node

        mock_execution.config_json = {"other_key": "value"}  # Config without 'topic'

        node = {
            "id": "start_1",
            "type": "start",
            "data": {
                "inputVariables": [
                    {"name": "topic", "defaultValue": "default_topic"}
                ]
            }
        }

        result = await execute_start_node(node, mock_execution, mock_db)

        assert result["input_variables"].get("topic") == "default_topic"


class TestExecuteLoopNode:
    """Tests for loop node execution."""

    @pytest.fixture
    def mock_db(self):
        return MagicMock()

    @pytest.fixture
    def mock_execution(self):
        return MagicMock()

    @pytest.mark.asyncio
    async def test_loop_node_initialization(self, mock_db, mock_execution):
        """Should initialize loop with correct parameters."""
        from services.node_executor import execute_loop_node

        node = {
            "id": "loop_1",
            "type": "loop",
            "data": {
                "iterations": 5,
                "condition": "item.status == 'active'"
            }
        }

        result = await execute_loop_node(node, mock_execution, mock_db)

        assert result["status"] == "loop_initialized"
        assert result["iterations"] == 5
        assert result["condition"] == "item.status == 'active'"
        assert result["current_iteration"] == 0


class TestExecuteGenerateCopyNode:
    """Tests for text generation node execution."""

    @pytest.fixture
    def mock_db(self):
        db = MagicMock()
        db.add = MagicMock()
        db.commit = MagicMock()
        return db

    @pytest.fixture
    def mock_execution(self):
        execution = MagicMock()
        execution.id = str(uuid.uuid4())
        execution.project_id = str(uuid.uuid4())
        execution.config_json = {"topic": "AI"}
        return execution

    @pytest.mark.asyncio
    async def test_generate_copy_calls_llm_service(self, mock_db, mock_execution):
        """Should call the LLM service with the prompt."""
        from services.node_executor import execute_generate_copy_node

        node = {
            "id": "text_1",
            "type": "text_generation",
            "data": {
                "prompt": "Write about {topic}",
                "model": "openai/gpt-4",
                "temperature": 0.7,
                "save_as_document": False
            }
        }

        with patch('services.node_executor.chat_completion', new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = {
                "choices": [{"message": {"content": "AI is transforming the world..."}}]
            }

            result = await execute_generate_copy_node(node, mock_execution, mock_db)

            mock_llm.assert_called_once()
            assert "AI is transforming" in result["content"]

    @pytest.mark.asyncio
    async def test_generate_copy_replaces_template_variables(self, mock_db, mock_execution):
        """Should replace template variables with config values."""
        from services.node_executor import execute_generate_copy_node

        node = {
            "id": "text_1",
            "type": "text_generation",
            "data": {
                "prompt": "Write about {topic}",
                "save_as_document": False
            }
        }

        with patch('services.node_executor.chat_completion', new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = {
                "choices": [{"message": {"content": "Content about AI"}}]
            }

            await execute_generate_copy_node(node, mock_execution, mock_db)

            # Verify the prompt was called with "Write about AI" (variable replaced)
            call_args = mock_llm.call_args
            messages = call_args.kwargs.get('messages', call_args.args[0] if call_args.args else [])
            assert "AI" in messages[0]["content"]

    @pytest.mark.asyncio
    async def test_generate_copy_creates_document_when_save_enabled(self, mock_db, mock_execution):
        """Should create a document when save_as_document is True."""
        from services.node_executor import execute_generate_copy_node

        node = {
            "id": "text_1",
            "type": "text_generation",
            "data": {
                "prompt": "Generate content",
                "save_as_document": True,
                "title": "Test Document"
            }
        }

        with patch('services.node_executor.chat_completion', new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = {
                "choices": [{"message": {"content": "Generated content"}}]
            }

            result = await execute_generate_copy_node(node, mock_execution, mock_db)

            assert mock_db.add.called
            assert len(result["document_ids"]) > 0

    @pytest.mark.asyncio
    async def test_generate_copy_skips_document_when_save_disabled(self, mock_db, mock_execution):
        """Should not create a document when save_as_document is False."""
        from services.node_executor import execute_generate_copy_node

        node = {
            "id": "text_1",
            "type": "text_generation",
            "data": {
                "prompt": "Generate content",
                "save_as_document": False
            }
        }

        with patch('services.node_executor.chat_completion', new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = {
                "choices": [{"message": {"content": "Generated content"}}]
            }

            result = await execute_generate_copy_node(node, mock_execution, mock_db)

            assert result["document_ids"] == []
            assert result["content"] == "Generated content"


class TestExecuteGenerateImageNode:
    """Tests for image generation node execution."""

    @pytest.fixture
    def mock_db(self):
        db = MagicMock()
        db.add = MagicMock()
        db.commit = MagicMock()
        return db

    @pytest.fixture
    def mock_execution(self):
        execution = MagicMock()
        execution.id = str(uuid.uuid4())
        execution.project_id = str(uuid.uuid4())
        execution.config_json = {}
        return execution

    @pytest.mark.asyncio
    async def test_generate_image_calls_image_service(self, mock_db, mock_execution):
        """Should call the image generation service."""
        from services.node_executor import execute_generate_image_node

        node = {
            "id": "image_1",
            "type": "image_generation",
            "data": {
                "prompt": "A beautiful sunset",
                "model": "openai/dall-e-3",
                "aspect_ratio": "16:9"
            }
        }

        with patch('image_generation_service.generate_and_store_image', new_callable=AsyncMock) as mock_img:
            mock_img.return_value = {
                "file_url": "https://storage.example.com/image.png",
                "thumbnail_url": "https://storage.example.com/thumb.png",
                "generation_metadata": {}
            }
            with patch('services.node_executor.generate_image_title', new_callable=AsyncMock) as mock_title:
                mock_title.return_value = "Beautiful Sunset"

                result = await execute_generate_image_node(node, mock_execution, mock_db)

                mock_img.assert_called_once()
                assert result["file_url"] == "https://storage.example.com/image.png"

    @pytest.mark.asyncio
    async def test_generate_image_creates_document_record(self, mock_db, mock_execution):
        """Should create a document record for the generated image."""
        from services.node_executor import execute_generate_image_node

        node = {
            "id": "image_1",
            "type": "image_generation",
            "data": {
                "prompt": "A beautiful sunset",
                "title": "My Sunset Image"
            }
        }

        with patch('image_generation_service.generate_and_store_image', new_callable=AsyncMock) as mock_img:
            mock_img.return_value = {
                "file_url": "https://storage.example.com/image.png",
                "thumbnail_url": "https://storage.example.com/thumb.png",
                "generation_metadata": {}
            }

            result = await execute_generate_image_node(node, mock_execution, mock_db)

            assert mock_db.add.called
            assert len(result["image_ids"]) > 0
            assert result["title"] == "My Sunset Image"


class TestExecuteConditionalNode:
    """Tests for conditional node execution."""

    @pytest.fixture
    def mock_db(self):
        db = MagicMock()
        db.query = MagicMock()
        return db

    @pytest.fixture
    def mock_execution(self):
        execution = MagicMock()
        execution.project_id = str(uuid.uuid4())
        return execution

    @pytest.mark.asyncio
    async def test_conditional_node_evaluates_condition(self, mock_db, mock_execution):
        """Should evaluate the condition and return branch decision."""
        from services.node_executor import execute_conditional_node

        node = {
            "id": "cond_1",
            "type": "conditional",
            "data": {
                "condition": "documents exist"
            }
        }

        # Mock query to return some documents
        mock_db.query.return_value.filter.return_value.limit.return_value.all.return_value = [MagicMock()]

        result = await execute_conditional_node(node, mock_execution, mock_db)

        assert "branch" in result
        assert result["branch"] in ["true", "false"]
        assert "result" in result

    @pytest.mark.asyncio
    async def test_conditional_node_handles_no_documents_condition(self, mock_db, mock_execution):
        """Should correctly evaluate 'no documents' condition."""
        from services.node_executor import execute_conditional_node

        node = {
            "id": "cond_1",
            "type": "conditional",
            "data": {
                "condition": "no documents"
            }
        }

        # Mock query to return no documents
        mock_db.query.return_value.filter.return_value.limit.return_value.all.return_value = []

        result = await execute_conditional_node(node, mock_execution, mock_db)

        assert result["branch"] == "true"
        assert result["result"] is True


class TestExecuteFinishNode:
    """Tests for finish node execution."""

    @pytest.fixture
    def mock_db(self):
        db = MagicMock()
        db.query = MagicMock()
        db.commit = MagicMock()
        return db

    @pytest.fixture
    def mock_execution(self):
        execution = MagicMock()
        execution.id = str(uuid.uuid4())
        execution.project_id = str(uuid.uuid4())
        execution.user_id = str(uuid.uuid4())
        execution.generated_document_ids = []
        return execution

    @pytest.mark.asyncio
    async def test_finish_node_returns_completed_status(self, mock_db, mock_execution):
        """Should return completed status."""
        from services.node_executor import execute_finish_node

        node = {
            "id": "finish_1",
            "type": "finish",
            "data": {}
        }

        result = await execute_finish_node(node, mock_execution, mock_db)

        assert result["status"] == "completed"

    @pytest.mark.asyncio
    async def test_finish_node_updates_document_status(self, mock_db, mock_execution):
        """Should update document status to 'done' when save_to_project is True."""
        from services.node_executor import execute_finish_node

        doc_id = str(uuid.uuid4())
        mock_execution.generated_document_ids = [doc_id]

        mock_doc = MagicMock()
        mock_doc.id = doc_id
        mock_doc.status = "draft"
        mock_db.query.return_value.filter.return_value.all.return_value = [mock_doc]

        node = {
            "id": "finish_1",
            "type": "finish",
            "data": {
                "saveToProject": True
            }
        }

        result = await execute_finish_node(node, mock_execution, mock_db)

        assert mock_doc.status == "done"
        assert doc_id in result["saved_documents"]


class TestExecuteReviewNode:
    """Tests for review node execution."""

    @pytest.fixture
    def mock_db(self):
        db = MagicMock()
        db.commit = MagicMock()
        return db

    @pytest.fixture
    def mock_execution(self):
        execution = MagicMock()
        execution.id = str(uuid.uuid4())
        execution.status = "running"
        return execution

    @pytest.mark.asyncio
    async def test_review_node_pauses_execution(self, mock_db, mock_execution):
        """Should pause the workflow execution for human review."""
        from services.node_executor import execute_review_node

        node = {
            "id": "review_1",
            "type": "review",
            "data": {}
        }

        result = await execute_review_node(node, mock_execution, mock_db)

        assert mock_execution.status == "paused"
        assert result["status"] == "awaiting_review"


class TestExecuteContextRetrievalNode:
    """Tests for context retrieval node execution."""

    @pytest.fixture
    def mock_db(self):
        return MagicMock()

    @pytest.fixture
    def mock_execution(self):
        execution = MagicMock()
        execution.project_id = str(uuid.uuid4())
        return execution

    @pytest.mark.asyncio
    async def test_context_retrieval_calls_retrieve_function(self, mock_db, mock_execution):
        """Should call the context retrieval function."""
        from services.node_executor import execute_context_retrieval_node

        node = {
            "id": "context_1",
            "type": "context_retrieval",
            "data": {
                "query": "Find relevant information about AI",
                "maxResults": 5,
                "useRag": True
            }
        }

        with patch('services.node_executor.retrieve_workflow_context', new_callable=AsyncMock) as mock_retrieve:
            mock_retrieve.return_value = {
                "documents": [{"id": "1", "content": "AI info"}],
                "count": 1,
                "context": "Relevant AI context"
            }

            result = await execute_context_retrieval_node(node, mock_execution, mock_db)

            mock_retrieve.assert_called_once()
            assert result["count"] == 1
            assert result["context"] == "Relevant AI context"

    @pytest.mark.asyncio
    async def test_context_retrieval_passes_parameters(self, mock_db, mock_execution):
        """Should pass the correct parameters to the retrieval function."""
        from services.node_executor import execute_context_retrieval_node

        node = {
            "id": "context_1",
            "type": "context_retrieval",
            "data": {
                "query": "AI trends",
                "folderIds": ["folder1", "folder2"],
                "maxResults": 10,
                "useRag": False
            }
        }

        with patch('services.node_executor.retrieve_workflow_context', new_callable=AsyncMock) as mock_retrieve:
            mock_retrieve.return_value = {
                "documents": [],
                "count": 0,
                "context": ""
            }

            await execute_context_retrieval_node(node, mock_execution, mock_db)

            call_kwargs = mock_retrieve.call_args.kwargs
            assert call_kwargs["context_params"]["query"] == "AI trends"
            assert call_kwargs["context_params"]["folder_ids"] == ["folder1", "folder2"]
            assert call_kwargs["context_params"]["max_results"] == 10
            assert call_kwargs["context_params"]["use_rag"] is False
