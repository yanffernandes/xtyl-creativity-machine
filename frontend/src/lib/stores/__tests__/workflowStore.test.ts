/**
 * Unit tests for workflowStore (Zustand).
 *
 * Tests workflow state management including nodes, edges, selection,
 * and load/save operations for the ReactFlow workflow editor.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useWorkflowStore } from '../workflowStore';

describe('workflowStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useWorkflowStore.getState().clearWorkflow();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useWorkflowStore.getState();

      expect(state.nodes).toEqual([]);
      expect(state.edges).toEqual([]);
      expect(state.selectedNode).toBeNull();
      expect(state.workflowId).toBeNull();
      expect(state.workflowName).toBe('Untitled Workflow');
      expect(state.workflowDescription).toBe('');
      expect(state.isDirty).toBe(false);
    });
  });

  describe('Node Operations', () => {
    it('should set nodes', () => {
      const nodes = [
        { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'node-2', type: 'finish', position: { x: 100, y: 100 }, data: {} },
      ];

      act(() => {
        useWorkflowStore.getState().setNodes(nodes);
      });

      expect(useWorkflowStore.getState().nodes).toEqual(nodes);
    });

    it('should add a node', () => {
      const newNode = {
        id: 'node-1',
        type: 'text_generation',
        position: { x: 50, y: 50 },
        data: { label: 'Text Gen' },
      };

      act(() => {
        useWorkflowStore.getState().addNode(newNode);
      });

      expect(useWorkflowStore.getState().nodes).toHaveLength(1);
      expect(useWorkflowStore.getState().nodes[0]).toEqual(newNode);
      expect(useWorkflowStore.getState().isDirty).toBe(true);
    });

    it('should remove a node', () => {
      const nodes = [
        { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'node-2', type: 'finish', position: { x: 100, y: 100 }, data: {} },
      ];

      act(() => {
        useWorkflowStore.getState().setNodes(nodes);
        useWorkflowStore.getState().removeNode('node-1');
      });

      expect(useWorkflowStore.getState().nodes).toHaveLength(1);
      expect(useWorkflowStore.getState().nodes[0].id).toBe('node-2');
    });

    it('should remove connected edges when node is removed', () => {
      const nodes = [
        { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'node-2', type: 'finish', position: { x: 100, y: 100 }, data: {} },
      ];
      const edges = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
      ];

      act(() => {
        useWorkflowStore.getState().setNodes(nodes);
        useWorkflowStore.getState().setEdges(edges);
        useWorkflowStore.getState().removeNode('node-1');
      });

      expect(useWorkflowStore.getState().edges).toHaveLength(0);
    });

    it('should clear selected node when removed', () => {
      const node = { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} };

      act(() => {
        useWorkflowStore.getState().addNode(node);
        useWorkflowStore.getState().selectNode(node);
      });

      expect(useWorkflowStore.getState().selectedNode).not.toBeNull();

      act(() => {
        useWorkflowStore.getState().removeNode('node-1');
      });

      expect(useWorkflowStore.getState().selectedNode).toBeNull();
    });

    it('should update node data', () => {
      const node = {
        id: 'node-1',
        type: 'text_generation',
        position: { x: 0, y: 0 },
        data: { label: 'Original', prompt: 'Hello' },
      };

      act(() => {
        useWorkflowStore.getState().addNode(node);
        useWorkflowStore.getState().updateNodeData('node-1', {
          label: 'Updated',
          model: 'gpt-4',
        });
      });

      const updatedNode = useWorkflowStore.getState().nodes[0];
      expect(updatedNode.data.label).toBe('Updated');
      expect(updatedNode.data.model).toBe('gpt-4');
      expect(updatedNode.data.prompt).toBe('Hello'); // Preserved
      expect(useWorkflowStore.getState().isDirty).toBe(true);
    });

    it('should update selectedNode when its data changes', () => {
      const node = {
        id: 'node-1',
        type: 'text_generation',
        position: { x: 0, y: 0 },
        data: { label: 'Original' },
      };

      act(() => {
        useWorkflowStore.getState().addNode(node);
        useWorkflowStore.getState().selectNode(node);
        useWorkflowStore.getState().updateNodeData('node-1', { label: 'Updated' });
      });

      expect(useWorkflowStore.getState().selectedNode?.data.label).toBe('Updated');
    });
  });

  describe('Edge Operations', () => {
    it('should set edges', () => {
      const edges = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' },
      ];

      act(() => {
        useWorkflowStore.getState().setEdges(edges);
      });

      expect(useWorkflowStore.getState().edges).toEqual(edges);
    });

    it('should add an edge', () => {
      const edge = { id: 'edge-1', source: 'node-1', target: 'node-2' };

      act(() => {
        useWorkflowStore.getState().addEdge(edge);
      });

      expect(useWorkflowStore.getState().edges).toHaveLength(1);
      expect(useWorkflowStore.getState().edges[0]).toEqual(edge);
      expect(useWorkflowStore.getState().isDirty).toBe(true);
    });

    it('should remove an edge', () => {
      const edges = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' },
      ];

      act(() => {
        useWorkflowStore.getState().setEdges(edges);
        useWorkflowStore.getState().removeEdge('edge-1');
      });

      expect(useWorkflowStore.getState().edges).toHaveLength(1);
      expect(useWorkflowStore.getState().edges[0].id).toBe('edge-2');
    });

    it('should handle onConnect to create edges', () => {
      const connection = { source: 'node-1', target: 'node-2' };

      act(() => {
        useWorkflowStore.getState().onConnect(connection as any);
      });

      expect(useWorkflowStore.getState().edges).toHaveLength(1);
      expect(useWorkflowStore.getState().edges[0].source).toBe('node-1');
      expect(useWorkflowStore.getState().edges[0].target).toBe('node-2');
    });
  });

  describe('Selection', () => {
    it('should select a node', () => {
      const node = { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} };

      act(() => {
        useWorkflowStore.getState().addNode(node);
        useWorkflowStore.getState().selectNode(node);
      });

      // selectedNode stores the node reference
      expect(useWorkflowStore.getState().selectedNode?.id).toBe('node-1');

      // The nodes array should have the selected flag set
      const selectedInNodes = useWorkflowStore.getState().nodes.find(n => n.id === 'node-1');
      expect(selectedInNodes?.selected).toBe(true);
    });

    it('should deselect previous node when selecting new one', () => {
      const node1 = { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} };
      const node2 = { id: 'node-2', type: 'finish', position: { x: 100, y: 100 }, data: {} };

      act(() => {
        useWorkflowStore.getState().addNode(node1);
        useWorkflowStore.getState().addNode(node2);
        useWorkflowStore.getState().selectNode(node1);
        useWorkflowStore.getState().selectNode(node2);
      });

      const nodes = useWorkflowStore.getState().nodes;
      const node1Updated = nodes.find(n => n.id === 'node-1');
      const node2Updated = nodes.find(n => n.id === 'node-2');

      expect(node1Updated?.selected).toBe(false);
      expect(node2Updated?.selected).toBe(true);
      expect(useWorkflowStore.getState().selectedNode?.id).toBe('node-2');
    });

    it('should handle select null to clear selection', () => {
      const node = { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} };

      act(() => {
        useWorkflowStore.getState().addNode(node);
        useWorkflowStore.getState().selectNode(node);
        useWorkflowStore.getState().selectNode(null);
      });

      expect(useWorkflowStore.getState().selectedNode).toBeNull();
    });

    it('should deselect all nodes', () => {
      const nodes = [
        { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {}, selected: true },
        { id: 'node-2', type: 'finish', position: { x: 100, y: 100 }, data: {}, selected: true },
      ];

      act(() => {
        useWorkflowStore.getState().setNodes(nodes);
        useWorkflowStore.getState().deselectAll();
      });

      const updatedNodes = useWorkflowStore.getState().nodes;
      expect(updatedNodes.every(n => !n.selected)).toBe(true);
      expect(useWorkflowStore.getState().selectedNode).toBeNull();
    });
  });

  describe('Workflow Metadata', () => {
    it('should set workflow ID', () => {
      act(() => {
        useWorkflowStore.getState().setWorkflowId('workflow-123');
      });

      expect(useWorkflowStore.getState().workflowId).toBe('workflow-123');
    });

    it('should set workflow name and mark dirty', () => {
      act(() => {
        useWorkflowStore.getState().setWorkflowName('My Workflow');
      });

      expect(useWorkflowStore.getState().workflowName).toBe('My Workflow');
      expect(useWorkflowStore.getState().isDirty).toBe(true);
    });

    it('should set workflow description and mark dirty', () => {
      act(() => {
        useWorkflowStore.getState().setWorkflowDescription('A description');
      });

      expect(useWorkflowStore.getState().workflowDescription).toBe('A description');
      expect(useWorkflowStore.getState().isDirty).toBe(true);
    });
  });

  describe('Load/Save Operations', () => {
    it('should load workflow from JSON', () => {
      const workflowData = {
        nodes: [
          { id: 'start-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
          { id: 'gen-1', type: 'text_generation', position: { x: 200, y: 0 }, data: { prompt: 'Hello' } },
          { id: 'finish-1', type: 'finish', position: { x: 400, y: 0 }, data: {} },
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'gen-1' },
          { id: 'e2', source: 'gen-1', target: 'finish-1' },
        ],
      };

      act(() => {
        useWorkflowStore.getState().loadWorkflow(workflowData);
      });

      expect(useWorkflowStore.getState().nodes).toHaveLength(3);
      expect(useWorkflowStore.getState().edges).toHaveLength(2);
      expect(useWorkflowStore.getState().selectedNode).toBeNull();
      expect(useWorkflowStore.getState().isDirty).toBe(false);
    });

    it('should convert WorkflowNode to ReactFlow Node format', () => {
      const workflowData = {
        nodes: [
          {
            id: 'node-1',
            type: 'text_generation',
            position: { x: 100, y: 50 },
            data: { label: 'Text Gen', prompt: 'Generate text' },
          },
        ],
        edges: [],
      };

      act(() => {
        useWorkflowStore.getState().loadWorkflow(workflowData);
      });

      const loadedNode = useWorkflowStore.getState().nodes[0];
      expect(loadedNode.id).toBe('node-1');
      expect(loadedNode.type).toBe('text_generation');
      expect(loadedNode.position).toEqual({ x: 100, y: 50 });
      expect(loadedNode.data.label).toBe('Text Gen');
    });

    it('should convert WorkflowEdge to ReactFlow Edge format', () => {
      const workflowData = {
        nodes: [
          { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
          { id: 'node-2', type: 'finish', position: { x: 100, y: 0 }, data: {} },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            sourceHandle: 'output',
            targetHandle: 'input',
            label: 'Next',
            type: 'smoothstep',
          },
        ],
      };

      act(() => {
        useWorkflowStore.getState().loadWorkflow(workflowData);
      });

      const loadedEdge = useWorkflowStore.getState().edges[0];
      expect(loadedEdge.id).toBe('edge-1');
      expect(loadedEdge.source).toBe('node-1');
      expect(loadedEdge.target).toBe('node-2');
      expect(loadedEdge.sourceHandle).toBe('output');
      expect(loadedEdge.targetHandle).toBe('input');
      expect(loadedEdge.label).toBe('Next');
      expect(loadedEdge.type).toBe('smoothstep');
    });

    it('should clear workflow', () => {
      // First load some data
      act(() => {
        useWorkflowStore.getState().setWorkflowId('workflow-123');
        useWorkflowStore.getState().setWorkflowName('Test Workflow');
        useWorkflowStore.getState().addNode({
          id: 'node-1',
          type: 'start',
          position: { x: 0, y: 0 },
          data: {},
        });
      });

      act(() => {
        useWorkflowStore.getState().clearWorkflow();
      });

      const state = useWorkflowStore.getState();
      expect(state.nodes).toEqual([]);
      expect(state.edges).toEqual([]);
      expect(state.selectedNode).toBeNull();
      expect(state.workflowId).toBeNull();
      expect(state.workflowName).toBe('Untitled Workflow');
      expect(state.workflowDescription).toBe('');
      expect(state.isDirty).toBe(false);
    });

    it('should mark workflow as saved', () => {
      act(() => {
        useWorkflowStore.getState().addNode({
          id: 'node-1',
          type: 'start',
          position: { x: 0, y: 0 },
          data: {},
        });
      });

      expect(useWorkflowStore.getState().isDirty).toBe(true);

      act(() => {
        useWorkflowStore.getState().markSaved();
      });

      expect(useWorkflowStore.getState().isDirty).toBe(false);
    });
  });

  describe('Validation Helpers', () => {
    it('should get node by ID', () => {
      const nodes = [
        { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
        { id: 'node-2', type: 'finish', position: { x: 100, y: 100 }, data: { label: 'End' } },
      ];

      act(() => {
        useWorkflowStore.getState().setNodes(nodes);
      });

      const foundNode = useWorkflowStore.getState().getNodeById('node-1');
      expect(foundNode?.data.label).toBe('Start');

      const notFound = useWorkflowStore.getState().getNodeById('non-existent');
      expect(notFound).toBeUndefined();
    });

    it('should get connected nodes (incoming and outgoing)', () => {
      const nodes = [
        { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'node-2', type: 'text_generation', position: { x: 100, y: 0 }, data: {} },
        { id: 'node-3', type: 'finish', position: { x: 200, y: 0 }, data: {} },
      ];
      const edges = [
        { id: 'e1', source: 'node-1', target: 'node-2' },
        { id: 'e2', source: 'node-2', target: 'node-3' },
      ];

      act(() => {
        useWorkflowStore.getState().setNodes(nodes);
        useWorkflowStore.getState().setEdges(edges);
      });

      const connected = useWorkflowStore.getState().getConnectedNodes('node-2');

      expect(connected.incoming).toHaveLength(1);
      expect(connected.incoming[0].id).toBe('node-1');

      expect(connected.outgoing).toHaveLength(1);
      expect(connected.outgoing[0].id).toBe('node-3');
    });

    it('should handle node with no connections', () => {
      const nodes = [
        { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
      ];

      act(() => {
        useWorkflowStore.getState().setNodes(nodes);
      });

      const connected = useWorkflowStore.getState().getConnectedNodes('node-1');

      expect(connected.incoming).toEqual([]);
      expect(connected.outgoing).toEqual([]);
    });

    it('should handle node with multiple incoming edges', () => {
      const nodes = [
        { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'node-2', type: 'text_generation', position: { x: 100, y: -50 }, data: {} },
        { id: 'node-3', type: 'text_generation', position: { x: 100, y: 50 }, data: {} },
        { id: 'node-4', type: 'finish', position: { x: 200, y: 0 }, data: {} },
      ];
      const edges = [
        { id: 'e1', source: 'node-1', target: 'node-2' },
        { id: 'e2', source: 'node-1', target: 'node-3' },
        { id: 'e3', source: 'node-2', target: 'node-4' },
        { id: 'e4', source: 'node-3', target: 'node-4' },
      ];

      act(() => {
        useWorkflowStore.getState().setNodes(nodes);
        useWorkflowStore.getState().setEdges(edges);
      });

      const connected = useWorkflowStore.getState().getConnectedNodes('node-4');

      expect(connected.incoming).toHaveLength(2);
      expect(connected.incoming.map(n => n.id)).toContain('node-2');
      expect(connected.incoming.map(n => n.id)).toContain('node-3');
    });
  });

  describe('ReactFlow Change Handlers', () => {
    it('should apply node changes via onNodesChange', () => {
      const node = { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: {} };

      act(() => {
        useWorkflowStore.getState().addNode(node);
      });

      // Simulate position change
      const positionChange = {
        type: 'position' as const,
        id: 'node-1',
        position: { x: 50, y: 50 },
        dragging: false,
      };

      act(() => {
        useWorkflowStore.getState().onNodesChange([positionChange]);
      });

      const updatedNode = useWorkflowStore.getState().nodes[0];
      expect(updatedNode.position).toEqual({ x: 50, y: 50 });
      expect(useWorkflowStore.getState().isDirty).toBe(true);
    });

    it('should apply edge changes via onEdgesChange', () => {
      const edges = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-2', target: 'node-3' },
      ];

      act(() => {
        useWorkflowStore.getState().setEdges(edges);
      });

      // Simulate edge removal
      const removeChange = {
        type: 'remove' as const,
        id: 'edge-1',
      };

      act(() => {
        useWorkflowStore.getState().onEdgesChange([removeChange]);
      });

      expect(useWorkflowStore.getState().edges).toHaveLength(1);
      expect(useWorkflowStore.getState().edges[0].id).toBe('edge-2');
    });
  });
});
