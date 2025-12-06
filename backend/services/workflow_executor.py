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

            # Get workflow definition from template
            template = self.db.query(WorkflowTemplate).filter(
                WorkflowTemplate.id == execution.template_id
            ).first()

            if not template:
                raise ValueError(f"Workflow template not found: {execution.template_id}")

            workflow_def = {
                "nodes": template.nodes_json or [],
                "edges": template.edges_json or []
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
                "inputs": execution.config_json or {},
                "node_outputs": execution.execution_context or {},  # Load existing outputs for resume
                "total_tokens": execution.total_tokens_used or 0,
                "edges": workflow_def.get("edges", []),  # Include edges for connection-based resolution
                "nodes": workflow_def.get("nodes", [])   # Include nodes for type lookup
            }

            # Execute nodes in order
            total_nodes = len(execution_order)
            for i, node_id in enumerate(execution_order):
                # Check for pause/stop
                self.db.refresh(execution)
                if execution.status == "paused":
                    logger.info(f"Workflow {execution_id} paused")
                    if yield_progress:
                        yield {"type": "progress", "message": "Workflow paused", "progress": int(5 + (i / total_nodes) * 90)}
                    return
                
                if execution.status == "stopped":
                    logger.info(f"Workflow {execution_id} stopped")
                    if yield_progress:
                        yield {"type": "progress", "message": "Workflow stopped", "progress": int(5 + (i / total_nodes) * 90)}
                    return

                # Skip if already executed (for resume)
                if node_id in state["node_outputs"]:
                    continue

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
                    # Resolve variables in node data
                    resolved_node = self._resolve_node_variables(node, state)
                    
                    # Execute using node_executor service
                    from services.node_executor import execute_node
                    node_output = await execute_node(resolved_node, execution, self.db)

                    # Store output
                    state["node_outputs"][node_id] = node_output

                    # Save to database
                    self.state_manager.snapshot_to_db(
                        execution_id=execution_id,
                        db=self.db,
                        node_output={
                            "id": str(uuid.uuid4()),
                            "execution_id": execution_id,
                            "node_id": node_id,
                            "node_name": node.get("data", {}).get("label", node_id),
                            "node_type": node["type"],
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
            execution.execution_context = state["node_outputs"]
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

    def _resolve_node_variables(self, node: Dict[str, Any], state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Resolve variables in node configuration.

        Transforms {{node_id.field}} references into actual values from previous node outputs.
        For example: "Generate an image based on {{text_gen.content}}"
        becomes "Generate an image based on The actual text content..."

        For attach nodes, also injects document_ref and image_ref from connected nodes
        when they are not explicitly set.
        """
        import copy
        resolved_node = copy.deepcopy(node)
        node_data = resolved_node.get("data", {})

        # Iterate over all string fields in data and try to resolve variables
        for key, value in node_data.items():
            if isinstance(value, str) and "{{" in value and "}}" in value:
                try:
                    # Use resolve_variables method (correct method name)
                    resolved_value = self.resolver.resolve_variables(value, state["node_outputs"])
                    node_data[key] = resolved_value
                    logger.debug(f"Resolved variable in {key}: {value[:50]}... -> {resolved_value[:50]}...")
                except Exception as e:
                    logger.warning(f"Failed to resolve variable in {key}: {e}")

        # Special handling for attach nodes: auto-resolve connections
        node_type = node.get("type", "")
        if node_type in ("attach", "attach_creative"):
            node_data = self._resolve_attach_node_connections(node, node_data, state)

        resolved_node["data"] = node_data
        return resolved_node

    def _resolve_attach_node_connections(
        self,
        node: Dict[str, Any],
        node_data: Dict[str, Any],
        state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Auto-resolve document_ref and image_ref for attach nodes by looking at connected edges.

        This allows attach nodes to work without explicitly setting variable references,
        by automatically extracting IDs from connected text_generation and image_generation nodes.
        """
        node_id = node.get("id")
        edges = state.get("edges", [])
        nodes = state.get("nodes", [])
        node_outputs = state.get("node_outputs", {})

        # Find edges connecting TO this attach node
        incoming_edges = [e for e in edges if e.get("target") == node_id]

        logger.info(f"AttachNode {node_id}: Found {len(incoming_edges)} incoming edges")

        for edge in incoming_edges:
            source_node_id = edge.get("source")
            target_handle = edge.get("targetHandle", "")
            source_handle = edge.get("sourceHandle", "")

            # Get source node type
            source_node = self._get_node_by_id(nodes, source_node_id)
            if not source_node:
                continue

            source_type = source_node.get("type", "")
            source_output = node_outputs.get(source_node_id, {})

            logger.info(f"AttachNode: Edge from {source_node_id} ({source_type}) via handle {target_handle}")
            logger.info(f"AttachNode: Source output keys: {list(source_output.keys())}")

            # Determine if this connection provides document or image
            # Based on target handle name or source node type

            # Check for document connection (text_generation nodes produce document_ids)
            if source_type in ("text_generation", "generate_copy"):
                # Check if document_ref is not already set
                if not node_data.get("document_ref"):
                    document_ids = source_output.get("document_ids", [])
                    if document_ids and len(document_ids) > 0:
                        node_data["document_ref"] = document_ids[0]
                        logger.info(f"AttachNode: Auto-resolved document_ref to {document_ids[0]}")

            # Check for image connection (image_generation nodes produce image_ids)
            elif source_type in ("image_generation", "generate_image"):
                # Check if image_ref is not already set
                if not node_data.get("image_ref"):
                    image_ids = source_output.get("image_ids", [])
                    if image_ids and len(image_ids) > 0:
                        node_data["image_ref"] = image_ids[0]
                        logger.info(f"AttachNode: Auto-resolved image_ref to {image_ids[0]}")

            # Also check based on target handle name for more explicit connections
            if "document" in target_handle.lower() or "text" in target_handle.lower():
                if not node_data.get("document_ref"):
                    document_ids = source_output.get("document_ids", [])
                    if document_ids and len(document_ids) > 0:
                        node_data["document_ref"] = document_ids[0]
                        logger.info(f"AttachNode: Auto-resolved document_ref via handle to {document_ids[0]}")

            if "image" in target_handle.lower():
                if not node_data.get("image_ref"):
                    image_ids = source_output.get("image_ids", [])
                    if image_ids and len(image_ids) > 0:
                        node_data["image_ref"] = image_ids[0]
                        logger.info(f"AttachNode: Auto-resolved image_ref via handle to {image_ids[0]}")

        return node_data

    def _get_node_by_id(self, nodes: List[Dict], node_id: str) -> Optional[Dict]:
        """
        Find node in list by ID
        """
        for node in nodes:
            if node["id"] == node_id:
                return node
        return None
