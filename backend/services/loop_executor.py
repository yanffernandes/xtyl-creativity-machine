"""
Loop Execution Service

Handles loop node execution in workflows:
- Fixed iteration loops (1 to N)
- Conditional loops (while condition is true)
- Collection iteration (foreach item in list)
- Safety limits to prevent infinite loops
"""

from typing import Dict, Any, List, Optional, Callable
from services.variable_resolver import VariableResolver
import logging

logger = logging.getLogger(__name__)


class LoopExecutor:
    """
    Service for executing loop nodes in workflows
    """

    # Safety limit to prevent infinite loops
    MAX_ITERATIONS = 1000

    def __init__(self):
        self.resolver = VariableResolver()

    async def execute_loop(
        self,
        loop_config: Dict[str, Any],
        loop_body_executor: Callable,
        current_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a loop node

        Args:
            loop_config: Loop configuration from node data:
                - type: "fixed" | "conditional" | "collection"
                - iterations: For fixed loops
                - condition: For conditional loops
                - collection: For collection loops
                - max_iterations: Safety limit override
            loop_body_executor: Async function to execute loop body
                Should accept (iteration_index, loop_state) and return outputs
            current_state: Current workflow state

        Returns:
            Dict with:
                - iterations_completed: Number of iterations run
                - results: List of outputs from each iteration
                - final_state: Updated workflow state
                - stopped_reason: "completed" | "max_iterations" | "condition_false" | "error"
        """
        loop_type = loop_config.get("type", "fixed")
        max_iterations = min(
            loop_config.get("max_iterations", self.MAX_ITERATIONS),
            self.MAX_ITERATIONS
        )

        if loop_type == "fixed":
            return await self._execute_fixed_loop(
                iterations=loop_config.get("iterations", 1),
                max_iterations=max_iterations,
                loop_body_executor=loop_body_executor,
                current_state=current_state
            )
        elif loop_type == "conditional":
            return await self._execute_conditional_loop(
                condition=loop_config.get("condition", ""),
                max_iterations=max_iterations,
                loop_body_executor=loop_body_executor,
                current_state=current_state
            )
        elif loop_type == "collection":
            return await self._execute_collection_loop(
                collection_ref=loop_config.get("collection", ""),
                max_iterations=max_iterations,
                loop_body_executor=loop_body_executor,
                current_state=current_state
            )
        else:
            raise ValueError(f"Unknown loop type: {loop_type}")

    async def _execute_fixed_loop(
        self,
        iterations: int,
        max_iterations: int,
        loop_body_executor: Callable,
        current_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute fixed iteration loop (for i = 1 to N)
        """
        iterations = min(iterations, max_iterations)
        results = []
        loop_state = current_state.copy()

        logger.info(f"Starting fixed loop with {iterations} iterations")

        for i in range(iterations):
            try:
                # Execute loop body
                iteration_result = await loop_body_executor(i, loop_state)

                # Store result
                results.append({
                    "iteration": i,
                    "output": iteration_result
                })

                # Update loop state with iteration results
                loop_state[f"loop_iteration_{i}"] = iteration_result

            except Exception as e:
                logger.error(f"Error in loop iteration {i}: {e}")
                return {
                    "iterations_completed": i,
                    "results": results,
                    "final_state": loop_state,
                    "stopped_reason": "error",
                    "error": str(e)
                }

        return {
            "iterations_completed": iterations,
            "results": results,
            "final_state": loop_state,
            "stopped_reason": "completed"
        }

    async def _execute_conditional_loop(
        self,
        condition: str,
        max_iterations: int,
        loop_body_executor: Callable,
        current_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute conditional loop (while condition is true)
        """
        results = []
        loop_state = current_state.copy()
        iteration = 0

        logger.info(f"Starting conditional loop with condition: {condition}")

        while iteration < max_iterations:
            # Evaluate condition
            try:
                condition_result = self._evaluate_condition(condition, loop_state)

                if not condition_result:
                    logger.info(f"Loop condition false at iteration {iteration}")
                    break

            except Exception as e:
                logger.error(f"Error evaluating loop condition: {e}")
                return {
                    "iterations_completed": iteration,
                    "results": results,
                    "final_state": loop_state,
                    "stopped_reason": "error",
                    "error": f"Condition evaluation failed: {str(e)}"
                }

            # Execute loop body
            try:
                iteration_result = await loop_body_executor(iteration, loop_state)

                results.append({
                    "iteration": iteration,
                    "output": iteration_result
                })

                loop_state[f"loop_iteration_{iteration}"] = iteration_result
                iteration += 1

            except Exception as e:
                logger.error(f"Error in loop iteration {iteration}: {e}")
                return {
                    "iterations_completed": iteration,
                    "results": results,
                    "final_state": loop_state,
                    "stopped_reason": "error",
                    "error": str(e)
                }

        stopped_reason = "completed" if iteration < max_iterations else "max_iterations"

        return {
            "iterations_completed": iteration,
            "results": results,
            "final_state": loop_state,
            "stopped_reason": stopped_reason
        }

    async def _execute_collection_loop(
        self,
        collection_ref: str,
        max_iterations: int,
        loop_body_executor: Callable,
        current_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute collection loop (foreach item in collection)
        """
        # Resolve collection reference
        try:
            collection = self._resolve_collection(collection_ref, current_state)
        except Exception as e:
            logger.error(f"Failed to resolve collection '{collection_ref}': {e}")
            return {
                "iterations_completed": 0,
                "results": [],
                "final_state": current_state,
                "stopped_reason": "error",
                "error": f"Collection resolution failed: {str(e)}"
            }

        if not isinstance(collection, list):
            return {
                "iterations_completed": 0,
                "results": [],
                "final_state": current_state,
                "stopped_reason": "error",
                "error": f"Collection must be a list, got {type(collection)}"
            }

        # Limit iterations
        items = collection[:max_iterations]
        results = []
        loop_state = current_state.copy()

        logger.info(f"Starting collection loop with {len(items)} items")

        for i, item in enumerate(items):
            try:
                # Add current item to loop state
                loop_state["loop_current_item"] = item
                loop_state["loop_current_index"] = i

                # Execute loop body
                iteration_result = await loop_body_executor(i, loop_state)

                results.append({
                    "iteration": i,
                    "item": item,
                    "output": iteration_result
                })

                loop_state[f"loop_iteration_{i}"] = iteration_result

            except Exception as e:
                logger.error(f"Error in collection loop iteration {i}: {e}")
                return {
                    "iterations_completed": i,
                    "results": results,
                    "final_state": loop_state,
                    "stopped_reason": "error",
                    "error": str(e)
                }

        return {
            "iterations_completed": len(items),
            "results": results,
            "final_state": loop_state,
            "stopped_reason": "completed"
        }

    def _evaluate_condition(self, condition: str, state: Dict[str, Any]) -> bool:
        """
        Evaluate loop condition

        Supports simple comparisons:
        - {{node.field}} > 10
        - {{node.count}} < 100
        - {{node.status}} == "complete"
        """
        # Resolve variables in condition
        resolved_condition = self.resolver.resolve_text(condition, state)

        # Simple safe evaluation
        # For production, use a proper expression parser
        try:
            # Very basic evaluation - in production use ast.literal_eval or similar
            result = eval(resolved_condition)
            return bool(result)
        except Exception as e:
            logger.warning(f"Failed to evaluate condition '{resolved_condition}': {e}")
            return False

    def _resolve_collection(self, collection_ref: str, state: Dict[str, Any]) -> List[Any]:
        """
        Resolve collection reference to actual list

        Supports:
        - {{node.field}} - Direct reference to list field
        - {{node.items}} - Common collection field name
        """
        # Parse variable reference
        variables = self.resolver.parse_variables(collection_ref)

        if not variables:
            raise ValueError(f"Invalid collection reference: {collection_ref}")

        node_id, field_name = variables[0]

        # Get node output
        node_output = state.get(f"node_output_{node_id}", {})
        collection = node_output.get(field_name)

        if collection is None:
            raise ValueError(f"Collection not found: {collection_ref}")

        return collection

    def validate_loop_config(self, loop_config: Dict[str, Any]) -> List[str]:
        """
        Validate loop configuration

        Returns list of validation errors (empty if valid)
        """
        errors = []
        loop_type = loop_config.get("type")

        if not loop_type:
            errors.append("Loop type is required")
            return errors

        if loop_type not in ["fixed", "conditional", "collection"]:
            errors.append(f"Invalid loop type: {loop_type}")

        if loop_type == "fixed":
            iterations = loop_config.get("iterations")
            if iterations is None:
                errors.append("Fixed loop requires 'iterations' parameter")
            elif not isinstance(iterations, int) or iterations < 1:
                errors.append("Iterations must be a positive integer")

        elif loop_type == "conditional":
            condition = loop_config.get("condition")
            if not condition:
                errors.append("Conditional loop requires 'condition' parameter")

        elif loop_type == "collection":
            collection = loop_config.get("collection")
            if not collection:
                errors.append("Collection loop requires 'collection' parameter")

        return errors
