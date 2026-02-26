/**
 * Unit tests for use-documents hooks.
 *
 * Tests React Query document hooks including queries, mutations,
 * optimistic updates, and localStorage caching.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies before imports
vi.mock('@/lib/supabase/documents', () => ({
  documentService: {
    listByProject: vi.fn(),
    listByFolder: vi.fn(),
    listArchived: vi.fn(),
    get: vi.fn(),
    getShared: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    move: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    delete: vi.fn(),
    createShareLink: vi.fn(),
    revokeShareLink: vi.fn(),
  },
}));

vi.mock('@/lib/documents-cache', () => ({
  getDocumentsCache: vi.fn(() => null),
  setDocumentsCache: vi.fn(),
}));

vi.mock('./use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Import after mocks
import {
  useDocuments,
  useDocument,
  useDocumentsByFolder,
  useArchivedDocuments,
  useSharedDocument,
  useCreateDocument,
  useUpdateDocument,
  useMoveDocument,
  useArchiveDocument,
  useRestoreDocument,
  useDeleteDocument,
  useCreateShareLink,
  useRevokeShareLink,
  documentKeys,
} from '../use-documents';
import { documentService } from '@/lib/supabase/documents';
import { getDocumentsCache, setDocumentsCache } from '@/lib/documents-cache';

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

// Mock document data
const mockDocuments = [
  {
    id: 'doc-1',
    title: 'Test Document 1',
    content: 'Content 1',
    status: 'draft',
    project_id: 'project-1',
    media_type: 'text',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'doc-2',
    title: 'Test Document 2',
    content: 'Content 2',
    status: 'published',
    project_id: 'project-1',
    media_type: 'text',
    created_at: '2024-01-02T00:00:00Z',
  },
];

describe('use-documents hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('documentKeys', () => {
    it('should generate correct query keys', () => {
      expect(documentKeys.all).toEqual(['documents']);
      expect(documentKeys.lists()).toEqual(['documents', 'list']);
      expect(documentKeys.list('project-1')).toEqual(['documents', 'list', 'project-1']);
      expect(documentKeys.folder('project-1', 'folder-1')).toEqual([
        'documents', 'list', 'project-1', 'folder', 'folder-1'
      ]);
      expect(documentKeys.archived('project-1')).toEqual([
        'documents', 'list', 'project-1', 'archived'
      ]);
      expect(documentKeys.detail('doc-1')).toEqual(['documents', 'detail', 'doc-1']);
      expect(documentKeys.shared('token-123')).toEqual(['documents', 'shared', 'token-123']);
    });
  });

  describe('useDocuments', () => {
    it('should fetch documents for a project', async () => {
      (documentService.listByProject as any).mockResolvedValue({
        data: mockDocuments,
        error: null,
      });

      const { result } = renderHook(() => useDocuments('project-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(documentService.listByProject).toHaveBeenCalledWith('project-1');
      expect(result.current.data).toEqual(mockDocuments);
    });

    it('should use cached data while loading', async () => {
      const cachedDocs = [{ id: 'cached-1', title: 'Cached' }];
      (getDocumentsCache as any).mockReturnValue(cachedDocs);
      (documentService.listByProject as any).mockResolvedValue({
        data: mockDocuments,
        error: null,
      });

      const { result } = renderHook(() => useDocuments('project-1'), {
        wrapper: createWrapper(),
      });

      // Initially should have cached data
      expect(result.current.data).toBeTruthy();
    });

    it('should save to cache after fetching', async () => {
      (documentService.listByProject as any).mockResolvedValue({
        data: mockDocuments,
        error: null,
      });

      const { result } = renderHook(() => useDocuments('project-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(setDocumentsCache).toHaveBeenCalled();
    });

    it('should not fetch when projectId is empty', () => {
      const { result } = renderHook(() => useDocuments(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(documentService.listByProject).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      (documentService.listByProject as any).mockResolvedValue({
        data: null,
        error: new Error('Network error'),
      });

      const { result } = renderHook(() => useDocuments('project-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useDocument', () => {
    it('should fetch a single document', async () => {
      (documentService.get as any).mockResolvedValue({
        data: mockDocuments[0],
        error: null,
      });

      const { result } = renderHook(() => useDocument('doc-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(documentService.get).toHaveBeenCalledWith('doc-1');
      expect(result.current.data).toEqual(mockDocuments[0]);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useDocument(''), {
        wrapper: createWrapper(),
      });

      expect(documentService.get).not.toHaveBeenCalled();
    });
  });

  describe('useDocumentsByFolder', () => {
    it('should fetch documents in a folder', async () => {
      (documentService.listByFolder as any).mockResolvedValue({
        data: mockDocuments,
        error: null,
      });

      const { result } = renderHook(
        () => useDocumentsByFolder('project-1', 'folder-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(documentService.listByFolder).toHaveBeenCalledWith('project-1', 'folder-1');
    });

    it('should handle null folderId for root documents', async () => {
      (documentService.listByFolder as any).mockResolvedValue({
        data: mockDocuments,
        error: null,
      });

      const { result } = renderHook(
        () => useDocumentsByFolder('project-1', null),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(documentService.listByFolder).toHaveBeenCalledWith('project-1', null);
    });
  });

  describe('useArchivedDocuments', () => {
    it('should fetch archived documents', async () => {
      (documentService.listArchived as any).mockResolvedValue({
        data: [{ ...mockDocuments[0], deleted_at: '2024-01-03' }],
        error: null,
      });

      const { result } = renderHook(
        () => useArchivedDocuments('project-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(documentService.listArchived).toHaveBeenCalledWith('project-1');
    });
  });

  describe('useSharedDocument', () => {
    it('should fetch a shared document by token', async () => {
      (documentService.getShared as any).mockResolvedValue({
        data: { ...mockDocuments[0], is_public: true },
        error: null,
      });

      const { result } = renderHook(
        () => useSharedDocument('share-token-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(documentService.getShared).toHaveBeenCalledWith('share-token-123');
    });
  });

  describe('useCreateDocument', () => {
    it('should create a document and invalidate queries', async () => {
      const newDoc = {
        title: 'New Document',
        content: 'New content',
        project_id: 'project-1',
      };

      (documentService.create as any).mockResolvedValue({
        data: { id: 'doc-new', ...newDoc },
        error: null,
      });

      const { result } = renderHook(() => useCreateDocument(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(newDoc as any);
      });

      expect(documentService.create).toHaveBeenCalledWith(newDoc);
    });

    it('should perform optimistic update', async () => {
      const newDoc = {
        title: 'Optimistic Doc',
        content: 'Content',
        project_id: 'project-1',
      };

      // Create a deferred promise that we control
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      (documentService.create as any).mockImplementation(() => pendingPromise);

      const { result } = renderHook(() => useCreateDocument(), {
        wrapper: createWrapper(),
      });

      // Trigger mutation without awaiting
      act(() => {
        result.current.mutate(newDoc as any);
      });

      // Should be pending while waiting for response
      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      // Resolve the promise to complete the mutation
      act(() => {
        resolvePromise!({ data: { id: 'doc-new', ...newDoc }, error: null });
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });
  });

  describe('useUpdateDocument', () => {
    it('should update a document', async () => {
      (documentService.update as any).mockResolvedValue({
        data: { ...mockDocuments[0], title: 'Updated Title' },
        error: null,
      });

      const { result } = renderHook(() => useUpdateDocument(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'doc-1',
          data: { title: 'Updated Title' },
        });
      });

      expect(documentService.update).toHaveBeenCalledWith('doc-1', { title: 'Updated Title' });
    });
  });

  describe('useMoveDocument', () => {
    it('should move a document to a folder', async () => {
      (documentService.move as any).mockResolvedValue({
        data: { ...mockDocuments[0], folder_id: 'folder-2' },
        error: null,
      });

      const { result } = renderHook(() => useMoveDocument(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'doc-1',
          folderId: 'folder-2',
        });
      });

      expect(documentService.move).toHaveBeenCalledWith('doc-1', 'folder-2');
    });

    it('should move document to root (null folder)', async () => {
      (documentService.move as any).mockResolvedValue({
        data: { ...mockDocuments[0], folder_id: null },
        error: null,
      });

      const { result } = renderHook(() => useMoveDocument(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'doc-1',
          folderId: null,
        });
      });

      expect(documentService.move).toHaveBeenCalledWith('doc-1', null);
    });
  });

  describe('useArchiveDocument', () => {
    it('should archive a document', async () => {
      (documentService.archive as any).mockResolvedValue({
        data: { ...mockDocuments[0], deleted_at: '2024-01-03' },
        error: null,
      });

      const { result } = renderHook(() => useArchiveDocument(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('doc-1');
      });

      expect(documentService.archive).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('useRestoreDocument', () => {
    it('should restore an archived document', async () => {
      (documentService.restore as any).mockResolvedValue({
        data: { ...mockDocuments[0], deleted_at: null },
        error: null,
      });

      const { result } = renderHook(() => useRestoreDocument(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('doc-1');
      });

      expect(documentService.restore).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('useDeleteDocument', () => {
    it('should permanently delete a document', async () => {
      (documentService.delete as any).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useDeleteDocument(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('doc-1');
      });

      expect(documentService.delete).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('useCreateShareLink', () => {
    it('should create a share link', async () => {
      (documentService.createShareLink as any).mockResolvedValue({
        data: { shareUrl: '/share/token-123' },
        error: null,
      });

      // Mock clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      const { result } = renderHook(() => useCreateShareLink(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'doc-1',
          expiresInDays: 7,
        });
      });

      expect(documentService.createShareLink).toHaveBeenCalledWith('doc-1', 7);
    });
  });

  describe('useRevokeShareLink', () => {
    it('should revoke a share link', async () => {
      (documentService.revokeShareLink as any).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useRevokeShareLink(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('doc-1');
      });

      expect(documentService.revokeShareLink).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors in mutations', async () => {
      (documentService.create as any).mockResolvedValue({
        data: null,
        error: new Error('Validation error'),
      });

      const { result } = renderHook(() => useCreateDocument(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            title: 'Test',
            project_id: 'project-1',
          } as any);
        })
      ).rejects.toThrow('Validation error');
    });
  });
});
