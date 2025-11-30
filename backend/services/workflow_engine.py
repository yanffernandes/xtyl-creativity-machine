"""
Workflow Engine - Core workflow orchestration and state management

Handles:
- Workflow execution orchestration
- State transitions (pending → running → completed/failed)
- Progress tracking
- Node execution sequencing
"""

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from models import WorkflowExecution, WorkflowTemplate, AgentJob
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def execute_workflow(
    execution_id: str,
    db: Session
) -> WorkflowExecution:
    """
    Execute a workflow from start to finish

    Args:
        execution_id: Workflow execution ID
        db: Database session

    Returns:
        Updated WorkflowExecution
    """
    from services.node_executor import execute_node

    # Load execution
    execution = db.query(WorkflowExecution).filter(
        WorkflowExecution.id == execution_id
    ).first()

    if not execution:
        raise ValueError(f"Execution {execution_id} not found")

    # Load template
    template = db.query(WorkflowTemplate).filter(
        WorkflowTemplate.id == execution.template_id
    ).first()

    if not template:
        raise ValueError(f"Template {execution.template_id} not found")

    try:
        # Transition to running
        await handle_workflow_state_transition(
            execution=execution,
            new_status="running",
            db=db
        )

        # Get nodes in topological order
        nodes = template.nodes_json
        edges = template.edges_json

        # Build execution order (simple sequential for now)
        node_order = _build_execution_order(nodes, edges)

        total_nodes = len(node_order)

        # Context to store node outputs for referencing in subsequent nodes
        node_outputs = {}

        # Execute each node
        for idx, node in enumerate(node_order):
            # Update current node
            execution.current_node_id = node["id"]

            # Calculate progress
            progress = calculate_workflow_progress(
                completed_nodes=idx,
                total_nodes=total_nodes
            )
            execution.progress_percent = progress
            db.commit()

            # Execute node
            logger.info(f"Executing node {node['id']} in workflow {execution_id}")

            try:
                result = await execute_node(node, execution, db)
                node_outputs[node["id"]] = result
                logger.info(f"Node {node['id']} completed successfully")
            except Exception as e:
                logger.error(f"Node {node['id']} failed: {e}")
                raise

        # Mark as completed
        await handle_workflow_state_transition(
            execution=execution,
            new_status="completed",
            db=db
        )

        return execution

    except Exception as e:
        logger.error(f"Workflow execution failed: {e}")
        execution.error_message = str(e)
        await handle_workflow_state_transition(
            execution=execution,
            new_status="failed",
            db=db
        )
        raise


async def handle_workflow_state_transition(
    execution: WorkflowExecution,
    new_status: str,
    db: Session
) -> None:
    """Handle workflow state transitions with atomic updates"""
    old_status = execution.status

    # Validate transition
    valid_transitions = {
        "pending": ["running"],
        "running": ["paused", "completed", "failed", "stopped"],
        "paused": ["running", "stopped"],
    }

    if old_status not in valid_transitions:
        raise ValueError(f"Cannot transition from terminal state {old_status}")

    if new_status not in valid_transitions.get(old_status, []):
        raise ValueError(f"Invalid transition from {old_status} to {new_status}")

    # Update status
    execution.status = new_status

    # Update timestamps
    if new_status == "running" and not execution.started_at:
        execution.started_at = datetime.utcnow()

    if new_status in ["completed", "failed", "stopped"]:
        execution.completed_at = datetime.utcnow()
        execution.progress_percent = 100 if new_status == "completed" else execution.progress_percent

    db.commit()

    logger.info(f"Workflow {execution.id} transitioned from {old_status} to {new_status}")


def calculate_workflow_progress(completed_nodes: int, total_nodes: int) -> int:
    """Calculate workflow progress percentage"""
    if total_nodes == 0:
        return 0
    progress = int((completed_nodes / total_nodes) * 100)
    return min(100, max(0, progress))


def _build_execution_order(nodes: list, edges: list) -> list:
    """Build node execution order from workflow graph"""
    # Filter out start and end nodes
    executable_nodes = [n for n in nodes if n.get("type") not in ["start", "end"]]
    return executable_nodes
