/**
 * Unit tests for useVariableAutocomplete hook.
 *
 * Tests variable discovery from upstream nodes in workflow graphs,
 * including various node types and their output fields.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVariableAutocomplete, VariableOption } from '../useVariableAutocomplete';

// Mock the workflow store
const mockWorkflowStore = {
  nodes: [] as any[],
  edges: [] as any[],
};

vi.mock('@/lib/stores/workflowStore', () => ({
  useWorkflowStore: () => mockWorkflowStore,
}));

describe('useVariableAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkflowStore.nodes = [];
    mockWorkflowStore.edges = [];
  });

  describe('Basic Graph Traversal', () => {
    it('should return empty array when no upstream nodes exist', () => {
      mockWorkflowStore.nodes = [
        { id: 'node-1', type: 'text_generation', data: { label: 'Text Gen' } },
      ];
      mockWorkflowStore.edges = [];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      expect(result.current).toEqual([]);
    });

    it('should find variables from direct upstream node', () => {
      mockWorkflowStore.nodes = [
        { id: 'start-1', type: 'start', data: { label: 'Start' } },
        { id: 'node-1', type: 'text_generation', data: { label: 'Text Gen' } },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'start-1', target: 'node-1' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      expect(result.current).toHaveLength(1);
      expect(result.current[0].value).toBe('{{start-1.input_variables}}');
      expect(result.current[0].nodeId).toBe('start-1');
    });

    it('should find variables from multiple upstream nodes', () => {
      mockWorkflowStore.nodes = [
        { id: 'start-1', type: 'start', data: { label: 'Start' } },
        { id: 'text-1', type: 'text_generation', data: { label: 'Text Gen 1' } },
        { id: 'text-2', type: 'text_generation', data: { label: 'Text Gen 2' } },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'start-1', target: 'text-1' },
        { id: 'e2', source: 'text-1', target: 'text-2' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('text-2'));

      // Should find start and text-1 variables
      const nodeIds = result.current.map((v: VariableOption) => v.nodeId);
      expect(nodeIds).toContain('start-1');
      expect(nodeIds).toContain('text-1');
    });

    it('should traverse deep chains of nodes', () => {
      mockWorkflowStore.nodes = [
        { id: 'node-1', type: 'start', data: { label: 'Start' } },
        { id: 'node-2', type: 'text_generation', data: { label: 'Text 1' } },
        { id: 'node-3', type: 'text_generation', data: { label: 'Text 2' } },
        { id: 'node-4', type: 'text_generation', data: { label: 'Text 3' } },
        { id: 'node-5', type: 'text_generation', data: { label: 'Text 4' } },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'node-1', target: 'node-2' },
        { id: 'e2', source: 'node-2', target: 'node-3' },
        { id: 'e3', source: 'node-3', target: 'node-4' },
        { id: 'e4', source: 'node-4', target: 'node-5' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-5'));

      const nodeIds = result.current.map((v: VariableOption) => v.nodeId);
      expect(nodeIds).toContain('node-1');
      expect(nodeIds).toContain('node-2');
      expect(nodeIds).toContain('node-3');
      expect(nodeIds).toContain('node-4');
      expect(nodeIds).not.toContain('node-5'); // Current node excluded
    });

    it('should not include downstream nodes', () => {
      mockWorkflowStore.nodes = [
        { id: 'start-1', type: 'start', data: { label: 'Start' } },
        { id: 'text-1', type: 'text_generation', data: { label: 'Text Gen 1' } },
        { id: 'text-2', type: 'text_generation', data: { label: 'Text Gen 2' } },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'start-1', target: 'text-1' },
        { id: 'e2', source: 'text-1', target: 'text-2' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('text-1'));

      const nodeIds = result.current.map((v: VariableOption) => v.nodeId);
      expect(nodeIds).toContain('start-1');
      expect(nodeIds).not.toContain('text-2'); // Downstream excluded
    });

    it('should handle nodes with multiple incoming edges', () => {
      mockWorkflowStore.nodes = [
        { id: 'start-1', type: 'start', data: { label: 'Start' } },
        { id: 'text-1', type: 'text_generation', data: { label: 'Path A' } },
        { id: 'text-2', type: 'text_generation', data: { label: 'Path B' } },
        { id: 'merge', type: 'text_generation', data: { label: 'Merge' } },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'start-1', target: 'text-1' },
        { id: 'e2', source: 'start-1', target: 'text-2' },
        { id: 'e3', source: 'text-1', target: 'merge' },
        { id: 'e4', source: 'text-2', target: 'merge' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('merge'));

      const nodeIds = result.current.map((v: VariableOption) => v.nodeId);
      expect(nodeIds).toContain('start-1');
      expect(nodeIds).toContain('text-1');
      expect(nodeIds).toContain('text-2');
    });
  });

  describe('Node Type Variable Generation', () => {
    it('should generate start node variables', () => {
      mockWorkflowStore.nodes = [
        { id: 'start-1', type: 'start', data: { label: 'Start Node' } },
        { id: 'node-1', type: 'text_generation', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'start-1', target: 'node-1' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      expect(result.current).toContainEqual(
        expect.objectContaining({
          value: '{{start-1.input_variables}}',
          type: 'json',
          nodeLabel: 'Start Node',
        })
      );
    });

    it('should generate text_generation node variables', () => {
      mockWorkflowStore.nodes = [
        { id: 'text-gen', type: 'text_generation', data: { label: 'Copy Writer' } },
        { id: 'node-1', type: 'finish', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'text-gen', target: 'node-1' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      expect(result.current).toContainEqual(
        expect.objectContaining({
          value: '{{text-gen.content}}',
          type: 'text',
        })
      );
      expect(result.current).toContainEqual(
        expect.objectContaining({
          value: '{{text-gen.title}}',
          type: 'text',
        })
      );
    });

    it('should generate image_generation node variables', () => {
      mockWorkflowStore.nodes = [
        { id: 'image-gen', type: 'image_generation', data: { label: 'Image Creator' } },
        { id: 'node-1', type: 'finish', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'image-gen', target: 'node-1' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      const values = result.current.map((v: VariableOption) => v.value);
      expect(values).toContain('{{image-gen.file_url}}');
      expect(values).toContain('{{image-gen.thumbnail_url}}');
      expect(values).toContain('{{image-gen.title}}');
      expect(values).toContain('{{image-gen.prompt}}');
    });

    it('should generate context_retrieval node variables', () => {
      mockWorkflowStore.nodes = [
        { id: 'rag', type: 'context_retrieval', data: { label: 'RAG Search' } },
        { id: 'node-1', type: 'text_generation', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'rag', target: 'node-1' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      const values = result.current.map((v: VariableOption) => v.value);
      expect(values).toContain('{{rag.context}}');
      expect(values).toContain('{{rag.content}}');
      expect(values).toContain('{{rag.documents}}');
      expect(values).toContain('{{rag.count}}');
    });

    it('should generate processing node variables', () => {
      mockWorkflowStore.nodes = [
        { id: 'proc', type: 'processing', data: { label: 'Text Processor' } },
        { id: 'node-1', type: 'finish', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'proc', target: 'node-1' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      expect(result.current).toContainEqual(
        expect.objectContaining({
          value: '{{proc.content}}',
          type: 'text',
        })
      );
      expect(result.current).toContainEqual(
        expect.objectContaining({
          value: '{{proc.title}}',
          type: 'text',
        })
      );
    });

    it('should generate loop node variables', () => {
      mockWorkflowStore.nodes = [
        { id: 'loop-1', type: 'loop', data: { label: 'Iterator' } },
        { id: 'node-1', type: 'text_generation', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'loop-1', target: 'node-1' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      const values = result.current.map((v: VariableOption) => v.value);
      expect(values).toContain('{{loop-1.item}}');
      expect(values).toContain('{{loop-1.current_iteration}}');
      expect(values).toContain('{{loop-1.iterations}}');
    });

    it('should generate conditional node variables', () => {
      mockWorkflowStore.nodes = [
        { id: 'cond-1', type: 'conditional', data: { label: 'Branch Decision' } },
        { id: 'node-1', type: 'text_generation', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'cond-1', target: 'node-1' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      expect(result.current).toContainEqual(
        expect.objectContaining({
          value: '{{cond-1.result}}',
          type: 'boolean',
        })
      );
      expect(result.current).toContainEqual(
        expect.objectContaining({
          value: '{{cond-1.branch}}',
          type: 'text',
        })
      );
    });

    it('should not generate variables for finish nodes', () => {
      mockWorkflowStore.nodes = [
        { id: 'finish-1', type: 'finish', data: { label: 'End' } },
        { id: 'node-1', type: 'text_generation', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'finish-1', target: 'node-1' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      // Finish nodes don't output variables
      expect(result.current).toEqual([]);
    });
  });

  describe('Variable Labels and Metadata', () => {
    it('should use node label in variable label', () => {
      mockWorkflowStore.nodes = [
        { id: 'text-1', type: 'text_generation', data: { label: 'Marketing Copy' } },
        { id: 'node-1', type: 'finish', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'text-1', target: 'node-1' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      const contentVar = result.current.find((v: VariableOption) => v.value === '{{text-1.content}}');
      expect(contentVar?.label).toBe('Marketing Copy - Generated Text');
      expect(contentVar?.nodeLabel).toBe('Marketing Copy');
    });

    it('should fall back to node type when label is missing', () => {
      mockWorkflowStore.nodes = [
        { id: 'text-1', type: 'text_generation', data: {} },
        { id: 'node-1', type: 'finish', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'text-1', target: 'node-1' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      const contentVar = result.current.find((v: VariableOption) => v.value === '{{text-1.content}}');
      expect(contentVar?.nodeLabel).toBe('text_generation');
    });

    it('should include correct type metadata for each variable', () => {
      mockWorkflowStore.nodes = [
        { id: 'loop-1', type: 'loop', data: { label: 'Loop' } },
        { id: 'node-1', type: 'text_generation', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'loop-1', target: 'node-1' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('node-1'));

      const itemVar = result.current.find((v: VariableOption) => v.value === '{{loop-1.item}}');
      expect(itemVar?.type).toBe('any');

      const iterationVar = result.current.find((v: VariableOption) => v.value === '{{loop-1.current_iteration}}');
      expect(iterationVar?.type).toBe('number');
    });
  });

  describe('Complex Workflow Scenarios', () => {
    it('should handle diamond-shaped graph (merge after split)', () => {
      // Start -> A -> Merge
      //       \-> B ->/
      mockWorkflowStore.nodes = [
        { id: 'start', type: 'start', data: { label: 'Start' } },
        { id: 'a', type: 'text_generation', data: { label: 'Path A' } },
        { id: 'b', type: 'text_generation', data: { label: 'Path B' } },
        { id: 'merge', type: 'text_generation', data: { label: 'Merge' } },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'start', target: 'a' },
        { id: 'e2', source: 'start', target: 'b' },
        { id: 'e3', source: 'a', target: 'merge' },
        { id: 'e4', source: 'b', target: 'merge' },
      ];

      const { result } = renderHook(() => useVariableAutocomplete('merge'));

      const nodeIds = new Set(result.current.map((v: VariableOption) => v.nodeId));
      expect(nodeIds.has('start')).toBe(true);
      expect(nodeIds.has('a')).toBe(true);
      expect(nodeIds.has('b')).toBe(true);
      expect(nodeIds.has('merge')).toBe(false);
    });

    it('should handle isolated node with no edges', () => {
      mockWorkflowStore.nodes = [
        { id: 'isolated', type: 'text_generation', data: { label: 'Isolated' } },
      ];
      mockWorkflowStore.edges = [];

      const { result } = renderHook(() => useVariableAutocomplete('isolated'));

      expect(result.current).toEqual([]);
    });

    it('should not include cycles (avoid infinite loops)', () => {
      // Node A -> Node B -> Node A (cycle)
      // This shouldn't happen in practice, but let's handle it gracefully
      mockWorkflowStore.nodes = [
        { id: 'a', type: 'text_generation', data: { label: 'A' } },
        { id: 'b', type: 'text_generation', data: { label: 'B' } },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'a' }, // Cycle
      ];

      // Should complete without infinite loop
      const { result } = renderHook(() => useVariableAutocomplete('b'));

      // Should find 'a' as upstream
      const nodeIds = result.current.map((v: VariableOption) => v.nodeId);
      expect(nodeIds).toContain('a');
    });
  });

  describe('Memoization', () => {
    it('should return same reference when dependencies unchanged', () => {
      mockWorkflowStore.nodes = [
        { id: 'start', type: 'start', data: { label: 'Start' } },
        { id: 'node-1', type: 'text_generation', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'start', target: 'node-1' },
      ];

      const { result, rerender } = renderHook(() => useVariableAutocomplete('node-1'));

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });

    it('should recompute when nodes change', () => {
      mockWorkflowStore.nodes = [
        { id: 'start', type: 'start', data: { label: 'Start' } },
        { id: 'node-1', type: 'text_generation', data: {} },
      ];
      mockWorkflowStore.edges = [
        { id: 'e1', source: 'start', target: 'node-1' },
      ];

      const { result, rerender } = renderHook(() => useVariableAutocomplete('node-1'));

      const firstLength = result.current.length;

      // Add another upstream node
      mockWorkflowStore.nodes = [
        ...mockWorkflowStore.nodes,
        { id: 'text-0', type: 'text_generation', data: { label: 'Text 0' } },
      ];
      mockWorkflowStore.edges = [
        ...mockWorkflowStore.edges,
        { id: 'e2', source: 'text-0', target: 'node-1' },
      ];

      rerender();

      expect(result.current.length).toBeGreaterThan(firstLength);
    });
  });
});
