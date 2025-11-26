"""
Workflow Validator Service

Validates workflow structure, node configurations, and variable references.
Ensures workflows are executable before saving or execution.
"""

from typing import Dict, List, Any, Optional, Tuple
from .variable_resolver import VariableResolver


class WorkflowValidator:
    """Service for validating workflow definitions"""

    # Valid node types (updated for complete workflow system)
    VALID_NODE_TYPES = {
        'start', 'finish', 'text_generation', 'image_generation',
        'conditional', 'loop', 'context_retrieval', 'processing'
    }

    # Required fields per node type
    REQUIRED_FIELDS = {
        'start': {'label'},
        'finish': {'label'},
        'text_generation': {'label', 'prompt', 'model'},
        'image_generation': {'label', 'prompt', 'model'},
        'conditional': {'label', 'condition'},
        'loop': {'label'},  # Must have either 'iterations' or 'condition'
        'context_retrieval': {'label'},
        'processing': {'label', 'prompt', 'model'}
    }

    def __init__(self):
        self.variable_resolver = VariableResolver()

    def validate_workflow_structure(
        self,
        workflow_definition: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate complete workflow structure.

        Performs all validation checks:
        - Has exactly one start node
        - Has at least one finish node
        - All nodes have valid types and required fields
        - All edges reference existing nodes
        - No circular dependencies
        - All variable references are valid

        Args:
            workflow_definition: Dict with 'nodes' and 'edges' arrays

        Returns:
            Dict with validation results:
            {
                "valid": bool,
                "errors": List[str],
                "warnings": List[str]
            }

        Example:
            >>> validator = WorkflowValidator()
            >>> result = validator.validate_workflow_structure(workflow)
            >>> if not result["valid"]:
            ...     print(result["errors"])
        """
        errors = []
        warnings = []

        # Check basic structure
        if 'nodes' not in workflow_definition:
            errors.append("Workflow must have 'nodes' array")
            return {"valid": False, "errors": errors, "warnings": warnings}

        if 'edges' not in workflow_definition:
            errors.append("Workflow must have 'edges' array")
            return {"valid": False, "errors": errors, "warnings": warnings}

        nodes = workflow_definition['nodes']
        edges = workflow_definition['edges']

        # Validate minimum nodes
        if len(nodes) < 2:
            errors.append("Workflow must have at least 2 nodes (start + finish)")

        # Check for exactly one start node
        start_errors = self.check_start_node(nodes)
        errors.extend(start_errors)

        # Check for at least one finish node
        finish_errors = self.check_finish_nodes(nodes)
        errors.extend(finish_errors)

        # Validate each node
        for node in nodes:
            node_errors = self._validate_node(node)
            errors.extend(node_errors)

        # Validate edges
        edge_errors = self._validate_edges(edges, nodes)
        errors.extend(edge_errors)

        # Check for circular dependencies
        try:
            self.variable_resolver.detect_circular_dependencies(workflow_definition)
        except ValueError as e:
            errors.append(str(e))

        # Validate variable references
        var_errors = self.validate_variable_references(workflow_definition)
        errors.extend(var_errors)

        # Check for disconnected nodes (warnings only)
        disconnected = self._find_disconnected_nodes(nodes, edges)
        if disconnected:
            warnings.append(
                f"Disconnected nodes (not reachable from start): {', '.join(disconnected)}"
            )

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

    def check_start_node(self, nodes: List[Dict[str, Any]]) -> List[str]:
        """
        Validate exactly one start node exists.

        Args:
            nodes: List of node dictionaries

        Returns:
            List of error messages (empty if valid)
        """
        start_nodes = [n for n in nodes if n.get('type') == 'start']

        if len(start_nodes) == 0:
            return ["Workflow must have exactly one 'start' node"]
        elif len(start_nodes) > 1:
            return [f"Workflow must have exactly one 'start' node (found {len(start_nodes)})"]

        return []

    def check_finish_nodes(self, nodes: List[Dict[str, Any]]) -> List[str]:
        """
        Validate at least one finish node exists.

        Args:
            nodes: List of node dictionaries

        Returns:
            List of error messages (empty if valid)
        """
        finish_nodes = [n for n in nodes if n.get('type') == 'finish']

        if len(finish_nodes) == 0:
            return ["Workflow must have at least one 'finish' node"]

        return []

    def validate_variable_references(
        self,
        workflow_definition: Dict[str, Any]
    ) -> List[str]:
        """
        Validate all {{variable}} references point to existing nodes.

        Args:
            workflow_definition: Dict with 'nodes' array

        Returns:
            List of error messages (empty if all references valid)
        """
        errors = []
        nodes = workflow_definition.get('nodes', [])
        node_ids = {node['id'] for node in nodes}
        dependencies = self.variable_resolver.extract_dependencies(workflow_definition)

        for node_id, deps in dependencies.items():
            for dep_node in deps:
                if dep_node not in node_ids:
                    errors.append(
                        f"Node '{node_id}' references non-existent node '{dep_node}' "
                        f"in variable {{{{'{dep_node}'.*}}}}"
                    )

        return errors

    def _validate_node(self, node: Dict[str, Any]) -> List[str]:
        """Validate individual node configuration"""
        errors = []
        node_id = node.get('id', 'unknown')

        # Check required fields
        if 'id' not in node:
            errors.append("Node missing 'id' field")
            return errors

        if 'type' not in node:
            errors.append(f"Node '{node_id}' missing 'type' field")
            return errors

        if 'data' not in node:
            errors.append(f"Node '{node_id}' missing 'data' field")
            return errors

        if 'position' not in node:
            errors.append(f"Node '{node_id}' missing 'position' field")

        # Validate node type
        node_type = node['type']
        if node_type not in self.VALID_NODE_TYPES:
            errors.append(
                f"Node '{node_id}' has invalid type '{node_type}'. "
                f"Valid types: {', '.join(self.VALID_NODE_TYPES)}"
            )
            return errors

        # Validate required fields for node type
        required_fields = self.REQUIRED_FIELDS.get(node_type, set())
        node_data = node.get('data', {})

        for field in required_fields:
            if field not in node_data:
                errors.append(
                    f"Node '{node_id}' (type: {node_type}) missing required field '{field}'"
                )

        # Special validation for loop nodes
        if node_type == 'loop':
            if 'iterations' not in node_data and 'condition' not in node_data:
                errors.append(
                    f"Loop node '{node_id}' must have either 'iterations' or 'condition'"
                )

        # Validate position
        position = node.get('position', {})
        if 'x' not in position or 'y' not in position:
            errors.append(f"Node '{node_id}' position must have 'x' and 'y' coordinates")

        return errors

    def _validate_edges(
        self,
        edges: List[Dict[str, Any]],
        nodes: List[Dict[str, Any]]
    ) -> List[str]:
        """Validate edges reference existing nodes"""
        errors = []
        node_ids = {node['id'] for node in nodes}

        for i, edge in enumerate(edges):
            edge_id = edge.get('id', f'edge-{i}')

            # Check required fields
            if 'source' not in edge:
                errors.append(f"Edge '{edge_id}' missing 'source' field")
                continue

            if 'target' not in edge:
                errors.append(f"Edge '{edge_id}' missing 'target' field")
                continue

            # Validate source and target exist
            source = edge['source']
            target = edge['target']

            if source not in node_ids:
                errors.append(
                    f"Edge '{edge_id}' references non-existent source node '{source}'"
                )

            if target not in node_ids:
                errors.append(
                    f"Edge '{edge_id}' references non-existent target node '{target}'"
                )

        return errors

    def _find_disconnected_nodes(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> List[str]:
        """Find nodes not reachable from start node"""
        if not nodes:
            return []

        # Find start node
        start_nodes = [n for n in nodes if n.get('type') == 'start']
        if not start_nodes:
            return []

        start_id = start_nodes[0]['id']

        # Build adjacency list
        graph = {node['id']: [] for node in nodes}
        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            if source and target:
                graph[source].append(target)

        # BFS from start node
        visited = set()
        queue = [start_id]
        visited.add(start_id)

        while queue:
            current = queue.pop(0)
            for neighbor in graph.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

        # Find unvisited nodes
        all_node_ids = {node['id'] for node in nodes}
        disconnected = all_node_ids - visited

        return sorted(list(disconnected))

    def validate_template(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Tuple[bool, str]:
        """
        Legacy method for backward compatibility.
        Validates workflow and returns (is_valid, message) tuple.
        """
        workflow_def = {"nodes": nodes, "edges": edges}
        result = self.validate_workflow_structure(workflow_def)

        if result["valid"]:
            return True, "Workflow is valid"
        else:
            error_msg = "; ".join(result["errors"])
            return False, error_msg
