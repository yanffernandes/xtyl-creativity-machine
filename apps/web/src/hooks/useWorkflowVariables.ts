/**
 * useWorkflowVariables Hook
 *
 * Provides available variables from workflow nodes for autocomplete.
 * Extracts variables from node outputs and provides helper functions.
 */

import { useMemo } from "react";
import { Node } from "reactflow";

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

/**
 * Get available output fields for a node type
 */
function getNodeOutputFields(nodeType: string): string[] {
  const fieldMap: Record<string, string[]> = {
    start: ["content"], // Start node passes through input variables
    text_generation: ["content", "title", "summary", "body"], // Structured outputs
    image_generation: ["url", "prompt", "size"],
    processing: ["content", "result"],
    context_retrieval: ["documents", "count"],
    conditional: ["result", "branch"],
    loop: ["iteration", "results"],
  };

  return fieldMap[nodeType] || ["content"];
}

/**
 * Hook to get available variables from workflow nodes
 */
export function useWorkflowVariables(
  nodes: Node[],
  edges: Array<{ source: string; target: string }>,
  currentNodeId?: string
): UseWorkflowVariablesReturn {
  // Get all nodes that can provide variables (before current node)
  const availableVariables = useMemo((): VariableOption[] => {
    if (!currentNodeId) {
      // If no current node, return all nodes except start/finish
      return nodes
        .filter((node) => node.type !== "start" && node.type !== "finish")
        .map((node) => ({
          nodeId: node.id,
          nodeName: node.data.label || node.id,
          nodeType: node.type || "unknown",
          fields: getNodeOutputFields(node.type || ""),
        }));
    }

    // Build dependency graph to find nodes before current
    const nodesBefore = new Set<string>();
    const visited = new Set<string>();

    function traverse(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Find all edges pointing to this node
      edges.forEach((edge) => {
        if (edge.target === nodeId && edge.source !== currentNodeId) {
          nodesBefore.add(edge.source);
          traverse(edge.source);
        }
      });
    }

    traverse(currentNodeId);

    // Convert to VariableOption array
    return Array.from(nodesBefore)
      .map((nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return null;

        return {
          nodeId: node.id,
          nodeName: node.data.label || node.id,
          nodeType: node.type || "unknown",
          fields: getNodeOutputFields(node.type || ""),
        };
      })
      .filter((v): v is VariableOption => v !== null);
  }, [nodes, edges, currentNodeId]);

  // Helper to get fields for a specific node type
  const getVariableFields = (nodeType: string): string[] => {
    return getNodeOutputFields(nodeType);
  };

  // Helper to get nodes before a specific node
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
          nodeName: node.data.label || node.id,
          nodeType: node.type || "unknown",
          fields: getNodeOutputFields(node.type || ""),
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
