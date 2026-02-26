/**
 * Unit tests for useWorkflowExecution hook.
 *
 * Tests workflow execution state management, SSE connection handling,
 * and execution lifecycle (start, pause, resume, stop).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkflowExecution } from '../useWorkflowExecution';

// Mock dependencies
vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/lib/store', () => ({
  useAuthStore: () => ({
    token: 'test-token',
    isLoading: false,
  }),
}));

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState = 1;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = 2;
  }

  // Helper to simulate messages
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

describe('useWorkflowExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances = [];
    (global as any).EventSource = MockEventSource;
  });

  afterEach(() => {
    MockEventSource.instances.forEach((es) => es.close());
  });

  describe('Initial State', () => {
    it('should return idle state initially', () => {
      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      expect(result.current.executionState).toEqual({
        status: 'idle',
        currentNodeId: null,
        progress: 0,
        logs: [],
        outputs: {},
        error: null,
        executionId: null,
      });
    });

    it('should expose execution control functions', () => {
      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      expect(typeof result.current.startExecution).toBe('function');
      expect(typeof result.current.pauseExecution).toBe('function');
      expect(typeof result.current.resumeExecution).toBe('function');
      expect(typeof result.current.stopExecution).toBe('function');
    });
  });

  describe('startExecution', () => {
    it('should start execution and set running status', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456', { variable: 'value' });
      });

      expect(api.default.post).toHaveBeenCalledWith('/workflows/executions/', {
        template_id: 'workflow-123',
        project_id: 'project-456',
        config_json: { variable: 'value' },
      });

      expect(result.current.executionState.status).toBe('running');
      expect(result.current.executionState.executionId).toBe('exec-123');
    });

    it('should create SSE connection after starting execution', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      expect(MockEventSource.instances.length).toBe(1);
      expect(MockEventSource.instances[0].url).toContain('/workflows/executions/exec-123/stream');
      expect(MockEventSource.instances[0].url).toContain('token=test-token');
    });

    it('should handle start execution failure', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      expect(result.current.executionState.status).toBe('failed');
      expect(result.current.executionState.error).toBe('Network error');
    });

    it('should add starting log message', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      expect(result.current.executionState.logs).toContain('Starting execution...');
    });
  });

  describe('SSE Progress Updates', () => {
    it('should update state on progress event', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      const eventSource = MockEventSource.instances[0];

      act(() => {
        eventSource.simulateMessage({
          type: 'progress',
          node_id: 'node-1',
          progress: 50,
          message: 'Processing node-1...',
        });
      });

      expect(result.current.executionState.status).toBe('running');
      expect(result.current.executionState.currentNodeId).toBe('node-1');
      expect(result.current.executionState.progress).toBe(50);
      expect(result.current.executionState.logs).toContain('Processing node-1...');
    });

    it('should update outputs on node_complete event', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      const eventSource = MockEventSource.instances[0];

      act(() => {
        eventSource.simulateMessage({
          type: 'node_complete',
          node_id: 'text-gen-1',
          data: { outputs: { content: 'Generated text' } },
          message: 'Node completed',
        });
      });

      expect(result.current.executionState.outputs['text-gen-1']).toEqual({
        content: 'Generated text',
      });
    });

    it('should set completed status on complete event', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      const eventSource = MockEventSource.instances[0];

      act(() => {
        eventSource.simulateMessage({
          type: 'complete',
          data: { outputs: { final: 'result' } },
        });
      });

      expect(result.current.executionState.status).toBe('completed');
      expect(result.current.executionState.progress).toBe(100);
    });

    it('should set failed status on error event', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      const eventSource = MockEventSource.instances[0];

      act(() => {
        eventSource.simulateMessage({
          type: 'error',
          message: 'Execution failed: API rate limit exceeded',
        });
      });

      expect(result.current.executionState.status).toBe('failed');
      expect(result.current.executionState.error).toBe('Execution failed: API rate limit exceeded');
    });

    it('should close EventSource on complete', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      const eventSource = MockEventSource.instances[0];

      act(() => {
        eventSource.simulateMessage({ type: 'complete', data: {} });
      });

      expect(eventSource.readyState).toBe(2); // CLOSED
    });

    it('should handle SSE connection error', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      const eventSource = MockEventSource.instances[0];

      act(() => {
        eventSource.simulateError();
      });

      expect(result.current.executionState.status).toBe('failed');
      expect(result.current.executionState.error).toBe('Connection to execution stream lost');
    });
  });

  describe('pauseExecution', () => {
    it('should pause execution and update status', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.pauseExecution('exec-123');
      });

      expect(api.default.post).toHaveBeenCalledWith('/workflows/executions/exec-123/pause');
      expect(result.current.executionState.status).toBe('paused');
      expect(result.current.executionState.logs).toContain('Execution paused by user.');
    });

    it('should handle pause failure gracefully', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockRejectedValue(new Error('Cannot pause'));

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      // Should not throw
      await act(async () => {
        await result.current.pauseExecution('exec-123');
      });

      // Status should remain unchanged (not paused)
      expect(result.current.executionState.status).not.toBe('paused');
    });
  });

  describe('resumeExecution', () => {
    it('should resume execution and reconnect SSE', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: {} });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.resumeExecution('exec-123');
      });

      expect(api.default.post).toHaveBeenCalledWith('/workflows/executions/exec-123/resume');
      expect(result.current.executionState.status).toBe('running');
      expect(result.current.executionState.logs).toContain('Execution resumed.');
      expect(MockEventSource.instances.length).toBeGreaterThan(0);
    });
  });

  describe('stopExecution', () => {
    it('should stop execution and close SSE', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      // First start an execution
      await act(async () => {
        await result.current.startExecution('project-456');
      });

      const eventSource = MockEventSource.instances[0];
      expect(eventSource.readyState).toBe(1); // OPEN

      // Then stop it
      await act(async () => {
        await result.current.stopExecution('exec-123');
      });

      expect(api.default.post).toHaveBeenCalledWith('/workflows/executions/exec-123/stop');
      expect(result.current.executionState.status).toBe('stopped');
      expect(result.current.executionState.logs).toContain('Execution stopped by user.');
    });
  });

  describe('Cleanup', () => {
    it('should close EventSource on unmount', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result, unmount } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      const eventSource = MockEventSource.instances[0];

      unmount();

      expect(eventSource.readyState).toBe(2); // CLOSED
    });

    it('should close existing EventSource before creating new one', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      // Start first execution
      await act(async () => {
        await result.current.startExecution('project-456');
      });

      const firstEventSource = MockEventSource.instances[0];

      // Start second execution (should close first)
      await act(async () => {
        await result.current.startExecution('project-789');
      });

      expect(firstEventSource.readyState).toBe(2); // First one should be closed
      expect(MockEventSource.instances.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed SSE message gracefully', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      const eventSource = MockEventSource.instances[0];

      // Simulate malformed JSON
      act(() => {
        if (eventSource.onmessage) {
          eventSource.onmessage({ data: 'invalid json' } as MessageEvent);
        }
      });

      // Should not crash, state should remain unchanged
      expect(result.current.executionState.status).toBe('running');
    });

    it('should handle unknown event type gracefully', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      const eventSource = MockEventSource.instances[0];

      act(() => {
        eventSource.simulateMessage({
          type: 'unknown_event_type',
          data: { something: 'unexpected' },
        });
      });

      // Should not crash, status should remain running
      expect(result.current.executionState.status).toBe('running');
    });

    it('should preserve previous outputs when adding new ones', async () => {
      const api = await import('@/lib/api');
      (api.default.post as any).mockResolvedValue({ data: { id: 'exec-123' } });

      const { result } = renderHook(() => useWorkflowExecution('workflow-123'));

      await act(async () => {
        await result.current.startExecution('project-456');
      });

      const eventSource = MockEventSource.instances[0];

      // First node complete
      act(() => {
        eventSource.simulateMessage({
          type: 'node_complete',
          node_id: 'node-1',
          data: { outputs: { result: 'first' } },
        });
      });

      // Second node complete
      act(() => {
        eventSource.simulateMessage({
          type: 'node_complete',
          node_id: 'node-2',
          data: { outputs: { result: 'second' } },
        });
      });

      expect(result.current.executionState.outputs).toEqual({
        'node-1': { result: 'first' },
        'node-2': { result: 'second' },
      });
    });
  });
});
