import { useMemo } from 'react';
import type { Node } from 'reactflow';

interface VariableOption {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  fields: string[];
}

interface UseWorkflowVariablesReturn {
  availableVariables: VariableOption[];
  getVariableFields: (nodeType: string) => string[];
  getNodesBeforeCurrent: (currentNodeId: string) => VariableOption[];
}

function getNodeOutputFields(nodeType: string): string[] {
  const fieldMap: Record<string, string[]> = {
    start: ['content'],
    text_generation: ['content', 'title', 'summary', 'body'],
    image_generation: ['url', 'prompt', 'size'],
    processing: ['content', 'result'],
    context_retrieval: ['documents', 'count'],
    conditional: ['result', 'branch'],
    loop: ['iteration', 'results'],
  };
  return fieldMap[nodeType] || ['content'];
}

export function useWorkflowVariables(
  nodes: Node[],
  edges: Array<{ source: string; target: string }>,
  currentNodeId?: string,
): UseWorkflowVariablesReturn {
  const availableVariables = useMemo((): VariableOption[] => {
    if (!currentNodeId) {
      return nodes
        .filter((node) => node.type !== 'start' && node.type !== 'finish')
        .map((node) => ({
          nodeId: node.id,
          nodeName: (node.data.label as string) || node.id,
          nodeType: node.type || 'unknown',
          fields: getNodeOutputFields(node.type || ''),
        }));
    }

    const nodesBefore = new Set<string>();
    const visited = new Set<string>();

    function traverse(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      edges.forEach((edge) => {
        if (edge.target === nodeId && edge.source !== currentNodeId) {
          nodesBefore.add(edge.source);
          traverse(edge.source);
        }
      });
    }

    traverse(currentNodeId);

    return Array.from(nodesBefore)
      .map((nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return null;
        return {
          nodeId: node.id,
          nodeName: (node.data.label as string) || node.id,
          nodeType: node.type || 'unknown',
          fields: getNodeOutputFields(node.type || ''),
        };
      })
      .filter((v): v is VariableOption => v !== null);
  }, [nodes, edges, currentNodeId]);

  const getVariableFields = (nodeType: string): string[] => {
    return getNodeOutputFields(nodeType);
  };

  const getNodesBeforeCurrent = (targetNodeId: string): VariableOption[] => {
    const nodesBefore = new Set<string>();
    const visited = new Set<string>();

    function traverse(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      edges.forEach((edge) => {
        if (edge.target === nodeId) {
          nodesBefore.add(edge.source);
          traverse(edge.source);
        }
      });
    }

    traverse(targetNodeId);

    return Array.from(nodesBefore)
      .map((nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return null;
        return {
          nodeId: node.id,
          nodeName: (node.data.label as string) || node.id,
          nodeType: node.type || 'unknown',
          fields: getNodeOutputFields(node.type || ''),
        };
      })
      .filter((v): v is VariableOption => v !== null);
  };

  return {
    availableVariables,
    getVariableFields,
    getNodesBeforeCurrent,
  };
}
