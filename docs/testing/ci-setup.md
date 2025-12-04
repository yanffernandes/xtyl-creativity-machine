# CI/CD Testing Setup Guide

This document explains how to configure GitHub branch protection rules to enforce testing requirements.

## GitHub Actions Workflow

The test suite runs automatically via GitHub Actions (`.github/workflows/test.yml`) on:
- Every push to `main`
- Every pull request targeting `main`

## Test Jobs

### Backend Tests
- Runs Python unit tests with pytest
- Uses PostgreSQL service container for integration tests
- Caches pip dependencies for faster builds
- Generates coverage reports

### Frontend Tests
- Runs TypeScript/React tests with Vitest
- Caches npm dependencies
- Generates coverage reports

## Branch Protection Rules

To enforce tests on pull requests, configure branch protection for `main`:

1. Go to **Settings > Branches** in your GitHub repository
2. Click **Add rule** (or edit existing rule for `main`)
3. Configure the following:

### Required Settings

- **Branch name pattern**: `main`
- **Require a pull request before merging**: ✅
  - Require approvals: 1 (optional)
- **Require status checks to pass before merging**: ✅
  - **Required status checks**:
    - `Test Summary`
    - `Backend Tests`
    - `Frontend Tests`
- **Require branches to be up to date before merging**: ✅ (recommended)

### Optional Settings

- **Require conversation resolution before merging**: ✅
- **Do not allow bypassing the above settings**: ✅ (for strict enforcement)

## Local Testing

Before pushing, run tests locally:

```bash
# Backend
cd backend
source venv/bin/activate
python -m pytest tests/unit -v

# Frontend
cd frontend
npm test
```

## Troubleshooting

### Tests Pass Locally But Fail in CI

1. **Environment differences**: CI uses Ubuntu, local may be macOS/Windows
2. **Missing environment variables**: Check if tests need `.env` values
3. **Database connection**: Integration tests need PostgreSQL service

### Slow CI Builds

- Dependency caching is enabled for both pip and npm
- First build after cache invalidation will be slower
- Cache keys are based on lock file hashes

## Coverage Thresholds

The workflow includes coverage reporting but doesn't enforce thresholds by default.
To enable strict coverage enforcement:

1. Edit `.github/workflows/test.yml`
2. Remove `continue-on-error: true` from coverage steps
3. Adjust `--cov-fail-under` values as needed

Current targets:
- Backend: 60% (aiming for 80%)
- Frontend: 60% (aiming for 80%)
