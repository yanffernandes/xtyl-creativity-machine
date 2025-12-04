# Backend Testing Guide

This guide covers testing patterns and best practices for the Python/FastAPI backend.

## Setup

```bash
cd backend
source venv/bin/activate
pip install -r requirements-test.txt
```

## Running Tests

```bash
# All unit tests
python -m pytest tests/unit -v

# Specific test file
python -m pytest tests/unit/services/test_workflow_executor.py -v

# With coverage
python -m pytest tests/unit --cov=. --cov-report=term-missing

# Run tests matching pattern
python -m pytest -k "test_workflow" -v
```

## Test Fixtures

Common fixtures are defined in `tests/conftest.py`:

### Database Session

```python
@pytest.fixture
def db_session():
    """Provides a test database session with transaction rollback."""
    # Creates in-memory SQLite database
    # Rolls back after each test
```

### Test Client

```python
@pytest.fixture
def test_client(db_session):
    """FastAPI TestClient with database override."""
    return TestClient(app)
```

### Authentication Headers

```python
@pytest.fixture
def auth_headers(test_user):
    """JWT auth headers for authenticated requests."""
    return {"Authorization": f"Bearer {token}"}
```

### Mock Fixtures

```python
@pytest.fixture
def mock_openrouter():
    """Mocks OpenRouter API calls."""

@pytest.fixture
def mock_supabase_auth():
    """Mocks Supabase authentication."""

@pytest.fixture
def mock_r2():
    """Mocks Cloudflare R2 storage."""
```

## Test Factories

Use factories for consistent test data (`tests/factories.py`):

```python
from tests.factories import UserFactory, ProjectFactory, DocumentFactory

def test_document_creation(db_session):
    user = UserFactory.create()
    project = ProjectFactory.create(user=user)
    document = DocumentFactory.create(project=project)

    assert document.project_id == project.id
```

## Writing Unit Tests

### Service Tests

```python
# tests/unit/services/test_workflow_executor.py

import pytest
from unittest.mock import AsyncMock, patch

class TestWorkflowExecutor:
    @pytest.fixture
    def executor(self):
        return WorkflowExecutor()

    @pytest.mark.asyncio
    async def test_execute_start_node(self, executor):
        node = {"id": "start-1", "type": "start", "data": {"topic": "test"}}

        result = await executor.execute_node(node, {})

        assert "input_variables" in result
```

### Mocking External Services

```python
@patch('llm_service.call_openrouter')
async def test_text_generation(mock_call):
    mock_call.return_value = AsyncMock(return_value={
        "content": "Generated text"
    })

    result = await generate_text("prompt")

    mock_call.assert_called_once()
    assert result["content"] == "Generated text"
```

## Writing Integration Tests

Integration tests require the PostgreSQL service container in CI:

```python
# tests/integration/routers/test_documents.py

class TestListProjectDocuments:
    def test_list_documents_requires_auth(self, test_client):
        response = test_client.get("/projects/123/documents")
        assert response.status_code == 401

    def test_list_documents_returns_empty(self, test_client, auth_headers, project):
        response = test_client.get(
            f"/projects/{project.id}/documents",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["documents"] == []
```

## Async Testing

Use `pytest-asyncio` for async tests:

```python
import pytest

@pytest.mark.asyncio
async def test_async_operation():
    result = await some_async_function()
    assert result is not None
```

## Common Patterns

### Testing Error Handling

```python
def test_handles_not_found(test_client, auth_headers):
    response = test_client.get(
        "/documents/nonexistent-id",
        headers=auth_headers
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
```

### Testing with Different User Roles

```python
def test_admin_only_endpoint(test_client, admin_headers, user_headers):
    # Admin can access
    response = test_client.get("/admin/users", headers=admin_headers)
    assert response.status_code == 200

    # Regular user cannot
    response = test_client.get("/admin/users", headers=user_headers)
    assert response.status_code == 403
```

## Troubleshooting

### Tests Hang

- Check for unawaited coroutines
- Ensure mocks return proper async values

### Database Issues

- Integration tests need PostgreSQL (not SQLite) for JSONB support
- Unit tests should mock database operations

### Import Errors

- Ensure `PYTHONPATH=.` is set
- Check virtual environment activation
