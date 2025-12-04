# Research: Automated Testing Suite

**Feature**: 017-automated-testing
**Date**: 2025-12-02
**Purpose**: Document technology decisions and best practices for the testing infrastructure

## Backend Testing (Python/FastAPI)

### Decision: pytest as Test Framework

**Rationale**: pytest is the de facto standard for Python testing, especially for FastAPI applications. It offers superior fixture management, plugin ecosystem, and native async support.

**Alternatives Considered**:
- **unittest**: Built-in but verbose, lacks fixture flexibility
- **nose2**: Declining community support, fewer plugins

### Decision: pytest-asyncio for Async Tests

**Rationale**: FastAPI uses async handlers extensively. pytest-asyncio provides native coroutine support with `@pytest.mark.asyncio` decorator.

**Configuration**:
```ini
[tool:pytest]
asyncio_mode = auto
```

### Decision: httpx for API Testing

**Rationale**: httpx provides an async-compatible HTTP client that integrates seamlessly with FastAPI's TestClient pattern. Supports both sync and async testing.

**Alternatives Considered**:
- **requests**: Sync-only, incompatible with async endpoints
- **aiohttp**: More complex setup, httpx is simpler

### Decision: Transaction Rollback for Database Isolation

**Rationale**: Each test runs in a transaction that rolls back after completion, ensuring test isolation without slow database recreation.

**Pattern**:
```python
@pytest.fixture
async def db_session():
    async with engine.begin() as conn:
        async with AsyncSession(conn) as session:
            yield session
            await conn.rollback()
```

**Alternatives Considered**:
- **Recreate database per test**: Too slow for large test suites
- **Docker containers per test**: Overkill for unit/integration tests

### Decision: Factory Pattern for Test Data

**Rationale**: Factories (using factory_boy or custom) provide flexible, readable test data creation without database fixtures.

**Pattern**:
```python
class UserFactory:
    @staticmethod
    def create(**overrides) -> User:
        defaults = {"email": "test@example.com", "name": "Test User"}
        return User(**{**defaults, **overrides})
```

### Decision: Mock External Services

**Rationale**: Unit tests must be fast and deterministic. External services (OpenRouter, Supabase Auth, R2) are mocked to avoid network dependencies and rate limits.

**Pattern**:
```python
@pytest.fixture
def mock_openrouter(mocker):
    return mocker.patch("backend.llm_service.openrouter_client")
```

## Frontend Testing (TypeScript/React)

### Decision: Vitest as Test Framework

**Rationale**: Vitest is purpose-built for Vite/modern ESM projects, offers Jest-compatible API, native TypeScript support, and significantly faster execution than Jest.

**Alternatives Considered**:
- **Jest**: Slower, requires more configuration for ESM/TypeScript
- **Testing Library only**: Not a test runner

### Decision: React Testing Library for Component Tests

**Rationale**: Promotes testing components as users interact with them (queries by role, text, accessibility). Discourages testing implementation details.

**Pattern**:
```typescript
render(<Button onClick={mockFn}>Click me</Button>);
await userEvent.click(screen.getByRole('button'));
expect(mockFn).toHaveBeenCalled();
```

### Decision: MSW (Mock Service Worker) for API Mocking

**Rationale**: MSW intercepts requests at the network level, enabling realistic API mocking without modifying application code. Works in both tests and browser.

**Alternatives Considered**:
- **jest.mock()**: Tightly couples tests to implementation
- **nock**: Node-only, doesn't work in browser tests

**Pattern**:
```typescript
const handlers = [
  http.get('/api/workflows', () => {
    return HttpResponse.json([{ id: '1', name: 'Test' }]);
  }),
];

const server = setupServer(...handlers);
```

### Decision: Colocated Tests

**Rationale**: Tests adjacent to source files (`__tests__/` folders or `.test.ts` suffix) improve discoverability and make it clear which code is tested.

**Structure**:
```
hooks/
├── useWorkflowExecution.ts
└── __tests__/
    └── useWorkflowExecution.test.ts
```

### Decision: Testing Hooks with renderHook

**Rationale**: React Testing Library's `renderHook` utility enables testing hooks in isolation with proper React lifecycle handling.

**Pattern**:
```typescript
const { result } = renderHook(() => useWorkflowExecution(id), {
  wrapper: ({ children }) => <QueryClientProvider>{children}</QueryClientProvider>,
});
```

## CI/CD (GitHub Actions)

### Decision: Matrix Strategy for Parallel Execution

**Rationale**: Run frontend and backend tests in parallel to minimize CI time. Separate jobs allow independent failure diagnosis.

**Pattern**:
```yaml
jobs:
  test-backend:
    runs-on: ubuntu-latest
  test-frontend:
    runs-on: ubuntu-latest
```

### Decision: Coverage Thresholds in CI

**Rationale**: Enforce 80% coverage minimum to maintain code quality. CI fails if coverage drops below threshold on PRs.

**Tools**:
- Backend: pytest-cov with `--cov-fail-under=80`
- Frontend: Vitest with `coverage.thresholds.global`

### Decision: Caching Dependencies

**Rationale**: Cache pip and npm dependencies to reduce CI time by 30-60%.

**Pattern**:
```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-${{ hashFiles('requirements*.txt') }}
```

## Test Categories

### Unit Tests
- **Scope**: Single function/class in isolation
- **Speed**: < 1ms each
- **Dependencies**: All mocked
- **Coverage Target**: 80% of service functions

### Integration Tests
- **Scope**: Multiple components working together
- **Speed**: < 100ms each
- **Dependencies**: Real database, mocked external APIs
- **Coverage Target**: All API endpoints, critical user paths

### Contract Tests
- **Scope**: API request/response shape validation
- **Speed**: < 10ms each
- **Purpose**: Ensure frontend/backend agreement

## Best Practices Applied

1. **AAA Pattern**: Arrange-Act-Assert structure for all tests
2. **Single Assertion**: One logical assertion per test where possible
3. **Descriptive Names**: Test names describe behavior: `test_should_return_404_when_workflow_not_found`
4. **No Test Interdependence**: Each test runs independently
5. **Fast Feedback**: Unit tests < 1s, full suite < 5min
6. **Deterministic**: No flaky tests, no random data without seeds
7. **Readable**: Tests serve as documentation
