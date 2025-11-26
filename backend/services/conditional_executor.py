"""
Conditional Execution Service

Handles conditional branching in workflows:
- Simple comparisons (==, !=, <, >, <=, >=)
- Logical operators (AND, OR, NOT)
- Multiple conditions
- Branch selection based on evaluation
"""

from typing import Dict, Any, List, Optional, Union
from services.variable_resolver import VariableResolver
import re
import logging

logger = logging.getLogger(__name__)


class ConditionalExecutor:
    """
    Service for evaluating conditional nodes in workflows
    """

    def __init__(self):
        self.resolver = VariableResolver()

    def evaluate_condition(
        self,
        condition_config: Dict[str, Any],
        current_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate a conditional node

        Args:
            condition_config: Condition configuration:
                - type: "simple" | "complex"
                - conditions: List of condition objects
                - logic: "AND" | "OR" (for multiple conditions)
            current_state: Current workflow state with node outputs

        Returns:
            Dict with:
                - result: True/False evaluation result
                - branch: "true" | "false" for next edge
                - details: Evaluation details for debugging
        """
        condition_type = condition_config.get("type", "simple")

        if condition_type == "simple":
            return self._evaluate_simple_condition(
                condition_config,
                current_state
            )
        elif condition_type == "complex":
            return self._evaluate_complex_condition(
                condition_config,
                current_state
            )
        else:
            raise ValueError(f"Unknown condition type: {condition_type}")

    def _evaluate_simple_condition(
        self,
        condition_config: Dict[str, Any],
        current_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate a single simple condition

        Config format:
        {
            "left": "{{node.field}}",
            "operator": "==",
            "right": "value"
        }
        """
        left = condition_config.get("left", "")
        operator = condition_config.get("operator", "==")
        right = condition_config.get("right", "")

        # Resolve variables
        left_value = self._resolve_value(left, current_state)
        right_value = self._resolve_value(right, current_state)

        # Evaluate
        try:
            result = self._apply_operator(left_value, operator, right_value)

            return {
                "result": result,
                "branch": "true" if result else "false",
                "details": {
                    "left": left,
                    "left_value": left_value,
                    "operator": operator,
                    "right": right,
                    "right_value": right_value
                }
            }

        except Exception as e:
            logger.error(f"Error evaluating condition: {e}")
            return {
                "result": False,
                "branch": "false",
                "error": str(e),
                "details": {
                    "left": left,
                    "operator": operator,
                    "right": right
                }
            }

    def _evaluate_complex_condition(
        self,
        condition_config: Dict[str, Any],
        current_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate multiple conditions with AND/OR logic

        Config format:
        {
            "conditions": [
                {"left": "{{node.field}}", "operator": "==", "right": "value"},
                {"left": "{{node2.count}}", "operator": ">", "right": "10"}
            ],
            "logic": "AND"  // or "OR"
        }
        """
        conditions = condition_config.get("conditions", [])
        logic = condition_config.get("logic", "AND")

        if not conditions:
            return {
                "result": False,
                "branch": "false",
                "error": "No conditions provided"
            }

        # Evaluate each condition
        results = []
        details = []

        for i, cond in enumerate(conditions):
            eval_result = self._evaluate_simple_condition(cond, current_state)
            results.append(eval_result["result"])
            details.append({
                "condition_index": i,
                **eval_result["details"]
            })

        # Apply logic
        if logic == "AND":
            final_result = all(results)
        elif logic == "OR":
            final_result = any(results)
        else:
            return {
                "result": False,
                "branch": "false",
                "error": f"Invalid logic operator: {logic}"
            }

        return {
            "result": final_result,
            "branch": "true" if final_result else "false",
            "details": {
                "logic": logic,
                "conditions": details,
                "individual_results": results
            }
        }

    def _resolve_value(self, value_str: str, state: Dict[str, Any]) -> Any:
        """
        Resolve value - could be variable reference or literal

        - {{node.field}} -> resolves from state
        - "string" -> returns string literal
        - 123 -> returns number
        """
        if not isinstance(value_str, str):
            return value_str

        # Check if it's a variable reference
        if "{{" in value_str and "}}" in value_str:
            # Resolve variable
            variables = self.resolver.parse_variables(value_str)
            if variables:
                node_id, field_name = variables[0]
                node_output = state.get(f"node_output_{node_id}", {})
                return node_output.get(field_name)

        # Try to parse as number
        try:
            if "." in value_str:
                return float(value_str)
            return int(value_str)
        except ValueError:
            pass

        # Try to parse as boolean
        if value_str.lower() == "true":
            return True
        if value_str.lower() == "false":
            return False

        # Return as string (remove quotes if present)
        if value_str.startswith('"') and value_str.endswith('"'):
            return value_str[1:-1]
        if value_str.startswith("'") and value_str.endswith("'"):
            return value_str[1:-1]

        return value_str

    def _apply_operator(self, left: Any, operator: str, right: Any) -> bool:
        """
        Apply comparison operator

        Supports: ==, !=, <, >, <=, >=, contains, startswith, endswith
        """
        if operator == "==":
            return left == right

        elif operator == "!=":
            return left != right

        elif operator == "<":
            return self._safe_compare(left, right, lambda a, b: a < b)

        elif operator == ">":
            return self._safe_compare(left, right, lambda a, b: a > b)

        elif operator == "<=":
            return self._safe_compare(left, right, lambda a, b: a <= b)

        elif operator == ">=":
            return self._safe_compare(left, right, lambda a, b: a >= b)

        elif operator == "contains":
            return self._safe_contains(left, right)

        elif operator == "startswith":
            return str(left).startswith(str(right))

        elif operator == "endswith":
            return str(left).endswith(str(right))

        else:
            raise ValueError(f"Unknown operator: {operator}")

    def _safe_compare(self, left: Any, right: Any, compare_func) -> bool:
        """
        Safely compare values (handle type mismatches)
        """
        try:
            # Try direct comparison
            return compare_func(left, right)
        except TypeError:
            # Try converting to same type
            try:
                if isinstance(left, str) and isinstance(right, (int, float)):
                    return compare_func(float(left), right)
                elif isinstance(right, str) and isinstance(left, (int, float)):
                    return compare_func(left, float(right))
            except (ValueError, TypeError):
                pass

            # Fallback: compare as strings
            return compare_func(str(left), str(right))

    def _safe_contains(self, left: Any, right: Any) -> bool:
        """
        Check if right is contained in left
        """
        if isinstance(left, (list, tuple)):
            return right in left
        elif isinstance(left, dict):
            return right in left
        elif isinstance(left, str):
            return str(right) in left
        else:
            return False

    def validate_condition_config(self, condition_config: Dict[str, Any]) -> List[str]:
        """
        Validate condition configuration

        Returns list of validation errors (empty if valid)
        """
        errors = []

        condition_type = condition_config.get("type", "simple")

        if condition_type == "simple":
            if "left" not in condition_config:
                errors.append("Simple condition requires 'left' parameter")
            if "operator" not in condition_config:
                errors.append("Simple condition requires 'operator' parameter")
            if "right" not in condition_config:
                errors.append("Simple condition requires 'right' parameter")

            # Validate operator
            valid_operators = ["==", "!=", "<", ">", "<=", ">=", "contains", "startswith", "endswith"]
            operator = condition_config.get("operator")
            if operator and operator not in valid_operators:
                errors.append(f"Invalid operator: {operator}. Valid operators: {valid_operators}")

        elif condition_type == "complex":
            conditions = condition_config.get("conditions", [])
            if not conditions:
                errors.append("Complex condition requires 'conditions' list")

            logic = condition_config.get("logic")
            if not logic:
                errors.append("Complex condition requires 'logic' parameter")
            elif logic not in ["AND", "OR"]:
                errors.append(f"Invalid logic: {logic}. Must be 'AND' or 'OR'")

            # Validate each sub-condition
            for i, cond in enumerate(conditions):
                sub_errors = self.validate_condition_config({**cond, "type": "simple"})
                for err in sub_errors:
                    errors.append(f"Condition {i}: {err}")

        else:
            errors.append(f"Invalid condition type: {condition_type}")

        return errors

    def get_supported_operators(self) -> List[Dict[str, str]]:
        """
        Get list of supported operators with descriptions
        """
        return [
            {"value": "==", "label": "equals", "description": "Values are equal"},
            {"value": "!=", "label": "not equals", "description": "Values are not equal"},
            {"value": "<", "label": "less than", "description": "Left is less than right"},
            {"value": ">", "label": "greater than", "description": "Left is greater than right"},
            {"value": "<=", "label": "less than or equal", "description": "Left is less than or equal to right"},
            {"value": ">=", "label": "greater than or equal", "description": "Left is greater than or equal to right"},
            {"value": "contains", "label": "contains", "description": "Left contains right"},
            {"value": "startswith", "label": "starts with", "description": "Left starts with right"},
            {"value": "endswith", "label": "ends with", "description": "Left ends with right"},
        ]
