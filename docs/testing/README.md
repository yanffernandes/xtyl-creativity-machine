# Testing Guide

This guide covers the testing infrastructure for the XTYL Creativity Machine project.

## Quick Start

### Running Tests

```bash
# Backend tests
cd backend
source venv/bin/activate
python -m pytest tests/unit -v

# Frontend tests
cd frontend
npm test

# Frontend with coverage
npm run test:coverage

# Frontend watch mode
npm run test:watch
```

## Test Structure

### Backend (`backend/tests/`)

```
tests/
├── conftest.py           # Shared fixtures (db_session, auth, mocks)
├── factories.py          # Test data factories
├── unit/                 # Unit tests (no external dependencies)
│   ├── services/         # Service layer tests
│   └── test_*.py         # Model/schema tests
└── integration/          # Integration tests (require database)
    └── routers/          # API endpoint tests
```

### Frontend (`frontend/src/__tests__/`)

```
src/
├── __tests__/
│   ├── setup.ts          # Vitest setup (MSW, etc.)
│   ├── handlers.ts       # MSW request handlers
│   └── test-utils.tsx    # Custom render with providers
├── hooks/__tests__/      # Hook tests
├── lib/__tests__/        # Utility tests
└── lib/stores/__tests__/ # Zustand store tests
```

## Testing Philosophy

1. **Unit tests first**: Test business logic in isolation
2. **Mock external dependencies**: API calls, databases, third-party services
3. **Test behavior, not implementation**: Focus on what the code does
4. **Maintainable tests**: Clear names, minimal setup, single assertion focus

## Coverage Goals

- **Target**: 80% code coverage
- **Priority**: Critical paths (auth, workflows, documents)
- **Exclude**: Generated code, type definitions

## CI/CD Integration

Tests run automatically on:
- Pull requests to `main`
- Pushes to `main`

See [ci-setup.md](./ci-setup.md) for branch protection configuration.

## Related Documentation

- [Backend Testing Guide](./backend.md)
- [Frontend Testing Guide](./frontend.md)
- [CI/CD Setup](./ci-setup.md)
- [Coverage Reports](./coverage.md)
