# Data Model: Automated Testing Suite

**Feature**: 017-automated-testing
**Date**: 2025-12-02

## Overview

This feature primarily creates **test infrastructure** rather than new data entities. The entities below represent the conceptual structure of the testing system.

## Test Entities

### TestSuite

Represents a collection of tests organized by domain.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Suite identifier (e.g., "backend-unit", "frontend-hooks") |
| type | enum | "unit" | "integration" | "contract" |
| framework | string | "pytest" | "vitest" |
| path | string | Relative path to test directory |
| timeout | number | Maximum execution time in seconds |

### TestFixture

Reusable setup/teardown utility for common test scenarios.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Fixture identifier (e.g., "db_session", "auth_user") |
| scope | enum | "function" | "class" | "module" | "session" |
| dependencies | string[] | Other fixtures this depends on |
| cleanup | boolean | Whether teardown is required |

### MockService

Simulated external service for isolated testing.

| Field | Type | Description |
|-------|------|-------------|
| service | string | Service being mocked (e.g., "openrouter", "supabase") |
| responses | object | Predefined response payloads |
| handlers | string[] | MSW handler definitions (frontend) |
| patches | string[] | pytest mock patch targets (backend) |

### CoverageReport

Generated artifact showing code coverage metrics.

| Field | Type | Description |
|-------|------|-------------|
| timestamp | datetime | When report was generated |
| total_lines | number | Total lines of code |
| covered_lines | number | Lines covered by tests |
| coverage_percent | number | Percentage (covered/total * 100) |
| uncovered_files | string[] | Files below threshold |
| branch_coverage | number | Branch coverage percentage |

### CIConfiguration

Workflow definition for automated testing.

| Field | Type | Description |
|-------|------|-------------|
| workflow_file | string | Path to GitHub Actions YAML |
| triggers | string[] | Events that trigger tests (push, PR) |
| jobs | object[] | Job definitions (backend, frontend) |
| coverage_threshold | number | Minimum coverage to pass (80%) |
| fail_fast | boolean | Stop on first failure |

## Relationships

```
TestSuite
├── has_many: TestFixture (via imports)
├── has_many: MockService (via setup)
└── generates: CoverageReport

CIConfiguration
├── orchestrates: TestSuite[]
└── enforces: coverage_threshold on CoverageReport
```

## State Transitions

### Test Execution States

```
PENDING → RUNNING → PASSED
                  → FAILED
                  → SKIPPED
                  → ERROR (infrastructure failure)
```

### CI Pipeline States

```
QUEUED → IN_PROGRESS → SUCCESS (all tests pass, coverage met)
                     → FAILURE (tests failed or coverage below threshold)
                     → CANCELLED (manual abort)
```

## Validation Rules

1. **Coverage Threshold**: `coverage_percent >= 80` required for CI success
2. **Test Timeout**: Individual test must complete within `timeout` seconds
3. **No External Dependencies**: Unit tests must not make real network calls
4. **Deterministic Results**: Same inputs must produce same outputs (no random without seed)
5. **Isolation**: Tests must not depend on execution order or shared state
