"""
Shared pytest fixtures for backend tests.

This module provides:
- Database fixtures with transaction rollback for test isolation
- FastAPI TestClient fixture
- Mock fixtures for external services (OpenRouter, Supabase Auth, R2)
- Authentication fixtures for testing protected endpoints
"""

import os
import sys
from typing import Generator, AsyncGenerator
from unittest.mock import MagicMock, AsyncMock, patch
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base, get_db
from main import app
from models import User, Workspace, WorkspaceUser, Project, Document


# ============================================================================
# Database Fixtures
# ============================================================================

# Use in-memory SQLite for tests (fast, isolated)
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_engine():
    """Create a test database engine with in-memory SQLite."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine) -> Generator[Session, None, None]:
    """
    Create a database session with transaction rollback.

    Each test runs in its own transaction that is rolled back after the test,
    ensuring complete test isolation without slow database recreation.
    """
    connection = db_engine.connect()
    transaction = connection.begin()

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = TestingSessionLocal()

    # Begin a nested transaction (savepoint)
    nested = connection.begin_nested()

    # If the application code calls session.commit(), roll back to savepoint
    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        nonlocal nested
        if transaction.nested and not transaction._parent.nested:
            nested = connection.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def test_client(db_session) -> Generator[TestClient, None, None]:
    """
    Create a FastAPI TestClient with the test database session.

    Overrides the database dependency to use the test session.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


# ============================================================================
# Authentication Fixtures
# ============================================================================

@pytest.fixture
def test_user_id() -> str:
    """Generate a consistent test user ID."""
    return str(uuid.uuid4())


@pytest.fixture
def test_user(db_session, test_user_id) -> User:
    """Create a test user in the database."""
    user = User(
        id=uuid.UUID(test_user_id),
        email="test@example.com",
        full_name="Test User",
        is_super_admin=False,
        is_blocked=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_user(db_session) -> User:
    """Create an admin user in the database."""
    user = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        full_name="Admin User",
        is_super_admin=True,
        is_blocked=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user_id) -> dict:
    """
    Generate authentication headers for testing protected endpoints.

    Uses a mock JWT that will be validated by the mock_supabase_auth fixture.
    """
    return {
        "Authorization": f"Bearer test-jwt-token-{test_user_id}",
        "Content-Type": "application/json",
    }


@pytest.fixture
def admin_auth_headers(admin_user) -> dict:
    """Generate authentication headers for admin user."""
    return {
        "Authorization": f"Bearer test-admin-jwt-token-{admin_user.id}",
        "Content-Type": "application/json",
    }


# ============================================================================
# Mock Fixtures for External Services
# ============================================================================

@pytest.fixture
def mock_supabase_auth(test_user_id, test_user):
    """
    Mock Supabase JWT authentication.

    Patches the JWT verification to return the test user.
    """
    with patch("supabase_auth.get_current_user") as mock:
        mock.return_value = test_user
        yield mock


@pytest.fixture
def mock_supabase_auth_admin(admin_user):
    """Mock Supabase auth returning admin user."""
    with patch("supabase_auth.get_current_user") as mock:
        mock.return_value = admin_user
        yield mock


