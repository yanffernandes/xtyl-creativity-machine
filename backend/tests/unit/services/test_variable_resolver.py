"""
Unit tests for the Variable Resolver service.

Tests the parsing and resolution of {{variable}} references in workflow prompts,
dependency extraction, circular dependency detection, and execution order building.
"""

import pytest
from services.variable_resolver import VariableResolver


class TestVariableResolverParsing:
    """Tests for variable parsing functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.resolver = VariableResolver()

    def test_parse_single_variable(self):
        """Should parse a single variable reference."""
        text = "Use {{headline.title}} in your response"
        result = self.resolver.parse_variables(text)

        assert result == [("headline", "title")]

    def test_parse_multiple_variables(self):
        """Should parse multiple variable references."""
        text = "Use {{headline.title}} and {{logo.image_url}} together"
        result = self.resolver.parse_variables(text)

        assert result == [("headline", "title"), ("logo", "image_url")]

    def test_parse_no_variables(self):
        """Should return empty list when no variables present."""
        text = "No variables here"
        result = self.resolver.parse_variables(text)

        assert result == []

    def test_parse_empty_string(self):
        """Should handle empty string."""
        result = self.resolver.parse_variables("")

        assert result == []

    def test_parse_none_input(self):
        """Should handle None input."""
        result = self.resolver.parse_variables(None)

        assert result == []

    def test_parse_variable_with_numbers(self):
        """Should parse variables with numbers in names."""
        text = "Use {{node_1.field_2}}"
        result = self.resolver.parse_variables(text)

        assert result == [("node_1", "field_2")]

    def test_parse_variable_with_hyphens(self):
        """Should parse variables with hyphens in node names."""
        text = "Use {{text-gen-1.content}}"
        result = self.resolver.parse_variables(text)

        assert result == [("text-gen-1", "content")]

    def test_parse_duplicate_variables(self):
        """Should return all occurrences including duplicates."""
        text = "{{headline.title}} and again {{headline.title}}"
        result = self.resolver.parse_variables(text)

        assert result == [("headline", "title"), ("headline", "title")]

    def test_parse_invalid_format_not_matched(self):
        """Should not match invalid variable formats."""
        text = "{{ headline.title }}"  # Spaces inside braces
        result = self.resolver.parse_variables(text)

        assert result == []

    def test_parse_incomplete_variable_not_matched(self):
        """Should not match incomplete variable references."""
        text = "{{headline}}"  # Missing field name
        result = self.resolver.parse_variables(text)

        assert result == []


class TestVariableResolverResolution:
    """Tests for variable resolution functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.resolver = VariableResolver()

    def test_resolve_single_variable(self):
        """Should resolve a single variable."""
        text = "Title: {{headline.title}}"
        context = {"headline": {"title": "Summer Sale"}}

        result = self.resolver.resolve_variables(text, context)

        assert result == "Title: Summer Sale"

    def test_resolve_multiple_variables(self):
        """Should resolve multiple variables."""
        text = "{{headline.title}} - {{subtext.content}}"
        context = {
            "headline": {"title": "Summer Sale"},
            "subtext": {"content": "50% off everything"},
        }

        result = self.resolver.resolve_variables(text, context)

        assert result == "Summer Sale - 50% off everything"

    def test_resolve_no_variables(self):
        """Should return original text when no variables."""
        text = "No variables here"
        context = {}

        result = self.resolver.resolve_variables(text, context)

        assert result == "No variables here"

    def test_resolve_empty_string(self):
        """Should handle empty string."""
        result = self.resolver.resolve_variables("", {})

        assert result == ""

    def test_resolve_none_input(self):
        """Should handle None input."""
        result = self.resolver.resolve_variables(None, {})

        assert result is None

    def test_resolve_numeric_value(self):
        """Should convert numeric values to strings."""
        text = "Count: {{stats.count}}"
        context = {"stats": {"count": 42}}

        result = self.resolver.resolve_variables(text, context)

        assert result == "Count: 42"

    def test_resolve_missing_node_raises_error(self):
        """Should raise ValueError for missing node."""
        text = "{{missing_node.field}}"
        context = {"headline": {"title": "Test"}}

        with pytest.raises(ValueError) as exc_info:
            self.resolver.resolve_variables(text, context)

        assert "Node 'missing_node' not found" in str(exc_info.value)
        assert "headline" in str(exc_info.value)  # Should list available nodes

    def test_resolve_missing_field_raises_error(self):
        """Should raise ValueError for missing field."""
        text = "{{headline.missing_field}}"
        context = {"headline": {"title": "Test"}}

        with pytest.raises(ValueError) as exc_info:
            self.resolver.resolve_variables(text, context)

        assert "Field 'missing_field' not found" in str(exc_info.value)
        assert "title" in str(exc_info.value)  # Should list available fields


