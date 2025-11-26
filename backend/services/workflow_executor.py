"""
Workflow Execution Engine

Core orchestration service that executes complete workflows:
- Coordinates all node types (text generation, image, conditional, loop, etc.)
- Manages execution state and dependencies
- Handles variable resolution and passing
- Provides real-time progress updates via SSE
- Integrates with all specialized services
"""

from typing import Dict, Any, List, Optional, AsyncGenerator
from sqlalchemy.orm import Session
from models import WorkflowExecution, WorkflowTemplate, User
from services.variable_resolver import VariableResolver
from services.workflow_validator import WorkflowValidator
from services.execution_state_manager import ExecutionStateManager
from services.output_parser import OutputParser
from services.loop_executor import LoopExecutor
from services.conditional_executor import ConditionalExecutor
from services.context_retrieval import retrieve_workflow_context
from celery_app import celery_app
import uuid
import asyncio
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class WorkflowExecutor:
    """
    Main workflow execution engine
    """

    def __init__(self, db: Session):
        self.db = db
        self.resolver = VariableResolver()
        self.validator = WorkflowValidator()
        self.state_manager = ExecutionStateManager(db)
        self.output_parser = OutputParser()
        self.loop_executor = LoopExecutor()
        self.conditional_executor = ConditionalExecutor()

    async def execute_workflow(
        self,
        execution_id: str,
        user_id: str,
        yield_progress: bool = True
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Execute a complete workflow

        Args:
            execution_id: ID of the WorkflowExecution record
            user_id: User executing the workflow
            yield_progress: Whether to yield progress updates

        Yields:
            Progress updates with:
                - type: "progress" | "node_complete" | "error" | "complete"
                - node_id: Current node being executed
                - message: Human-readable message
                - progress: Percentage (0-100)
                - data: Additional data (outputs, errors, etc.)
        """
        # Load execution record
        execution = self.db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()

        if not execution:
            yield {
                "type": "error",
                "message": f"Execution not found: {execution_id}",
                "progress": 0
            }
            return

        try:
            # Update status to running
            execution.status = "running"
            execution.started_at = datetime.utcnow()
            self.db.commit()

            if yield_progress:
                yield {
                    "type": "progress",
                    "message": "Starting workflow execution...",
                    "progress": 0
                }

            # Get workflow definition
            workflow_def = {
                "nodes": execution.workflow_definition.get("nodes", []),
                "edges": execution.workflow_definition.get("edges", [])
            }

            # Validate workflow
            validation = self.validator.validate_workflow_structure(workflow_def)
            if not validation["valid"]:
                raise ValueError(f"Invalid workflow: {validation['errors']}")

            # Build execution order
            execution_order = self.resolver.build_execution_order(workflow_def)

            if yield_progress:
                yield {
                    "type": "progress",
                    "message": f"Executing {len(execution_order)} nodes...",
                    "progress": 5
                }

            # Initialize execution state
            state = {
                "execution_id": execution_id,
                "user_id": user_id,
                "project_id": execution.project_id,
                "workspace_id": execution.workspace_id,
                "inputs": execution.inputs or {},
                "node_outputs": {},
                "total_tokens": 0
            }

            # Execute nodes in order
            total_nodes = len(execution_order)
            for i, node_id in enumerate(execution_order):
                node = self._get_node_by_id(workflow_def["nodes"], node_id)

                if not node:
                    raise ValueError(f"Node not found: {node_id}")

                # Calculate progress
                progress = int(5 + (i / total_nodes) * 90)

                if yield_progress:
                    yield {
                        "type": "progress",
                        "node_id": node_id,
                        "message": f"Executing {node['type']} node: {node.get('data', {}).get('label', node_id)}",
                        "progress": progress
                    }

                # Execute node
                try:
                    node_output = await self._execute_node(node, state)

                    # Store output
                    state["node_outputs"][node_id] = node_output

                    # Save to database
                    await self.state_manager.snapshot_to_db(
                        execution_id=execution_id,
                        db=self.db,
                        node_output={
                            "id": str(uuid.uuid4()),
                            "execution_id": execution_id,
                            "node_id": node_id,
                            "outputs": node_output,
                            "execution_order": i
                        }
                    )

                    if yield_progress:
                        yield {
                            "type": "node_complete",
                            "node_id": node_id,
                            "message": f"Node completed: {node.get('data', {}).get('label', node_id)}",
                            "progress": progress,
                            "data": {
                                "outputs": node_output
                            }
                        }

                except Exception as e:
                    logger.error(f"Error executing node {node_id}: {e}")

                    if yield_progress:
                        yield {
                            "type": "error",
                            "node_id": node_id,
                            "message": f"Error in node {node_id}: {str(e)}",
                            "progress": progress
                        }

                    # Update execution status
                    execution.status = "failed"
                    execution.completed_at = datetime.utcnow()
                    execution.error_message = str(e)
                    self.db.commit()

                    return

            # Workflow completed successfully
            execution.status = "completed"
            execution.completed_at = datetime.utcnow()
            execution.outputs = state["node_outputs"]
            execution.total_tokens_used = state["total_tokens"]
            self.db.commit()

            if yield_progress:
                yield {
                    "type": "complete",
                    "message": "Workflow completed successfully",
                    "progress": 100,
                    "data": {
                        "outputs": state["node_outputs"],
                        "total_tokens": state["total_tokens"]
                    }
                }

        except Exception as e:
            logger.error(f"Workflow execution failed: {e}")

            execution.status = "failed"
            execution.completed_at = datetime.utcnow()
            execution.error_message = str(e)
            self.db.commit()

            if yield_progress:
                yield {
                    "type": "error",
                    "message": f"Workflow failed: {str(e)}",
                    "progress": 0
                }

    async def _execute_node(
        self,
        node: Dict[str, Any],
        state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a single workflow node
        """
        node_type = node["type"]
        node_data = node.get("data", {})

        if node_type == "start":
            return await self._execute_start_node(node_data, state)

        elif node_type == "text_generation":
            return await self._execute_text_generation_node(node_data, state)

        elif node_type == "image_generation":
            return await self._execute_image_generation_node(node_data, state)

        elif node_type == "processing":
            return await self._execute_processing_node(node_data, state)

        elif node_type == "context_retrieval":
            return await self._execute_context_retrieval_node(node_data, state)

        elif node_type == "conditional":
            return await self._execute_conditional_node(node_data, state)

        elif node_type == "loop":
            return await self._execute_loop_node(node_data, state)

        elif node_type == "finish":
            return await self._execute_finish_node(node_data, state)

        else:
            raise ValueError(f"Unknown node type: {node_type}")

    async def _execute_start_node(
        self,
        node_data: Dict[str, Any],
        state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute start node - passes through initial inputs
        """
        return {
            "input": state.get("inputs", {}),
            "content": json.dumps(state.get("inputs", {}))
        }

    async def _execute_text_generation_node(
        self,
        node_data: Dict[str, Any],
        state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute text generation node using AI model
        """
        # Resolve prompt with variables
        prompt = node_data.get("prompt", "")
        resolved_prompt = self.resolver.resolve_text(prompt, state["node_outputs"])

        # Get model and parameters
        model = node_data.get("model", "gpt-4-turbo-preview")
        max_tokens = node_data.get("maxTokens", 2000)
        temperature = node_data.get("temperature", 0.7)
        output_format = node_data.get("outputFormat", "text")

        # Call AI service (placeholder - integrate with actual service)
        # For now, simulate response
        response_text = f"[AI Response to: {resolved_prompt[:100]}...]"

        # Update token count
        state["total_tokens"] += len(resolved_prompt.split()) + len(response_text.split())

        # Parse output
        parsed_output = self.output_parser.parse(response_text, output_format)

        return parsed_output

    async def _execute_image_generation_node(
        self,
        node_data: Dict[str, Any],
        state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute image generation node
        """
        # Resolve prompt
        prompt = node_data.get("prompt", "")
        resolved_prompt = self.resolver.resolve_text(prompt, state["node_outputs"])

        # Get parameters
        model = node_data.get("model", "dall-e-3")
        size = node_data.get("size", "1024x1024")

        # Call image generation service (placeholder)
        image_url = f"https://example.com/image_{uuid.uuid4()}.png"

        return {
            "url": image_url,
            "prompt": resolved_prompt,
            "size": size,
            "content": image_url
        }

    async def _execute_processing_node(
        self,
        node_data: Dict[str, Any],
        state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute processing node (AI task like summarization, analysis)
        """
        # Similar to text generation but for specific tasks
        return await self._execute_text_generation_node(node_data, state)

    async def _execute_context_retrieval_node(
        self,
        node_data: Dict[str, Any],
        state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute context retrieval node to fetch documents
        """
        # Resolve query
        query = node_data.get("query", "")
        resolved_query = self.resolver.resolve_text(query, state["node_outputs"])

        # Get parameters
        folder_ids = node_data.get("folderIds", [])
        max_results = node_data.get("maxResults", 5)
        use_rag = node_data.get("useRag", True)

        # Retrieve context
        context = await retrieve_workflow_context(
            db=self.db,
            project_id=state["project_id"],
            context_params={
                "query": resolved_query,
                "folder_ids": folder_ids,
                "max_results": max_results,
                "use_rag": use_rag
            }
        )

        return {
            "documents": context["documents"],
            "count": context["count"],
            "context": context["context"],
            "content": context["context"]
        }

    async def _execute_conditional_node(
        self,
        node_data: Dict[str, Any],
        state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute conditional node
        """
        result = self.conditional_executor.evaluate_condition(
            node_data,
            state["node_outputs"]
        )

        return {
            "condition_result": result["result"],
            "branch_taken": result["branch"],
            "details": result.get("details", {}),
            "content": f"Condition evaluated to {result['result']}"
        }

    async def _execute_loop_node(
        self,
        node_data: Dict[str, Any],
        state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute loop node (placeholder - full implementation requires graph traversal)
        """
        # This is simplified - full implementation needs to execute loop body
        loop_type = node_data.get("type", "fixed")
        iterations = node_data.get("iterations", 1)

        return {
            "iterations": iterations,
            "items": [],
            "current_item": None,
            "content": f"Loop executed {iterations} times"
        }

    async def _execute_finish_node(
        self,
        node_data: Dict[str, Any],
        state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute finish node - collect final outputs
        """
        save_to_project = node_data.get("saveToProject", False)
        notify_user = node_data.get("notifyUser", False)

        return {
            "final_output": state["node_outputs"],
            "save_to_project": save_to_project,
            "notify_user": notify_user,
            "content": "Workflow completed"
        }

    def _get_node_by_id(self, nodes: List[Dict], node_id: str) -> Optional[Dict]:
        """
        Find node in list by ID
        """
        for node in nodes:
            if node["id"] == node_id:
                return node
        return None
