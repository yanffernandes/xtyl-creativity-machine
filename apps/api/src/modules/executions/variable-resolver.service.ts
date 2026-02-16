import { Injectable, Logger } from '@nestjs/common';

/**
 * VariableResolverService resolves {{nodeId.field}} references in workflow configurations.
 *
 * Ported from backend/services/variable_resolver.py.
 *
 * Variables allow workflow nodes to reference outputs from upstream nodes:
 * - "Generate an image based on {{text_gen.content}}"
 * - "Use the summary from {{context_retrieval.context}}"
 *
 * The resolver recursively processes strings, arrays, and objects.
 */
@Injectable()
export class VariableResolverService {
  private readonly logger = new Logger(VariableResolverService.name);

  /**
   * Resolve {{nodeId.field}} variables in a template string.
   *
   * @param template String containing variable references
   * @param context  Map of nodeId → outputs
   * @returns        Resolved string with variables replaced
   *
   * @example
   * resolve("Use {{node1.content}}", { node1: { content: "hello" } })
   * // returns "Use hello"
   */
  resolve(
    template: string,
    context: Record<string, Record<string, any>>,
  ): string {
    return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, nodeId, field) => {
      const nodeOutput = context[nodeId];
      if (!nodeOutput || nodeOutput[field] === undefined) {
        this.logger.warn(
          `Variable not found: ${match}, available nodes: ${Object.keys(context).join(', ')}`,
        );
        return match; // Keep original if not found
      }
      return String(nodeOutput[field]);
    });
  }

  /**
   * Recursively resolve variables in an object, array, or string.
   *
   * @param obj     Any value (string, array, object, primitive)
   * @param context Map of nodeId → outputs
   * @returns       Resolved value with all variables replaced
   *
   * @example
   * resolveObject({ prompt: "{{node1.content}}", count: 5 }, context)
   * // returns { prompt: "actual content", count: 5 }
   */
  resolveObject(obj: any, context: Record<string, Record<string, any>>): any {
    if (typeof obj === 'string') {
      return this.resolve(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.resolveObject(item, context));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.resolveObject(value, context);
      }
      return result;
    }

    return obj;
  }

  /**
   * Build execution order via topological sort of workflow nodes.
   *
   * @param nodes Array of workflow nodes
   * @param edges Array of workflow edges (connections)
   * @returns     Array of node IDs in execution order
   */
  buildExecutionOrder(
    nodes: Array<{ id: string; type: string }>,
    edges: Array<{ source: string; target: string }>,
  ): string[] {
    // Build adjacency list
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize all nodes
    for (const node of nodes) {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    // Build edges
    for (const edge of edges) {
      graph.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }

    // Topological sort (Kahn's algorithm)
    const queue: string[] = [];
    const result: string[] = [];

    // Start with nodes that have no incoming edges
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      // Process neighbors
      for (const neighbor of graph.get(nodeId) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check for cycles
    if (result.length !== nodes.length) {
      this.logger.error('Workflow contains cycles or disconnected nodes');
      throw new Error('Invalid workflow: contains cycles or disconnected nodes');
    }

    return result;
  }

  /**
   * Resolve variables in a node's data configuration.
   *
   * This is the main entry point for resolving a node before execution.
   * It handles both string replacement and special cases (like attach nodes).
   *
   * @param node    Node to resolve
   * @param context Execution context with node outputs
   * @returns       Resolved node with variables replaced
   */
  resolveNodeVariables(
    node: { id: string; type: string; data?: Record<string, any> },
    context: Record<string, Record<string, any>>,
  ): { id: string; type: string; data?: Record<string, any> } {
    if (!node.data) return node;

    const resolvedData = this.resolveObject(node.data, context);

    return {
      ...node,
      data: resolvedData,
    };
  }
}