class TestVariableResolverDependencies:
    """Tests for dependency extraction functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.resolver = VariableResolver()

    def test_extract_simple_dependency(self):
        """Should extract dependency from node data."""
        workflow = {
            "nodes": [
                {"id": "start_1", "data": {}},
                {"id": "text_gen_1", "data": {"prompt": "Use {{start_1.input}}"}},
            ]
        }

        result = self.resolver.extract_dependencies(workflow)

        assert "text_gen_1" in result
        assert "start_1" in result["text_gen_1"]

    def test_extract_multiple_dependencies(self):
        """Should extract multiple dependencies from single node."""
        workflow = {
            "nodes": [
                {"id": "node_a", "data": {}},
                {"id": "node_b", "data": {}},
                {"id": "node_c", "data": {"prompt": "{{node_a.field}} and {{node_b.field}}"}},
            ]
        }

        result = self.resolver.extract_dependencies(workflow)

        assert "node_c" in result
        assert "node_a" in result["node_c"]
        assert "node_b" in result["node_c"]

    def test_extract_no_dependencies(self):
        """Should return empty dict when no variable dependencies."""
        workflow = {
            "nodes": [
                {"id": "start_1", "data": {}},
                {"id": "text_gen_1", "data": {"prompt": "Static prompt"}},
            ]
        }

        result = self.resolver.extract_dependencies(workflow)

        assert result == {}

    def test_extract_empty_workflow(self):
        """Should handle empty workflow."""
        result = self.resolver.extract_dependencies({"nodes": []})

        assert result == {}


class TestCircularDependencyDetection:
    """Tests for circular dependency detection."""

    def setup_method(self):
        """Set up test fixtures."""
        self.resolver = VariableResolver()

    def test_no_circular_dependency(self):
        """Should return empty list when no circular dependencies."""
        workflow = {
            "nodes": [
                {"id": "node_a", "data": {}},
                {"id": "node_b", "data": {"prompt": "{{node_a.field}}"}},
            ]
        }

        result = self.resolver.detect_circular_dependencies(workflow)

        assert result == []

    def test_detect_direct_circular_dependency(self):
        """Should detect direct circular dependency (A -> B -> A)."""
        workflow = {
            "nodes": [
                {"id": "node_a", "data": {"prompt": "{{node_b.field}}"}},
                {"id": "node_b", "data": {"prompt": "{{node_a.field}}"}},
            ]
        }

        with pytest.raises(ValueError) as exc_info:
            self.resolver.detect_circular_dependencies(workflow)

        assert "Circular dependency detected" in str(exc_info.value)

    def test_detect_indirect_circular_dependency(self):
        """Should detect indirect circular dependency (A -> B -> C -> A)."""
        workflow = {
            "nodes": [
                {"id": "node_a", "data": {"prompt": "{{node_c.field}}"}},
                {"id": "node_b", "data": {"prompt": "{{node_a.field}}"}},
                {"id": "node_c", "data": {"prompt": "{{node_b.field}}"}},
            ]
        }

        with pytest.raises(ValueError) as exc_info:
            self.resolver.detect_circular_dependencies(workflow)

        assert "Circular dependency detected" in str(exc_info.value)


class TestExecutionOrderBuilding:
    """Tests for execution order building functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.resolver = VariableResolver()

    def test_build_simple_linear_order(self):
        """Should build linear execution order from edges."""
        workflow = {
            "nodes": [
                {"id": "start_1", "data": {}},
                {"id": "text_gen_1", "data": {}},
                {"id": "finish_1", "data": {}},
            ],
            "edges": [
                {"source": "start_1", "target": "text_gen_1"},
                {"source": "text_gen_1", "target": "finish_1"},
            ],
        }

        result = self.resolver.build_execution_order(workflow)

        # start_1 should come before text_gen_1
        assert result.index("start_1") < result.index("text_gen_1")
        # text_gen_1 should come before finish_1
        assert result.index("text_gen_1") < result.index("finish_1")

    def test_build_order_with_variable_dependencies(self):
        """Should respect variable dependencies in execution order."""
        workflow = {
            "nodes": [
                {"id": "headline", "data": {}},
                {"id": "subtext", "data": {"prompt": "Based on: {{headline.title}}"}},
            ],
            "edges": [],  # No explicit edges
        }

        result = self.resolver.build_execution_order(workflow)

        # headline should execute before subtext due to variable dependency
        assert result.index("headline") < result.index("subtext")

    def test_build_order_combines_edges_and_dependencies(self):
        """Should combine edge and variable dependencies."""
        workflow = {
            "nodes": [
                {"id": "start_1", "data": {}},
                {"id": "headline", "data": {}},
                {"id": "subtext", "data": {"prompt": "{{headline.title}}"}},
                {"id": "finish_1", "data": {}},
            ],
            "edges": [
                {"source": "start_1", "target": "headline"},
                {"source": "subtext", "target": "finish_1"},
            ],
        }

        result = self.resolver.build_execution_order(workflow)

        # Check edges are respected
        assert result.index("start_1") < result.index("headline")
        assert result.index("subtext") < result.index("finish_1")
        # Check variable dependency is respected
        assert result.index("headline") < result.index("subtext")

    def test_build_order_empty_workflow(self):
        """Should handle empty workflow."""
        workflow = {"nodes": [], "edges": []}

        result = self.resolver.build_execution_order(workflow)

        assert result == []

    def test_build_order_single_node(self):
        """Should handle single node workflow."""
        workflow = {
            "nodes": [{"id": "only_node", "data": {}}],
            "edges": [],
        }

        result = self.resolver.build_execution_order(workflow)

        assert result == ["only_node"]

    def test_build_order_raises_on_circular_dependency(self):
        """Should raise ValueError on circular dependency."""
        workflow = {
            "nodes": [
                {"id": "node_a", "data": {"prompt": "{{node_b.field}}"}},
                {"id": "node_b", "data": {"prompt": "{{node_a.field}}"}},
            ],
            "edges": [],
        }

        with pytest.raises(ValueError) as exc_info:
            self.resolver.build_execution_order(workflow)

        assert "Circular dependency" in str(exc_info.value)
