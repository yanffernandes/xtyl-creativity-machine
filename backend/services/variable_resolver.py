"""
Variable Resolver Service

Handles parsing and resolution of {{variable}} references in workflow prompts.
Implements topological sort for dependency-based execution ordering.
"""

import re
from typing import List, Tuple, Dict, Set, Any
from collections import defaultdict, deque


class VariableResolver:
    """Service for parsing and resolving workflow variables"""

    # Regex pattern for {{node_name.field_name}} syntax
    VARIABLE_PATTERN = re.compile(r'\{\{([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_]+)\}\}')

    def parse_variables(self, text: str) -> List[Tuple[str, str]]:
        """
        Extract variable references from text.

        Args:
            text: String containing {{variable}} references

        Returns:
            List of (node_name, field_name) tuples

        Example:
            >>> resolver = VariableResolver()
            >>> resolver.parse_variables("Use {{headline.title}} and {{logo.image_url}}")
            [('headline', 'title'), ('logo', 'image_url')]
        """
        if not text:
            return []

        return self.VARIABLE_PATTERN.findall(text)

    def resolve_variables(
        self,
        text: str,
        execution_context: Dict[str, Dict[str, Any]]
    ) -> str:
        """
        Replace {{variable}} references with actual values from execution context.

        Args:
            text: String containing {{variable}} references
            execution_context: Dict mapping node names to their output fields
                Example: {
                    "headline": {"title": "Summer Sale", "content": "..."},
                    "logo": {"image_url": "https://..."}
                }

        Returns:
            String with variables replaced by actual values

        Raises:
            ValueError: If referenced node or field doesn't exist

        Example:
            >>> context = {"headline": {"title": "Summer Sale"}}
            >>> resolver.resolve_variables("Title: {{headline.title}}", context)
            "Title: Summer Sale"
        """
        if not text:
            return text

        def replacer(match):
            node_name = match.group(1)
            field_name = match.group(2)

            # Check if node exists in context
            if node_name not in execution_context:
                raise ValueError(
                    f"Node '{node_name}' not found in execution context. "
                    f"Available nodes: {list(execution_context.keys())}"
                )

            node_output = execution_context[node_name]

            # Check if field exists in node output
            if field_name not in node_output:
                raise ValueError(
                    f"Field '{field_name}' not found in node '{node_name}'. "
                    f"Available fields: {list(node_output.keys())}"
                )

            # Return string representation of value
            return str(node_output[field_name])

        return self.VARIABLE_PATTERN.sub(replacer, text)

    def extract_dependencies(
        self,
        workflow_definition: Dict[str, Any]
    ) -> Dict[str, Set[str]]:
        """
        Extract variable dependencies from workflow definition.

        Args:
            workflow_definition: Dict with 'nodes' array

        Returns:
            Dict mapping each node ID to set of node IDs it depends on

        Example:
            If node "textgen-2" has prompt "Use {{headline.title}}"
            Returns: {"textgen-2": {"headline"}}
        """
        dependencies = defaultdict(set)
        nodes = workflow_definition.get('nodes', [])

        for node in nodes:
            node_id = node['id']
            node_data = node.get('data', {})

            # Check all string fields in node data for variable references
            for key, value in node_data.items():
                if isinstance(value, str):
                    variables = self.parse_variables(value)
                    for node_name, _ in variables:
                        dependencies[node_id].add(node_name)

        return dict(dependencies)

    def detect_circular_dependencies(
        self,
        workflow_definition: Dict[str, Any]
    ) -> List[str]:
        """
        Detect circular dependencies in workflow variable references.

        Args:
            workflow_definition: Dict with 'nodes' and 'edges' arrays

        Returns:
            List of node IDs involved in circular dependencies (empty if none)

        Raises:
            ValueError: If circular dependency detected (includes cycle path)

        Example:
            If Node A references {{B.field}} and Node B references {{A.field}}
            Raises: ValueError("Circular dependency detected: A -> B -> A")
        """
        dependencies = self.extract_dependencies(workflow_definition)
        nodes = {node['id'] for node in workflow_definition.get('nodes', [])}

        # Build reverse dependency graph
        visited = set()
        rec_stack = set()
        cycle_path = []

        def has_cycle(node_id: str, path: List[str]) -> bool:
            """DFS to detect cycles"""
            visited.add(node_id)
            rec_stack.add(node_id)
            path.append(node_id)

            # Check all dependencies of current node
            for dep in dependencies.get(node_id, []):
                if dep not in visited:
                    if has_cycle(dep, path):
                        return True
                elif dep in rec_stack:
                    # Cycle found - extract cycle path
                    cycle_start = path.index(dep)
                    cycle_path.extend(path[cycle_start:] + [dep])
                    return True

            path.pop()
            rec_stack.remove(node_id)
            return False

        # Check each node for cycles
        for node_id in nodes:
            if node_id not in visited:
                if has_cycle(node_id, []):
                    cycle_str = " -> ".join(cycle_path)
                    raise ValueError(
                        f"Circular dependency detected: {cycle_str}"
                    )

        return []

    def build_execution_order(
        self,
        workflow_definition: Dict[str, Any]
    ) -> List[str]:
        """
        Build topological execution order based on edges and variable dependencies.

        Uses Kahn's algorithm for topological sort, considering both:
        1. Explicit edges in workflow definition
        2. Implicit dependencies from variable references

        Args:
            workflow_definition: Dict with 'nodes' and 'edges' arrays

        Returns:
            List of node IDs in execution order

        Raises:
            ValueError: If circular dependency detected

        Example:
            >>> workflow = {
            ...     "nodes": [{"id": "start-1"}, {"id": "text-2"}, {"id": "finish-3"}],
            ...     "edges": [{"source": "start-1", "target": "text-2"}, ...]
            ... }
            >>> resolver.build_execution_order(workflow)
            ["start-1", "text-2", "finish-3"]
        """
        # First check for circular dependencies
        self.detect_circular_dependencies(workflow_definition)

        nodes = {node['id']: node for node in workflow_definition.get('nodes', [])}
        edges = workflow_definition.get('edges', [])
        var_dependencies = self.extract_dependencies(workflow_definition)

        # Build adjacency list and in-degree map
        graph = defaultdict(list)
        in_degree = defaultdict(int)

        # Initialize all nodes with 0 in-degree
        for node_id in nodes:
            in_degree[node_id] = 0

        # Add edges from workflow definition
        for edge in edges:
            source = edge['source']
            target = edge['target']
            graph[source].append(target)
            in_degree[target] += 1

        # Add implicit edges from variable dependencies
        for node_id, deps in var_dependencies.items():
            for dep in deps:
                if dep in nodes:  # Only add if dependency node exists
                    graph[dep].append(node_id)
                    in_degree[node_id] += 1

        # Kahn's algorithm for topological sort
        queue = deque([node_id for node_id in nodes if in_degree[node_id] == 0])
        execution_order = []

        while queue:
            node_id = queue.popleft()
            execution_order.append(node_id)

            # Reduce in-degree for neighbors
            for neighbor in graph[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # Verify all nodes were processed
        if len(execution_order) != len(nodes):
            raise ValueError(
                f"Circular dependency detected. "
                f"Processed {len(execution_order)} of {len(nodes)} nodes. "
                f"Unprocessed: {set(nodes.keys()) - set(execution_order)}"
            )

        return execution_order
