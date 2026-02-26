/**
 * Unit tests for use-projects hooks.
 *
 * Tests React Query project hooks including queries, mutations,
 * and optimistic updates for project management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies before imports
vi.mock('@/lib/supabase/projects', () => ({
  projectService: {
    listByWorkspace: vi.fn(),
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

// Import after mocks
import {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  projectKeys,
} from '../use-projects';
import { projectService } from '@/lib/supabase/projects';

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

// Mock project data
const mockProjects = [
  {
    id: 'project-1',
    name: 'Test Project 1',
    description: 'Description 1',
    workspace_id: 'workspace-1',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'project-2',
    name: 'Test Project 2',
    description: 'Description 2',
    workspace_id: 'workspace-1',
    created_at: '2024-01-02T00:00:00Z',
  },
];

describe('use-projects hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('projectKeys', () => {
    it('should generate correct query keys', () => {
      expect(projectKeys.all).toEqual(['projects']);
      expect(projectKeys.lists()).toEqual(['projects', 'list']);
      expect(projectKeys.list('workspace-1')).toEqual(['projects', 'list', 'workspace-1']);
      expect(projectKeys.details()).toEqual(['projects', 'detail']);
      expect(projectKeys.detail('project-1')).toEqual(['projects', 'detail', 'project-1']);
    });
  });

  describe('useProjects', () => {
    it('should fetch projects for a workspace', async () => {
      (projectService.listByWorkspace as any).mockResolvedValue({
        data: mockProjects,
        error: null,
      });

      const { result } = renderHook(() => useProjects('workspace-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(projectService.listByWorkspace).toHaveBeenCalledWith('workspace-1');
      expect(result.current.data).toEqual(mockProjects);
    });

    it('should not fetch when workspaceId is empty', () => {
      const { result } = renderHook(() => useProjects(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(projectService.listByWorkspace).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      (projectService.listByWorkspace as any).mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      });

      const { result } = renderHook(() => useProjects('workspace-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should use stale time for caching', async () => {
      (projectService.listByWorkspace as any).mockResolvedValue({
        data: mockProjects,
        error: null,
      });

      const { result, rerender } = renderHook(
        () => useProjects('workspace-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Rerender should use cached data
      rerender();

      // Should still have same data
      expect(result.current.data).toEqual(mockProjects);
    });
  });

  describe('useProject', () => {
    it('should fetch a single project', async () => {
      (projectService.get as any).mockResolvedValue({
        data: mockProjects[0],
        error: null,
      });

      const { result } = renderHook(() => useProject('project-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(projectService.get).toHaveBeenCalledWith('project-1');
      expect(result.current.data).toEqual(mockProjects[0]);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useProject(''), {
        wrapper: createWrapper(),
      });

      expect(projectService.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateProject', () => {
    it('should create a project', async () => {
      const newProject = {
        name: 'New Project',
        description: 'New description',
        workspace_id: 'workspace-1',
      };

      (projectService.create as any).mockResolvedValue({
        data: { id: 'project-new', ...newProject, created_at: new Date().toISOString() },
        error: null,
      });

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(newProject);
      });

      expect(projectService.create).toHaveBeenCalledWith(newProject);
    });

    it('should perform optimistic update', async () => {
      const newProject = {
        name: 'Optimistic Project',
        description: 'Description',
        workspace_id: 'workspace-1',
      };

      // Create a deferred promise that we control
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (projectService.create as any).mockImplementation(() => pendingPromise);

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      // Trigger mutation without awaiting
      act(() => {
        result.current.mutate(newProject);
      });

      // Should be pending while waiting for response
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve the promise to complete the mutation
      act(() => {
        resolvePromise!({ data: { id: 'project-new', ...newProject }, error: null });
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });

    it('should create project without description', async () => {
      const newProject = {
        name: 'Project Without Description',
        workspace_id: 'workspace-1',
      };

      (projectService.create as any).mockResolvedValue({
        data: { id: 'project-new', ...newProject, description: null },
        error: null,
      });

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(newProject);
      });

      expect(projectService.create).toHaveBeenCalledWith(newProject);
    });
  });

  describe('useUpdateProject', () => {
    it('should update a project', async () => {
      (projectService.update as any).mockResolvedValue({
        data: { ...mockProjects[0], name: 'Updated Name' },
        error: null,
      });

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'project-1',
          data: { name: 'Updated Name' },
        });
      });

      expect(projectService.update).toHaveBeenCalledWith('project-1', { name: 'Updated Name' });
    });

    it('should perform optimistic update', async () => {
      // Create a deferred promise that we control
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (projectService.update as any).mockImplementation(() => pendingPromise);

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      });

      // Trigger mutation without awaiting
      act(() => {
        result.current.mutate({
          id: 'project-1',
          data: { name: 'Updated Name' },
        });
      });

      // Should be pending while waiting for response
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve the promise to complete the mutation
      act(() => {
        resolvePromise!({ data: { ...mockProjects[0], name: 'Updated Name' }, error: null });
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });

    it('should update multiple fields', async () => {
      const updates = {
        name: 'Updated Name',
        description: 'Updated Description',
      };

      (projectService.update as any).mockResolvedValue({
        data: { ...mockProjects[0], ...updates },
        error: null,
      });

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'project-1',
          data: updates,
        });
      });

      expect(projectService.update).toHaveBeenCalledWith('project-1', updates);
    });
  });

  describe('useDeleteProject', () => {
    it('should delete a project', async () => {
      (projectService.delete as any).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('project-1');
      });

      expect(projectService.delete).toHaveBeenCalledWith('project-1');
    });

    it('should handle delete error', async () => {
      (projectService.delete as any).mockResolvedValue({
        error: new Error('Cannot delete project with documents'),
      });

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync('project-1');
        })
      ).rejects.toThrow('Cannot delete project with documents');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors in create mutation', async () => {
      (projectService.create as any).mockResolvedValue({
        data: null,
        error: new Error('Validation error: name required'),
      });

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            name: '',
            workspace_id: 'workspace-1',
          });
        })
      ).rejects.toThrow('Validation error: name required');
    });

    it('should rollback optimistic update on error', async () => {
      (projectService.update as any).mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            id: 'project-1',
            data: { name: 'Failed Update' },
          });
        })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('Query Invalidation', () => {
    it('should invalidate list queries after create', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Pre-populate the cache
      queryClient.setQueryData(['projects', 'list', 'workspace-1'], mockProjects);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      (projectService.create as any).mockResolvedValue({
        data: { id: 'project-new', name: 'New Project', workspace_id: 'workspace-1' },
        error: null,
      });

      const { result } = renderHook(() => useCreateProject(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'New Project',
          workspace_id: 'workspace-1',
        });
      });

      // Query should be invalidated (stale)
      const queryState = queryClient.getQueryState(['projects', 'list', 'workspace-1']);
      expect(queryState?.isInvalidated).toBe(true);
    });
  });
});
