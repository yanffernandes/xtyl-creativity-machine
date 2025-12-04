/**
 * Unit tests for use-sidebar-cache hook.
 *
 * Tests sidebar caching, background refresh, and stale-while-revalidate pattern.
 *
 * Note: The useSidebarCache hook has complex async effects with multiple dependencies
 * (hasMounted state, workspaceId changes, refetch callbacks). Some tests focus on
 * verifying the hook's synchronous interface and initial state rather than the full
 * async refresh cycle.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Use vi.hoisted to create mock functions that are properly hoisted
const mocks = vi.hoisted(() => ({
  mockRefetchWorkspace: vi.fn(),
  mockRefetchProjects: vi.fn(),
  mockGetSidebarCache: vi.fn(),
  mockSetSidebarCache: vi.fn(),
  mockClearSidebarCache: vi.fn(),
  mockListForSidebar: vi.fn(),
  mockApiGet: vi.fn(),
}));

// Mock dependencies before imports
vi.mock('@/lib/sidebar-cache', () => ({
  getSidebarCache: mocks.mockGetSidebarCache,
  setSidebarCache: mocks.mockSetSidebarCache,
  clearSidebarCache: mocks.mockClearSidebarCache,
}));

vi.mock('./use-projects', () => ({
  useProjects: () => ({
    data: null,
    refetch: mocks.mockRefetchProjects,
  }),
}));

vi.mock('./use-workspaces', () => ({
  useWorkspace: () => ({
    data: null,
    refetch: mocks.mockRefetchWorkspace,
  }),
}));

vi.mock('@/lib/supabase/documents', () => ({
  documentService: {
    listForSidebar: mocks.mockListForSidebar,
  },
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: mocks.mockApiGet,
  },
}));

// Import after mocks
import { useSidebarCache } from '../use-sidebar-cache';

// Test wrapper with QueryClient
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

// Mock data
const mockCachedData = {
  workspaceId: 'workspace-1',
  workspace: {
    id: 'workspace-1',
    name: 'Cached Workspace',
    description: null,
  },
  projects: [
    {
      id: 'project-1',
      name: 'Cached Project',
      description: null,
      documents: [],
      visualAssets: [],
    },
  ],
  timestamp: Date.now(),
};

describe('use-sidebar-cache hook', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Set default mock implementations
    mocks.mockGetSidebarCache.mockReturnValue(null);
    mocks.mockSetSidebarCache.mockImplementation(() => {});
    mocks.mockClearSidebarCache.mockImplementation(() => {});
    mocks.mockRefetchWorkspace.mockResolvedValue({ data: null });
    mocks.mockRefetchProjects.mockResolvedValue({ data: [] });
    mocks.mockListForSidebar.mockResolvedValue({ data: [], error: null });
    mocks.mockApiGet.mockResolvedValue({ data: { assets: [] } });
  });

  describe('Initial State', () => {
    it('should return empty state initially when no cache exists', () => {
      mocks.mockGetSidebarCache.mockReturnValue(null);

      const { result } = renderHook(
        () => useSidebarCache('workspace-1'),
        { wrapper: createWrapper() }
      );

      expect(result.current.workspace).toBeNull();
      expect(result.current.projects).toEqual([]);
      expect(result.current.isInitialLoad).toBe(true);
    });

    it('should expose control functions', () => {
      const { result } = renderHook(
        () => useSidebarCache('workspace-1'),
        { wrapper: createWrapper() }
      );

      expect(typeof result.current.refresh).toBe('function');
      expect(typeof result.current.invalidate).toBe('function');
    });

    it('should expose isRefreshing state', () => {
      const { result } = renderHook(
        () => useSidebarCache('workspace-1'),
        { wrapper: createWrapper() }
      );

      expect(typeof result.current.isRefreshing).toBe('boolean');
    });
  });

  describe('Cache Loading', () => {
    it('should load from localStorage cache on mount', async () => {
      mocks.mockGetSidebarCache.mockReturnValue(mockCachedData);

      const { result } = renderHook(
        () => useSidebarCache('workspace-1'),
        { wrapper: createWrapper() }
      );

      // Wait for state to update after mount effect
      await waitFor(() => {
        expect(result.current.workspace).not.toBeNull();
      });

      expect(mocks.mockGetSidebarCache).toHaveBeenCalledWith('workspace-1');
      expect(result.current.workspace?.name).toBe('Cached Workspace');
      expect(result.current.isInitialLoad).toBe(false);
    });

    it('should return cached projects with documents and assets', async () => {
      const cachedWithDocs = {
        ...mockCachedData,
        projects: [
          {
            id: 'project-1',
            name: 'Project 1',
            description: null,
            documents: [
              { id: 'doc-1', title: 'Document 1', status: 'draft', media_type: 'text' },
            ],
            visualAssets: [
              { id: 'asset-1', title: 'Asset 1', asset_type: 'Logo' },
            ],
          },
        ],
      };
      mocks.mockGetSidebarCache.mockReturnValue(cachedWithDocs);

      const { result } = renderHook(
        () => useSidebarCache('workspace-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.projects.length).toBe(1);
      });

      expect(result.current.projects[0].documents.length).toBe(1);
      expect(result.current.projects[0].visualAssets.length).toBe(1);
    });

    it('should set isInitialLoad to true when no cache', () => {
      mocks.mockGetSidebarCache.mockReturnValue(null);

      const { result } = renderHook(
        () => useSidebarCache('workspace-1'),
        { wrapper: createWrapper() }
      );

      // Initial state before mount effect
      expect(result.current.isInitialLoad).toBe(true);
    });
  });

  describe('Invalidate', () => {
    it('should call clearSidebarCache with workspaceId', async () => {
      mocks.mockGetSidebarCache.mockReturnValue(mockCachedData);

      const { result } = renderHook(
        () => useSidebarCache('workspace-1'),
        { wrapper: createWrapper() }
      );

      // Wait for initial state to be set
      await waitFor(() => {
        expect(result.current.workspace).not.toBeNull();
      });

      // Clear previous calls
      mocks.mockClearSidebarCache.mockClear();

      // Trigger invalidate
      act(() => {
        result.current.invalidate();
      });

      expect(mocks.mockClearSidebarCache).toHaveBeenCalledWith('workspace-1');
    });
  });

  describe('Workspace Change', () => {
    it('should load new cache when workspace changes', async () => {
      mocks.mockGetSidebarCache.mockReturnValue(mockCachedData);

      const { result, rerender } = renderHook(
        ({ workspaceId }) => useSidebarCache(workspaceId),
        {
          wrapper: createWrapper(),
          initialProps: { workspaceId: 'workspace-1' },
        }
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.workspace?.id).toBe('workspace-1');
      });

      // Change to new workspace
      const newCachedData = {
        ...mockCachedData,
        workspaceId: 'workspace-2',
        workspace: { id: 'workspace-2', name: 'New Workspace', description: null },
      };
      mocks.mockGetSidebarCache.mockReturnValue(newCachedData);

      rerender({ workspaceId: 'workspace-2' });

      await waitFor(() => {
        expect(mocks.mockGetSidebarCache).toHaveBeenCalledWith('workspace-2');
      });
    });
  });

  describe('SSR Safety', () => {
    it('should handle missing workspaceId', () => {
      const { result } = renderHook(
        () => useSidebarCache(''),
        { wrapper: createWrapper() }
      );

      expect(result.current.workspace).toBeNull();
      expect(result.current.projects).toEqual([]);
    });

    it('should not crash when workspaceId is undefined-like', () => {
      const { result } = renderHook(
        () => useSidebarCache(''),
        { wrapper: createWrapper() }
      );

      expect(result.current.workspace).toBeNull();
      expect(result.current.projects).toEqual([]);
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('Return Value Structure', () => {
    it('should return the correct shape', () => {
      const { result } = renderHook(
        () => useSidebarCache('workspace-1'),
        { wrapper: createWrapper() }
      );

      // Verify the return value structure
      expect(result.current).toHaveProperty('workspace');
      expect(result.current).toHaveProperty('projects');
      expect(result.current).toHaveProperty('isRefreshing');
      expect(result.current).toHaveProperty('isInitialLoad');
      expect(result.current).toHaveProperty('refresh');
      expect(result.current).toHaveProperty('invalidate');
    });

    it('should return stable function references', () => {
      const { result, rerender } = renderHook(
        () => useSidebarCache('workspace-1'),
        { wrapper: createWrapper() }
      );

      const initialRefresh = result.current.refresh;
      const initialInvalidate = result.current.invalidate;

      rerender();

      // Functions should remain stable across renders (memoized with useCallback)
      expect(result.current.refresh).toBe(initialRefresh);
      expect(result.current.invalidate).toBe(initialInvalidate);
    });
  });
});
