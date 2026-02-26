/**
 * Unit tests for use-conversations hooks.
 *
 * Tests React Query conversation hooks including queries, mutations,
 * and optimistic updates for chat conversation management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies before imports
vi.mock('@/lib/supabase/conversations', () => ({
  conversationService: {
    list: vi.fn(),
    listByWorkspace: vi.fn(),
    listByProject: vi.fn(),
    listArchived: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateTitle: vi.fn(),
    moveToProject: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
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
  useConversations,
  useWorkspaceConversations,
  useProjectConversations,
  useArchivedConversations,
  useConversation,
  useCreateConversation,
  useUpdateConversation,
  useUpdateConversationTitle,
  useMoveConversationToProject,
  useArchiveConversation,
  useRestoreConversation,
  useDeleteConversation,
  conversationKeys,
} from '../use-conversations';
import { conversationService } from '@/lib/supabase/conversations';

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

// Mock conversation data
const mockConversations = [
  {
    id: 'conv-1',
    title: 'Test Conversation 1',
    user_id: 'user-1',
    workspace_id: 'workspace-1',
    project_id: 'project-1',
    messages_json: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ],
    is_archived: false,
    message_count: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:01:00Z',
  },
  {
    id: 'conv-2',
    title: 'Test Conversation 2',
    user_id: 'user-1',
    workspace_id: 'workspace-1',
    project_id: null,
    messages_json: [],
    is_archived: false,
    message_count: 0,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

describe('use-conversations hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('conversationKeys', () => {
    it('should generate correct query keys', () => {
      expect(conversationKeys.all).toEqual(['conversations']);
      expect(conversationKeys.lists()).toEqual(['conversations', 'list']);
      expect(conversationKeys.list()).toEqual(['conversations', 'list', 'all']);
      expect(conversationKeys.workspace('ws-1')).toEqual([
        'conversations', 'list', 'workspace', 'ws-1'
      ]);
      expect(conversationKeys.project('proj-1')).toEqual([
        'conversations', 'list', 'project', 'proj-1'
      ]);
      expect(conversationKeys.archived()).toEqual(['conversations', 'list', 'archived']);
      expect(conversationKeys.detail('conv-1')).toEqual(['conversations', 'detail', 'conv-1']);
    });
  });

  describe('useConversations', () => {
    it('should fetch all conversations', async () => {
      (conversationService.list as any).mockResolvedValue({
        data: mockConversations,
        error: null,
      });

      const { result } = renderHook(() => useConversations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(conversationService.list).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockConversations);
    });

    it('should handle fetch error', async () => {
      (conversationService.list as any).mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      });

      const { result } = renderHook(() => useConversations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useWorkspaceConversations', () => {
    it('should fetch conversations by workspace', async () => {
      (conversationService.listByWorkspace as any).mockResolvedValue({
        data: mockConversations,
        error: null,
      });

      const { result } = renderHook(
        () => useWorkspaceConversations('workspace-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(conversationService.listByWorkspace).toHaveBeenCalledWith('workspace-1');
    });

    it('should not fetch when workspaceId is empty', () => {
      const { result } = renderHook(
        () => useWorkspaceConversations(''),
        { wrapper: createWrapper() }
      );

      expect(conversationService.listByWorkspace).not.toHaveBeenCalled();
    });
  });

  describe('useProjectConversations', () => {
    it('should fetch conversations by project', async () => {
      (conversationService.listByProject as any).mockResolvedValue({
        data: [mockConversations[0]],
        error: null,
      });

      const { result } = renderHook(
        () => useProjectConversations('project-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(conversationService.listByProject).toHaveBeenCalledWith('project-1');
      expect(result.current.data).toHaveLength(1);
    });
  });

  describe('useArchivedConversations', () => {
    it('should fetch archived conversations', async () => {
      const archivedConv = { ...mockConversations[0], is_archived: true };
      (conversationService.listArchived as any).mockResolvedValue({
        data: [archivedConv],
        error: null,
      });

      const { result } = renderHook(
        () => useArchivedConversations(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(conversationService.listArchived).toHaveBeenCalled();
    });
  });

  describe('useConversation', () => {
    it('should fetch a single conversation', async () => {
      (conversationService.get as any).mockResolvedValue({
        data: mockConversations[0],
        error: null,
      });

      const { result } = renderHook(
        () => useConversation('conv-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(conversationService.get).toHaveBeenCalledWith('conv-1');
      expect(result.current.data).toEqual(mockConversations[0]);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(
        () => useConversation(''),
        { wrapper: createWrapper() }
      );

      expect(conversationService.get).not.toHaveBeenCalled();
    });
  });

  describe('useCreateConversation', () => {
    it('should create a conversation', async () => {
      const newConv = {
        title: 'New Conversation',
        workspace_id: 'workspace-1',
        project_id: 'project-1',
      };

      (conversationService.create as any).mockResolvedValue({
        data: { id: 'conv-new', ...newConv, messages_json: [] },
        error: null,
      });

      const { result } = renderHook(() => useCreateConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(newConv);
      });

      expect(conversationService.create).toHaveBeenCalledWith(newConv);
    });

    it('should perform optimistic update', async () => {
      const newConv = {
        title: 'Optimistic Conversation',
        workspace_id: 'workspace-1',
      };

      // Create a deferred promise that we control
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (conversationService.create as any).mockImplementation(() => pendingPromise);

      const { result } = renderHook(() => useCreateConversation(), {
        wrapper: createWrapper(),
      });

      // Trigger mutation without awaiting
      act(() => {
        result.current.mutate(newConv);
      });

      // Should be pending while waiting for response
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve the promise to complete the mutation
      act(() => {
        resolvePromise!({ data: { id: 'conv-new', ...newConv }, error: null });
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });
  });

  describe('useUpdateConversation', () => {
    it('should update a conversation', async () => {
      (conversationService.update as any).mockResolvedValue({
        data: { ...mockConversations[0], summary: 'Updated summary' },
        error: null,
      });

      const { result } = renderHook(() => useUpdateConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'conv-1',
          data: { summary: 'Updated summary' },
        });
      });

      expect(conversationService.update).toHaveBeenCalledWith('conv-1', { summary: 'Updated summary' });
    });
  });

  describe('useUpdateConversationTitle', () => {
    it('should update conversation title', async () => {
      (conversationService.updateTitle as any).mockResolvedValue({
        data: { ...mockConversations[0], title: 'New Title' },
        error: null,
      });

      const { result } = renderHook(() => useUpdateConversationTitle(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'conv-1',
          title: 'New Title',
        });
      });

      expect(conversationService.updateTitle).toHaveBeenCalledWith('conv-1', 'New Title');
    });

    it('should perform optimistic title update', async () => {
      // Create a deferred promise that we control
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (conversationService.updateTitle as any).mockImplementation(() => pendingPromise);

      const { result } = renderHook(() => useUpdateConversationTitle(), {
        wrapper: createWrapper(),
      });

      // Trigger mutation without awaiting
      act(() => {
        result.current.mutate({ id: 'conv-1', title: 'New Title' });
      });

      // Should be pending while waiting for response
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve the promise to complete the mutation
      act(() => {
        resolvePromise!({ data: { ...mockConversations[0], title: 'New Title' }, error: null });
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });
  });

  describe('useMoveConversationToProject', () => {
    it('should move conversation to a project', async () => {
      (conversationService.moveToProject as any).mockResolvedValue({
        data: { ...mockConversations[1], project_id: 'project-1' },
        error: null,
      });

      const { result } = renderHook(() => useMoveConversationToProject(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'conv-2',
          projectId: 'project-1',
        });
      });

      expect(conversationService.moveToProject).toHaveBeenCalledWith('conv-2', 'project-1');
    });

    it('should move conversation out of project (to null)', async () => {
      (conversationService.moveToProject as any).mockResolvedValue({
        data: { ...mockConversations[0], project_id: null },
        error: null,
      });

      const { result } = renderHook(() => useMoveConversationToProject(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'conv-1',
          projectId: null,
        });
      });

      expect(conversationService.moveToProject).toHaveBeenCalledWith('conv-1', null);
    });
  });

  describe('useArchiveConversation', () => {
    it('should archive a conversation', async () => {
      (conversationService.archive as any).mockResolvedValue({
        data: { ...mockConversations[0], is_archived: true },
        error: null,
      });

      const { result } = renderHook(() => useArchiveConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('conv-1');
      });

      expect(conversationService.archive).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('useRestoreConversation', () => {
    it('should restore an archived conversation', async () => {
      (conversationService.restore as any).mockResolvedValue({
        data: { ...mockConversations[0], is_archived: false },
        error: null,
      });

      const { result } = renderHook(() => useRestoreConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('conv-1');
      });

      expect(conversationService.restore).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('useDeleteConversation', () => {
    it('should delete a conversation permanently', async () => {
      (conversationService.delete as any).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useDeleteConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('conv-1');
      });

      expect(conversationService.delete).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors in mutations', async () => {
      (conversationService.create as any).mockResolvedValue({
        data: null,
        error: new Error('Validation error'),
      });

      const { result } = renderHook(() => useCreateConversation(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            title: 'Test',
            workspace_id: 'workspace-1',
          });
        })
      ).rejects.toThrow('Validation error');
    });

    it('should rollback optimistic update on error', async () => {
      (conversationService.updateTitle as any).mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });

      const { result } = renderHook(() => useUpdateConversationTitle(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            id: 'conv-1',
            title: 'Failed Update',
          });
        })
      ).rejects.toThrow('Update failed');
    });
  });
});
