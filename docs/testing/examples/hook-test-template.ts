/**
 * Hook Test Template for Frontend
 *
 * Copy this template when creating new tests for React hooks.
 * Location: frontend/src/hooks/__tests__/use-<hook-name>.test.tsx
 *
 * Note: Use .tsx extension if the test uses JSX (e.g., wrapper components)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// =============================================================================
// Mock Dependencies (before imports!)
// =============================================================================

vi.mock('@/lib/supabase/service-name', () => ({
  serviceName: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('./use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Import AFTER mocks
import { useMyHook, useMyMutation } from '../use-my-hook';
import { serviceName } from '@/lib/supabase/service-name';

// =============================================================================
// Test Wrapper
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// =============================================================================
// Mock Data
// =============================================================================

const mockItems = [
  {
    id: 'item-1',
    name: 'Test Item 1',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'item-2',
    name: 'Test Item 2',
    created_at: '2024-01-02T00:00:00Z',
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('useMyHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Query Tests
  // ===========================================================================

  describe('fetching data', () => {
    it('should fetch items successfully', async () => {
      (serviceName.list as any).mockResolvedValue({
        data: mockItems,
        error: null,
      });

      const { result } = renderHook(
        () => useMyHook('parent-id'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(serviceName.list).toHaveBeenCalledWith('parent-id');
      expect(result.current.data).toEqual(mockItems);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(
        () => useMyHook(''),
        { wrapper: createWrapper() }
      );

      expect(serviceName.list).not.toHaveBeenCalled();
      expect(result.current.isFetching).toBe(false);
    });

    it('should handle fetch error', async () => {
      (serviceName.list as any).mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      });

      const { result } = renderHook(
        () => useMyHook('parent-id'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // ===========================================================================
  // Mutation Tests
  // ===========================================================================

  describe('mutations', () => {
    it('should create item successfully', async () => {
      const newItem = { name: 'New Item', parent_id: 'parent-id' };

      (serviceName.create as any).mockResolvedValue({
        data: { id: 'item-new', ...newItem },
        error: null,
      });

      const { result } = renderHook(
        () => useMyMutation(),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync(newItem);
      });

      expect(serviceName.create).toHaveBeenCalledWith(newItem);
    });

    it('should handle mutation error', async () => {
      (serviceName.create as any).mockResolvedValue({
        data: null,
        error: new Error('Validation error'),
      });

      const { result } = renderHook(
        () => useMyMutation(),
        { wrapper: createWrapper() }
      );

      await expect(
        act(async () => {
          await result.current.mutateAsync({ name: '' });
        })
      ).rejects.toThrow('Validation error');
    });
  });

  // ===========================================================================
  // Optimistic Update Tests
  // ===========================================================================

  describe('optimistic updates', () => {
    it('should show pending state during mutation', async () => {
      // Create a controlled promise
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (serviceName.create as any).mockImplementation(() => pendingPromise);

      const { result } = renderHook(
        () => useMyMutation(),
        { wrapper: createWrapper() }
      );

      // Trigger mutation
      act(() => {
        result.current.mutate({ name: 'New Item' });
      });

      // Should be pending
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve
      act(() => {
        resolvePromise!({ data: { id: 'new', name: 'New Item' }, error: null });
      });

      // Should complete
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Query Key Tests
  // ===========================================================================

  describe('query keys', () => {
    it('should generate correct query keys', () => {
      // Assuming your hook exports query keys
      // expect(myKeys.all).toEqual(['items']);
      // expect(myKeys.list('parent')).toEqual(['items', 'list', 'parent']);
    });
  });
});
