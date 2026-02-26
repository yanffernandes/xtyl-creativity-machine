/**
 * Workflow Store (Zustand)
 *
 * Global state management for workflow editor.
 * Manages nodes, edges, and editor state for ReactFlow integration.
 */

import { create } from 'zustand';
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
} from 'reactflow';
import { WorkflowNode, WorkflowEdge } from '../workflow-schema';

interface WorkflowState {
  // Workflow data
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  workflowId: string | null;
  workflowName: string;
  workflowDescription: string;
  isDirty: boolean; // Has unsaved changes

  // Node/Edge operations
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;

  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: any) => void;

  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;

  // Selection
  selectNode: (node: Node | null) => void;
  deselectAll: () => void;

  // Workflow metadata
  setWorkflowId: (id: string) => void;
  setWorkflowName: (name: string) => void;
  setWorkflowDescription: (description: string) => void;

  // Load/save
  loadWorkflow: (workflow: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) => void;
  clearWorkflow: () => void;
  markSaved: () => void;

  // Validation helpers
  getNodeById: (nodeId: string) => Node | undefined;
  getConnectedNodes: (nodeId: string) => { incoming: Node[]; outgoing: Node[] };
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNode: null,
  workflowId: null,
  workflowName: 'Untitled Workflow',
  workflowDescription: '',
  isDirty: false,

  // ReactFlow change handlers
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      isDirty: true,
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
      isDirty: true,
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
      isDirty: true,
    });
  },

  // Node operations
  setNodes: (nodes) => set({ nodes }),

  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
      isDirty: true,
    });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNode: get().selectedNode?.id === nodeId ? null : get().selectedNode,
      isDirty: true,
    });
  },

  updateNodeData: (nodeId, data) => {
    const nodes = get().nodes.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, ...data } }
        : node
    );

    // Also update selectedNode if it's the one being modified
    const selectedNode = get().selectedNode;
    const newSelectedNode = selectedNode?.id === nodeId
      ? nodes.find(n => n.id === nodeId) || null
      : selectedNode;

    set({
      nodes,
      selectedNode: newSelectedNode,
      isDirty: true,
    });
  },

  // Edge operations
  setEdges: (edges) => set({ edges }),

  addEdge: (edge) => {
    set({
      edges: [...get().edges, edge],
      isDirty: true,
    });
  },

  removeEdge: (edgeId) => {
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
      isDirty: true,
    });
  },

  // Selection
  selectNode: (node) => {
    // Deselect all nodes first
    const updatedNodes = get().nodes.map((n) => ({
      ...n,
      selected: false,
    }));

    // Select the target node
    if (node) {
      const index = updatedNodes.findIndex((n) => n.id === node.id);
      if (index >= 0) {
        updatedNodes[index] = { ...updatedNodes[index], selected: true };
      }
    }

    set({
      nodes: updatedNodes,
      selectedNode: node,
    });
  },

  deselectAll: () => {
    set({
      nodes: get().nodes.map((n) => ({ ...n, selected: false })),
      selectedNode: null,
    });
  },

  // Workflow metadata
  setWorkflowId: (id) => set({ workflowId: id }),

  setWorkflowName: (name) =>
    set({
      workflowName: name,
      isDirty: true,
    }),

  setWorkflowDescription: (description) =>
    set({
      workflowDescription: description,
      isDirty: true,
    }),

  // Load/save
  loadWorkflow: (workflow) => {
    // Convert WorkflowNode[] to ReactFlow Node[]
    const nodes: Node[] = workflow.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    }));

    // Convert WorkflowEdge[] to ReactFlow Edge[]
    const edges: Edge[] = workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
      type: edge.type || 'smoothstep',
    }));

    set({
      nodes,
      edges,
      selectedNode: null,
      isDirty: false,
    });
  },

  clearWorkflow: () => {
    set({
      nodes: [],
      edges: [],
      selectedNode: null,
      workflowId: null,
      workflowName: 'Untitled Workflow',
      workflowDescription: '',
      isDirty: false,
    });
  },

  markSaved: () => {
    set({ isDirty: false });
  },

  // Validation helpers
  getNodeById: (nodeId) => {
    return get().nodes.find((n) => n.id === nodeId);
  },

  getConnectedNodes: (nodeId) => {
    const edges = get().edges;
    const nodes = get().nodes;

    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const outgoingEdges = edges.filter((e) => e.source === nodeId);

    const incoming = incomingEdges
      .map((e) => nodes.find((n) => n.id === e.source))
      .filter((n): n is Node => n !== undefined);

    const outgoing = outgoingEdges
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n): n is Node => n !== undefined);

    return { incoming, outgoing };
  },
}));
