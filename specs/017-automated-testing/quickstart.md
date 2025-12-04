# Quickstart: Automated Testing Suite

**Feature**: 017-automated-testing
**Time to First Test**: ~5 minutes

## Prerequisites

- Python 3.11+ installed
- Node.js 18+ installed
- Docker (for integration tests with PostgreSQL/Redis)

## Backend Setup

### 1. Install Test Dependencies

```bash
cd backend
pip install -r requirements-test.txt
```

### 2. Run All Backend Tests

```bash
# Run all tests with coverage
pytest --cov=. --cov-report=term-missing

# Run only unit tests (fast)
pytest tests/unit -v

# Run only integration tests
pytest tests/integration -v

# Run specific test file
pytest tests/unit/services/test_workflow_executor.py -v
```

### 3. Run Tests with Watch Mode

```bash
# Requires pytest-watch
ptw tests/unit -- -v
```

## Frontend Setup

### 1. Install Test Dependencies

```bash
cd frontend
npm install
```

### 2. Run All Frontend Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- useWorkflowExecution.test.ts
```

## Writing Your First Test

### Backend (pytest)

Create `backend/tests/unit/services/test_example.py`:

```python
import pytest
from services.example_service import process_data

def test_process_data_returns_expected_output():
    # Arrange
    input_data = {"name": "test"}

    # Act
    result = process_data(input_data)

    # Assert
    assert result["processed"] is True
    assert result["name"] == "test"

@pytest.mark.asyncio
async def test_async_function():
    result = await async_operation()
    assert result is not None
```

### Frontend (Vitest)

Create `frontend/src/hooks/__tests__/useExample.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useExample } from '../useExample';

describe('useExample', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useExample());

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should fetch data on mount', async () => {
    const { result } = renderHook(() => useExample());

    await waitFor(() => {
      expect(result.current.data).not.toBeNull();
    });
  });
});
```

## Common Commands

| Command | Description |
|---------|-------------|
| `pytest` | Run all backend tests |
| `pytest -x` | Stop on first failure |
| `pytest -k "test_workflow"` | Run tests matching pattern |
| `pytest --cov-fail-under=80` | Fail if coverage < 80% |
| `npm test` | Run all frontend tests |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run test:coverage` | Generate coverage report |

## CI Integration

Tests run automatically on:
- Every push to `main` branch
- Every pull request targeting `main`

Coverage must be ≥ 80% for PR to be mergeable.

## Troubleshooting

### "Database connection refused"
Start the test database:
```bash
docker-compose -f docker-compose.test.yml up -d postgres
```

### "Module not found" in tests
Ensure you're in the correct directory and have installed dependencies:
```bash
cd backend && pip install -e .
cd frontend && npm install
```

### "Coverage below threshold"
Add tests for uncovered code. Run coverage report to identify gaps:
```bash
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

## Next Steps

1. Read [Backend Testing Guide](../../docs/testing/backend.md) for advanced patterns
2. Read [Frontend Testing Guide](../../docs/testing/frontend.md) for component testing
3. Review existing tests in `tests/` directories for examples
