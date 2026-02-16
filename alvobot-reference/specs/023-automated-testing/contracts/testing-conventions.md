# Testing Conventions Contract

**Feature**: 023-automated-testing
**Date**: 2026-01-10

## Purpose

Este documento define as convenções e contratos que todos os testes devem seguir para manter consistência no projeto.

---

## 1. File Naming Conventions

| Test Type | Location | Pattern | Example |
|-----------|----------|---------|---------|
| Frontend Unit | `src/**/__tests__/` or co-located | `*.test.tsx` | `Button.test.tsx` |
| Frontend Hook | `src/**/__tests__/` | `*.test.ts` | `useAuth.test.ts` |
| Backend Unit | `src/modules/*/` | `*.spec.ts` | `auth.service.spec.ts` |
| Backend Integration | `test/modules/` | `*.e2e-spec.ts` | `auth.e2e-spec.ts` |
| E2E | `e2e/tests/*/` | `*.spec.ts` | `login.spec.ts` |
| RLS | `supabase/tests/rls/` | `*.test.sql` | `projects.test.sql` |

---

## 2. Test Structure Contract

### describe/it Pattern

```typescript
describe('ModuleName', () => {
  describe('methodName', () => {
    describe('when condition', () => {
      it('should expected behavior', () => {
        // Arrange
        // Act
        // Assert
      })
    })
  })
})
```

### Naming Convention for `it` blocks

```typescript
// GOOD - describes behavior
it('should return user when token is valid')
it('should throw UnauthorizedError when token is expired')
it('should render loading spinner while fetching')

// BAD - describes implementation
it('calls the API')
it('sets state')
it('uses useEffect')
```

---

## 3. Test Data Contract

### Email Format
```
test-{timestamp}@test.alvobot.com
```

### UUID Format
```
Use crypto.randomUUID() or faker.string.uuid()
```

### Test User Credentials
```typescript
{
  email: `test-${Date.now()}@test.alvobot.com`,
  password: 'TestPassword123!'
}
```

---

## 4. Mock Contract

### Supabase Client Mock Interface

```typescript
interface SupabaseMock {
  auth: {
    getSession(): Promise<{ data: { session: Session | null }; error: null }>
    getUser(): Promise<{ data: { user: User | null }; error: null }>
    signInWithPassword(credentials: Credentials): Promise<AuthResponse>
    signUp(credentials: Credentials): Promise<AuthResponse>
    signOut(): Promise<{ error: null }>
    onAuthStateChange(callback: AuthChangeCallback): { data: { subscription: Subscription } }
  }
  from(table: string): PostgrestQueryBuilder
  storage: {
    from(bucket: string): StorageFileApi
  }
}
```

### MSW Handler Contract

```typescript
// All handlers must return proper HTTP responses
http.get('/path', () => {
  return HttpResponse.json(data, { status: 200 })
})

// Error responses must include error object
http.get('/path', () => {
  return HttpResponse.json(
    { error: 'Error message', code: 'ERROR_CODE' },
    { status: 400 }
  )
})
```

### nock Mock Contract

```typescript
// Must include .persist() for reuse or cleanup after each test
nock('https://api.example.com')
  .post('/endpoint')
  .reply(200, { data: 'response' })
  .persist()

// Cleanup
afterEach(() => {
  nock.cleanAll()
})
```

---

## 5. Fixture Contract

### Auth Fixture Interface

```typescript
interface AuthFixture {
  // Created user for this test run
  testUser: {
    id: string
    email: string
    password: string
  }

  // Authenticated page with session
  authenticatedPage: Page

  // Cleanup function (called automatically)
  cleanup(): Promise<void>
}
```

### Database Fixture Interface

```typescript
interface DatabaseFixture {
  // Seed data
  user: TestUser
  workspace: TestWorkspace
  projects: TestProject[]

  // Methods
  seed(): Promise<void>
  cleanup(): Promise<void>
  reset(): Promise<void>
}
```

---

## 6. Page Object Contract

### Required Structure

```typescript
class ExamplePage {
  readonly page: Page

  // Locators (readonly, defined in constructor)
  readonly submitButton: Locator
  readonly inputField: Locator

  constructor(page: Page) {
    this.page = page
    this.submitButton = page.getByRole('button', { name: /submit/i })
    this.inputField = page.getByLabel(/input/i)
  }

  // Navigation
  async goto(): Promise<void>

  // Actions (return void or Promise<void>)
  async fillForm(data: FormData): Promise<void>
  async submit(): Promise<void>

  // Assertions (return boolean or void)
  async isLoaded(): Promise<boolean>
}
```

---

## 7. Coverage Contract

### Thresholds

```json
{
  "statements": 70,
  "branches": 70,
  "functions": 70,
  "lines": 70
}
```

### Excluded Files

```typescript
const coverageExcludes = [
  'node_modules/',
  'src/test/',
  '**/*.d.ts',
  '**/index.ts',
  '**/*.stories.tsx',
  '**/types/',
]
```

---

## 8. CI Contract

### Required Status Checks

| Check | Must Pass | Blocking |
|-------|-----------|----------|
| frontend-tests | Yes | Yes |
| backend-unit-tests | Yes | Yes |
| backend-integration | Yes | Yes |
| e2e-tests | Yes | Yes |
| coverage-threshold | Yes | Yes |

### Timeout Limits

| Job | Max Duration |
|-----|--------------|
| frontend-tests | 5 min |
| backend-unit-tests | 5 min |
| backend-integration | 5 min |
| e2e-tests | 10 min |
| Total Pipeline | 15 min |

---

## 9. RLS Test Contract

### Test Structure

```sql
-- Test file header
-- File: supabase/tests/rls/{table}.test.sql
-- Description: RLS tests for {table} table
-- Date: YYYY-MM-DD

-- Each test in transaction block
BEGIN;
  -- Setup context
  SELECT set_test_user('user-uuid');

  -- Test case description as comment
  -- Test: User can only see own {entity}

  -- Assertion (should return expected count)
  SELECT count(*) = expected_count AS passed
  FROM {table}
  WHERE condition;

ROLLBACK;
```

### Required Test Cases per Table

1. User can SELECT own data
2. User cannot SELECT other user's data
3. User can INSERT own data
4. User cannot INSERT data for other users
5. User can UPDATE own data
6. User cannot UPDATE other user's data
7. User can DELETE own data
8. User cannot DELETE other user's data
9. Admin can access all data (if applicable)

---

## 10. Error Handling Contract

### Test Failures Must Include

```typescript
// Good error message
expect(result).toEqual(expected)
// AssertionError: expected { id: '1' } to equal { id: '2' }

// Better - with custom message
expect(result, 'Project should have correct ID').toEqual(expected)
```

### Async Error Handling

```typescript
// Always use expect().rejects for async errors
await expect(asyncFunction()).rejects.toThrow('Expected error')

// Never use try/catch in tests unless testing the catch block specifically
```

---

## Enforcement

- All PRs must pass lint checks for test files
- Code review must verify adherence to these conventions
- CI will fail if conventions are violated (where automatable)