@pytest.fixture
def mock_openrouter():
    """
    Mock OpenRouter API for LLM calls.

    Returns predefined responses for chat completions.
    """
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(
            message=MagicMock(
                content="This is a mocked LLM response.",
                role="assistant",
            ),
            finish_reason="stop",
        )
    ]
    mock_response.usage = MagicMock(
        prompt_tokens=10,
        completion_tokens=20,
        total_tokens=30,
    )

    with patch("llm_service.get_openrouter_client") as mock_client:
        mock_instance = MagicMock()
        mock_instance.chat.completions.create.return_value = mock_response
        mock_client.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mock_openrouter_stream():
    """Mock OpenRouter API for streaming responses."""
    async def mock_stream():
        chunks = [
            {"choices": [{"delta": {"content": "Hello"}}]},
            {"choices": [{"delta": {"content": " world"}}]},
            {"choices": [{"delta": {"content": "!"}}]},
        ]
        for chunk in chunks:
            yield MagicMock(**chunk)

    with patch("llm_service.get_openrouter_client") as mock_client:
        mock_instance = MagicMock()
        mock_instance.chat.completions.create.return_value = mock_stream()
        mock_client.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mock_cloudflare_r2():
    """
    Mock Cloudflare R2 storage service.

    Simulates file upload/download operations.
    """
    with patch("storage_service.get_r2_client") as mock:
        mock_client = MagicMock()

        # Mock upload response
        mock_client.put_object.return_value = {"ETag": '"mock-etag-12345"'}

        # Mock download response
        mock_body = MagicMock()
        mock_body.read.return_value = b"mock file content"
        mock_client.get_object.return_value = {"Body": mock_body}

        # Mock delete response
        mock_client.delete_object.return_value = {}

        # Mock generate presigned URL
        mock_client.generate_presigned_url.return_value = "https://mock-r2-url.com/file"

        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_image_generation():
    """Mock image generation service."""
    mock_response = {
        "data": [
            {
                "url": "https://mock-image-url.com/generated.png",
                "revised_prompt": "A beautiful landscape",
            }
        ]
    }

    with patch("image_generation_service.generate_image") as mock:
        mock.return_value = mock_response
        yield mock


@pytest.fixture
def mock_rag_service():
    """Mock RAG service for document retrieval."""
    mock_results = [
        {
            "content": "Mocked document content for RAG",
            "metadata": {"source": "test_doc.md"},
            "score": 0.95,
        }
    ]

    with patch("rag_service.search_documents") as mock:
        mock.return_value = mock_results
        yield mock


# ============================================================================
# Test Data Fixtures
# ============================================================================

@pytest.fixture
def test_workspace(db_session, test_user) -> Workspace:
    """Create a test workspace."""
    workspace = Workspace(
        id=str(uuid.uuid4()),
        name="Test Workspace",
        description="A workspace for testing",
    )
    db_session.add(workspace)

    # Add user to workspace
    workspace_user = WorkspaceUser(
        workspace_id=workspace.id,
        user_id=str(test_user.id),
        role="owner",
    )
    db_session.add(workspace_user)
    db_session.commit()
    db_session.refresh(workspace)
    return workspace


@pytest.fixture
def test_project(db_session, test_workspace) -> Project:
    """Create a test project."""
    project = Project(
        id=str(uuid.uuid4()),
        name="Test Project",
        description="A project for testing",
        workspace_id=test_workspace.id,
        settings={},
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


@pytest.fixture
def test_document(db_session, test_project) -> Document:
    """Create a test document."""
    document = Document(
        id=str(uuid.uuid4()),
        title="Test Document",
        content="# Test Content\n\nThis is test content.",
        status="draft",
        project_id=test_project.id,
        media_type="text",
    )
    db_session.add(document)
    db_session.commit()
    db_session.refresh(document)
    return document


# ============================================================================
# Utility Fixtures
# ============================================================================

@pytest.fixture
def mock_env_vars():
    """Set up mock environment variables for testing."""
    env_vars = {
        "DATABASE_URL": "sqlite:///:memory:",
        "SUPABASE_JWT_SECRET": "test-jwt-secret",
        "OPENROUTER_API_KEY": "test-openrouter-key",
        "R2_ACCESS_KEY_ID": "test-r2-access-key",
        "R2_SECRET_ACCESS_KEY": "test-r2-secret-key",
        "R2_BUCKET_NAME": "test-bucket",
        "R2_ENDPOINT_URL": "https://test-r2-endpoint.com",
    }

    with patch.dict(os.environ, env_vars):
        yield env_vars


@pytest.fixture
def sample_workflow_definition():
    """Sample workflow definition for testing."""
    return {
        "nodes": [
            {
                "id": "start_1",
                "type": "start",
                "data": {"input_variables": ["topic"]},
            },
            {
                "id": "text_gen_1",
                "type": "text_generation",
                "data": {
                    "prompt": "Write about {{start_1.topic}}",
                    "model": "anthropic/claude-sonnet-4-20250514",
                },
            },
            {
                "id": "finish_1",
                "type": "finish",
                "data": {},
            },
        ],
        "edges": [
            {"source": "start_1", "target": "text_gen_1"},
            {"source": "text_gen_1", "target": "finish_1"},
        ],
    }
