import { useMemo } from 'react';
import { useWorkflowStore } from '@/lib/stores/workflowStore';

export interface VariableOption {
  label: string;
  value: string;
  type: string;
  nodeId: string;
  nodeLabel: string;
}

export function useVariableAutocomplete(currentNodeId: string) {
  const { nodes, edges } = useWorkflowStore();

  const availableVariables = useMemo(() => {
    const variables: VariableOption[] = [];
    const upstreamNodes = new Set<string>();

    const getAncestors = (nodeId: string, ancestors: Set<string>) => {
      const incoming = edges.filter((e) => e.target === nodeId);
      for (const edge of incoming) {
        if (!ancestors.has(edge.source)) {
          ancestors.add(edge.source);
          getAncestors(edge.source, ancestors);
        }
      }
    };

    getAncestors(currentNodeId, upstreamNodes);

    upstreamNodes.forEach((nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const nodeLabel = (node.data.label as string) || node.type || 'Node';
      const safeId = node.id;

      switch (node.type) {
        case 'start':
          variables.push({
            label: `${nodeLabel} - Input Variables`,
            value: `{{${safeId}.input_variables}}`,
            type: 'json',
            nodeId: node.id,
            nodeLabel,
          });
          break;
        case 'text_generation':
          variables.push(
            {
              label: `${nodeLabel} - Generated Text`,
              value: `{{${safeId}.content}}`,
              type: 'text',
              nodeId: node.id,
              nodeLabel,
            },
            {
              label: `${nodeLabel} - Title`,
              value: `{{${safeId}.title}}`,
              type: 'text',
              nodeId: node.id,
              nodeLabel,
            },
          );
          break;
        case 'image_generation':
          variables.push(
            {
              label: `${nodeLabel} - Image URL`,
              value: `{{${safeId}.file_url}}`,
              type: 'url',
              nodeId: node.id,
              nodeLabel,
            },
            {
              label: `${nodeLabel} - Thumbnail URL`,
              value: `{{${safeId}.thumbnail_url}}`,
              type: 'url',
              nodeId: node.id,
              nodeLabel,
            },
            {
              label: `${nodeLabel} - Title`,
              value: `{{${safeId}.title}}`,
              type: 'text',
              nodeId: node.id,
              nodeLabel,
            },
            {
              label: `${nodeLabel} - Prompt Used`,
              value: `{{${safeId}.prompt}}`,
              type: 'text',
              nodeId: node.id,
              nodeLabel,
            },
          );
          break;
        case 'context_retrieval':
          variables.push(
            {
              label: `${nodeLabel} - Retrieved Context`,
              value: `{{${safeId}.context}}`,
              type: 'text',
              nodeId: node.id,
              nodeLabel,
            },
            {
              label: `${nodeLabel} - Content`,
              value: `{{${safeId}.content}}`,
              type: 'text',
              nodeId: node.id,
              nodeLabel,
            },
            {
              label: `${nodeLabel} - Documents`,
              value: `{{${safeId}.documents}}`,
              type: 'array',
              nodeId: node.id,
              nodeLabel,
            },
            {
              label: `${nodeLabel} - Document Count`,
              value: `{{${safeId}.count}}`,
              type: 'number',
              nodeId: node.id,
              nodeLabel,
            },
          );
          break;
        case 'processing':
          variables.push(
            {
              label: `${nodeLabel} - Output`,
              value: `{{${safeId}.content}}`,
              type: 'text',
              nodeId: node.id,
              nodeLabel,
            },
            {
              label: `${nodeLabel} - Title`,
              value: `{{${safeId}.title}}`,
              type: 'text',
              nodeId: node.id,
              nodeLabel,
            },
          );
          break;
        case 'loop':
          variables.push(
            {
              label: `${nodeLabel} - Current Item`,
              value: `{{${safeId}.item}}`,
              type: 'any',
              nodeId: node.id,
              nodeLabel,
            },
            {
              label: `${nodeLabel} - Current Index`,
              value: `{{${safeId}.current_iteration}}`,
              type: 'number',
              nodeId: node.id,
              nodeLabel,
            },
            {
              label: `${nodeLabel} - Total Iterations`,
              value: `{{${safeId}.iterations}}`,
              type: 'number',
              nodeId: node.id,
              nodeLabel,
            },
          );
          break;
        case 'conditional':
          variables.push(
            {
              label: `${nodeLabel} - Result`,
              value: `{{${safeId}.result}}`,
              type: 'boolean',
              nodeId: node.id,
              nodeLabel,
            },
            {
              label: `${nodeLabel} - Branch Taken`,
              value: `{{${safeId}.branch}}`,
              type: 'text',
              nodeId: node.id,
              nodeLabel,
            },
          );
          break;
      }
    });

    return variables;
  }, [nodes, edges, currentNodeId]);

  return availableVariables;
}
