# Frontend Testing Guide

This guide covers testing patterns and best practices for the TypeScript/React frontend.

## Setup

```bash
cd frontend
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

## Test Structure

### Test Setup (`src/__tests__/setup.ts`)

Configures the testing environment:
- MSW (Mock Service Worker) for API mocking
- Testing Library cleanup
- Global mocks (localStorage, matchMedia)

### MSW Handlers (`src/__tests__/handlers.ts`)

Default API mock handlers:

```typescript
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/projects', (req, res, ctx) => {
    return res(ctx.json({ projects: [] }));
  }),
];
```

### Test Utils (`src/__tests__/test-utils.tsx`)

Custom render function with providers:

```typescript
import { render } from './test-utils';

// Includes QueryClientProvider, ThemeProvider, etc.
const { result } = renderHook(() => useMyHook(), {
  wrapper: createWrapper(),
});
```

## Writing Hook Tests

### React Query Hooks

```typescript
// src/hooks/__tests__/use-documents.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

describe('useDocuments', () => {
  it('should fetch documents for a project', async () => {
    vi.mocked(documentService.listByProject).mockResolvedValue({
      data: mockDocuments,
      error: null,
    });

    const { result } = renderHook(
      () => useDocuments('project-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockDocuments);
  });
});
```

### Mutation Hooks with Optimistic Updates

```typescript
it('should perform optimistic update', async () => {
  // Create a deferred promise for control
  let resolvePromise: (value: any) => void;
  const pendingPromise = new Promise(resolve => {
    resolvePromise = resolve;
  });

  vi.mocked(service.create).mockImplementation(() => pendingPromise);

  const { result } = renderHook(() => useCreateItem(), {
    wrapper: createWrapper(),
  });

  // Trigger mutation
  act(() => {
    result.current.mutate(newItem);
  });

  // Verify pending state
  await waitFor(() => {
    expect(result.current.isPending).toBe(true);
  });

  // Resolve and verify completion
  act(() => {
    resolvePromise!({ data: { id: 'new', ...newItem }, error: null });
  });

  await waitFor(() => {
    expect(result.current.isPending).toBe(false);
  });
});
```

## Writing Store Tests

### Zustand Store Tests

```typescript
// src/lib/stores/__tests__/workflowStore.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useWorkflowStore } from '../workflowStore';

describe('workflowStore', () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useWorkflowStore.getState().resetWorkflow();
    });
  });

  it('should add a node', () => {
    const node = { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} };

    act(() => {
      useWorkflowStore.getState().addNode(node);
    });

    expect(useWorkflowStore.getState().nodes).toHaveLength(1);
  });
});
```

## Mocking Dependencies

### Mocking Modules

```typescript
// Mock before imports
vi.mock('@/lib/supabase/documents', () => ({
  documentService: {
    listByProject: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import after mocks
import { documentService } from '@/lib/supabase/documents';

// In tests
vi.mocked(documentService.listByProject).mockResolvedValue({
  data: [],
  error: null,
});
```

### Using vi.hoisted for Complex Mocks

```typescript
const mocks = vi.hoisted(() => ({
  mockRefetch: vi.fn(),
  mockGetCache: vi.fn(),
}));

vi.mock('./use-data', () => ({
  useData: () => ({
    data: null,
    refetch: mocks.mockRefetch,
  }),
}));
```

## Testing Async Effects

```typescript
it('should load data on mount', async () => {
  const { result } = renderHook(
    () => useMyHook('id'),
    { wrapper: createWrapper() }
  );

  // Wait for effect to complete
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.data).toBeDefined();
});
```

## Common Patterns

### Testing Query Keys

```typescript
describe('projectKeys', () => {
  it('should generate correct query keys', () => {
    expect(projectKeys.all).toEqual(['projects']);
    expect(projectKeys.list('ws-1')).toEqual(['projects', 'list', 'ws-1']);
    expect(projectKeys.detail('p-1')).toEqual(['projects', 'detail', 'p-1']);
  });
});
```

### Testing Error States

```typescript
it('should handle fetch error', async () => {
  vi.mocked(service.get).mockResolvedValue({
    data: null,
    error: new Error('Network error'),
  });

  const { result } = renderHook(() => useData('id'), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isError).toBe(true));
});
```

### Testing Query Invalidation

```typescript
it('should invalidate list queries after create', async () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(['items', 'list'], existingItems);

  // ... perform mutation

  const queryState = queryClient.getQueryState(['items', 'list']);
  expect(queryState?.isInvalidated).toBe(true);
});
```

## Troubleshooting

### Tests Timing Out

- Increase timeout: `{ timeout: 5000 }`
- Check for unresolved promises
- Verify mock implementations return proper values

### JSX Parsing Errors

- Use `.tsx` extension for files with JSX
- Check tsconfig includes test files

### Mock Not Working

- Ensure mock is defined before imports
- Use `vi.mocked()` for type-safe mocking
- Check mock path matches import path exactly
