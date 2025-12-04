# Test Coverage Guide

This document explains how to generate and review test coverage reports.

## Coverage Goals

- **Target**: 80% code coverage for both backend and frontend
- **Priority Areas**:
  - Authentication and authorization
  - Workflow execution
  - Document management
  - API endpoints

## Generating Coverage Reports

### Backend (Python/pytest)

```bash
cd backend
source venv/bin/activate

# Generate coverage report
python -m pytest tests/unit --cov=. --cov-report=html --cov-report=term-missing

# With failure threshold
python -m pytest tests/unit --cov=. --cov-fail-under=80
```

Coverage report is generated in `backend/htmlcov/index.html`.

### Frontend (TypeScript/Vitest)

```bash
cd frontend

# Generate coverage report
npm run test:coverage
```

Coverage report is generated in `frontend/coverage/index.html`.

## Viewing Reports

### HTML Reports

After generating coverage, open the HTML report in a browser:

```bash
# Backend
open backend/htmlcov/index.html

# Frontend
open frontend/coverage/index.html
```

### Terminal Output

Both tools show a summary in the terminal:

```
Name                      Stmts   Miss  Cover
----------------------------------------------
services/workflow.py        120     12    90%
services/documents.py        85     25    71%
...
----------------------------------------------
TOTAL                       850    150    82%
```

## Understanding Coverage Metrics

- **Statements**: Lines of code executed
- **Branches**: Conditional paths (if/else) taken
- **Functions**: Functions/methods called
- **Lines**: Unique lines executed (similar to statements)

## Coverage in CI

Coverage is automatically collected in GitHub Actions:

1. Backend coverage is uploaded as `backend-coverage` artifact
2. Frontend coverage is uploaded as `frontend-coverage` artifact

Download artifacts from the Actions run to review detailed reports.

## Excluding Code from Coverage

### Backend

```python
# pragma: no cover - exclude single line
if debug_mode:  # pragma: no cover
    print("debug")

# pragma: no cover - exclude block
if TYPE_CHECKING:  # pragma: no cover
    from typing import ...
```

### Frontend

Coverage exclusions are configured in `vitest.config.ts`:

```typescript
coverage: {
  exclude: [
    'src/**/*.test.{ts,tsx}',
    'src/__tests__/**',
    'src/**/*.d.ts',
    'src/types/**',
  ],
}
```

## Improving Coverage

### Finding Gaps

1. Review HTML report for red (uncovered) lines
2. Focus on business logic, not boilerplate
3. Prioritize critical paths

### Adding Tests

1. Write tests for uncovered functions
2. Add edge case tests for partial coverage
3. Test error handling paths

### Realistic Expectations

Not all code needs 100% coverage:

- **High priority**: Business logic, security, API contracts
- **Lower priority**: UI styling, generated code, types
- **Often excluded**: Development utilities, debug code

## Coverage Thresholds

Current thresholds are set at 60% with a goal of 80%:

### Backend (`pytest.ini`)

```ini
# Run with: pytest --cov-fail-under=80
```

### Frontend (`vitest.config.ts`)

```typescript
thresholds: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

## Troubleshooting

### Coverage Not Increasing

- Check that test actually runs (not skipped)
- Verify mock doesn't bypass real code
- Check for conditional imports

### Missing Files in Report

- Ensure files are in `include` pattern
- Check files aren't in `exclude` pattern
- Verify imports in tests

### Slow Coverage Generation

- Coverage adds ~20-30% overhead
- Use focused test runs for development
- Run full coverage before PR
