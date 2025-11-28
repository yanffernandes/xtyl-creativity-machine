import { useMemo } from "react";
import { useWorkflowStore } from "@/lib/stores/workflowStore";
import { Node } from "reactflow";

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
        const visited = new Set<string>();
        const queue = [currentNodeId];

        // Find all upstream nodes
        const upstreamNodes = new Set<string>();

        // Simple BFS to find all ancestors
        // Note: In a real graph, we should traverse edges in reverse from target to source
        const incomingEdges = edges.filter(e => e.target === currentNodeId);
        const directAncestors = incomingEdges.map(e => e.source);

        // For now, let's just get all nodes that are "before" this one in the graph
        // Or simpler: get all nodes except this one and successors
        // But correct way is to traverse upstream.

        // Helper to get ancestors
        const getAncestors = (nodeId: string, ancestors: Set<string>) => {
            const incoming = edges.filter(e => e.target === nodeId);
            for (const edge of incoming) {
                if (!ancestors.has(edge.source)) {
                    ancestors.add(edge.source);
                    getAncestors(edge.source, ancestors);
                }
            }
        };

        getAncestors(currentNodeId, upstreamNodes);

        // Generate variables for each upstream node
        upstreamNodes.forEach(nodeId => {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return;

            const nodeLabel = node.data.label || node.type;
            const prefix = node.data.label ? node.data.label.replace(/\s+/g, '_').toLowerCase() : node.id;
            // Use node ID or sanitized label as variable prefix? 
            // Backend resolver uses node ID usually, or we need a mapping.
            // Let's assume we use node ID for now as it's unique, but label is friendlier.
            // The backend resolver `{{node_name.field}}` usually refers to node ID or a "name" field.
            // Our nodes don't have a unique "name" slug, just ID and Label.
            // Let's use ID for correctness, but maybe display Label.
            // Or we should add a "variableName" field to nodes.
            // For this implementation, I'll use the node ID as the reference key.

            const safeId = node.id; // In real app, might want a user-friendly slug

            // Generate variables based on node type and backend output fields
            switch (node.type) {
                case "start":
                    variables.push({
                        label: `${nodeLabel} - Input Variables`,
                        value: `{{${safeId}.input_variables}}`,
                        type: "json",
                        nodeId: node.id,
                        nodeLabel
                    });
                    break;

                case "text_generation":
                    variables.push({
                        label: `${nodeLabel} - Generated Text`,
                        value: `{{${safeId}.content}}`,
                        type: "text",
                        nodeId: node.id,
                        nodeLabel
                    });
                    variables.push({
                        label: `${nodeLabel} - Title`,
                        value: `{{${safeId}.title}}`,
                        type: "text",
                        nodeId: node.id,
                        nodeLabel
                    });
                    break;

                case "image_generation":
                    variables.push({
                        label: `${nodeLabel} - Image URL`,
                        value: `{{${safeId}.file_url}}`,
                        type: "url",
                        nodeId: node.id,
                        nodeLabel
                    });
                    variables.push({
                        label: `${nodeLabel} - Thumbnail URL`,
                        value: `{{${safeId}.thumbnail_url}}`,
                        type: "url",
                        nodeId: node.id,
                        nodeLabel
                    });
                    variables.push({
                        label: `${nodeLabel} - Title`,
                        value: `{{${safeId}.title}}`,
                        type: "text",
                        nodeId: node.id,
                        nodeLabel
                    });
                    variables.push({
                        label: `${nodeLabel} - Prompt Used`,
                        value: `{{${safeId}.prompt}}`,
                        type: "text",
                        nodeId: node.id,
                        nodeLabel
                    });
                    break;

                case "context_retrieval":
                    variables.push({
                        label: `${nodeLabel} - Retrieved Context`,
                        value: `{{${safeId}.context}}`,
                        type: "text",
                        nodeId: node.id,
                        nodeLabel
                    });
                    variables.push({
                        label: `${nodeLabel} - Content`,
                        value: `{{${safeId}.content}}`,
                        type: "text",
                        nodeId: node.id,
                        nodeLabel
                    });
                    variables.push({
                        label: `${nodeLabel} - Documents`,
                        value: `{{${safeId}.documents}}`,
                        type: "array",
                        nodeId: node.id,
                        nodeLabel
                    });
                    variables.push({
                        label: `${nodeLabel} - Document Count`,
                        value: `{{${safeId}.count}}`,
                        type: "number",
                        nodeId: node.id,
                        nodeLabel
                    });
                    break;

                case "processing":
                    variables.push({
                        label: `${nodeLabel} - Output`,
                        value: `{{${safeId}.content}}`,
                        type: "text",
                        nodeId: node.id,
                        nodeLabel
                    });
                    variables.push({
                        label: `${nodeLabel} - Title`,
                        value: `{{${safeId}.title}}`,
                        type: "text",
                        nodeId: node.id,
                        nodeLabel
                    });
                    break;

                case "loop":
                    variables.push({
                        label: `${nodeLabel} - Current Item`,
                        value: `{{${safeId}.item}}`,
                        type: "any",
                        nodeId: node.id,
                        nodeLabel
                    });
                    variables.push({
                        label: `${nodeLabel} - Current Index`,
                        value: `{{${safeId}.current_iteration}}`,
                        type: "number",
                        nodeId: node.id,
                        nodeLabel
                    });
                    variables.push({
                        label: `${nodeLabel} - Total Iterations`,
                        value: `{{${safeId}.iterations}}`,
                        type: "number",
                        nodeId: node.id,
                        nodeLabel
                    });
                    break;

                case "conditional":
                    variables.push({
                        label: `${nodeLabel} - Result`,
                        value: `{{${safeId}.result}}`,
                        type: "boolean",
                        nodeId: node.id,
                        nodeLabel
                    });
                    variables.push({
                        label: `${nodeLabel} - Branch Taken`,
                        value: `{{${safeId}.branch}}`,
                        type: "text",
                        nodeId: node.id,
                        nodeLabel
                    });
                    break;
            }
        });

        return variables;
    }, [nodes, edges, currentNodeId]);

    return availableVariables;
}
