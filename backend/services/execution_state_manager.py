"""
Execution State Manager

Manages workflow execution state in Redis for fast access and PostgreSQL for durability.
Implements hybrid caching strategy with snapshots after each node completion.
"""

import json
from typing import Dict, Any, Optional
from datetime import datetime
import redis
from sqlalchemy.orm import Session
from models import WorkflowExecution, NodeOutput
from database import SessionLocal


class ExecutionStateManager:
    """Manages workflow execution state with Redis + PostgreSQL hybrid storage"""

    def __init__(self, redis_client: redis.Redis):
        """
        Initialize state manager.

        Args:
            redis_client: Configured Redis client instance
        """
        self.redis = redis_client
        self.state_ttl = 86400  # 24 hours in seconds

    def save_state(
        self,
        execution_id: str,
        state: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """
        Save execution state to Redis with TTL.

        Args:
            execution_id: Workflow execution ID
            state: State dictionary with keys:
                - status: Current execution status
                - progress_percent: 0-100 progress indicator
                - current_node_id: Node currently executing
                - execution_context: Variable values and loop state
            ttl: Time-to-live in seconds (default: 24 hours)

        Returns:
            True if saved successfully

        Example:
            >>> manager = ExecutionStateManager(redis_client)
            >>> state = {
            ...     "status": "running",
            ...     "progress_percent": 50,
            ...     "current_node_id": "textgen-2",
            ...     "execution_context": {"start-1": {"theme": "Summer Sale"}}
            ... }
            >>> manager.save_state("exec-123", state)
            True
        """
        key = f"workflow:execution:{execution_id}"
        ttl = ttl or self.state_ttl

        try:
            # Serialize state to JSON
            state_json = json.dumps(state, default=str)

            # Save to Redis with TTL
            self.redis.setex(key, ttl, state_json)

            return True
        except Exception as e:
            print(f"Error saving state to Redis: {e}")
            return False

    def load_state(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """
        Load execution state from Redis.

        Args:
            execution_id: Workflow execution ID

        Returns:
            State dictionary or None if not found

        Example:
            >>> manager = ExecutionStateManager(redis_client)
            >>> state = manager.load_state("exec-123")
            >>> print(state["status"])
            "running"
        """
        key = f"workflow:execution:{execution_id}"

        try:
            # Get from Redis
            state_json = self.redis.get(key)

            if state_json is None:
                return None

            # Deserialize JSON
            state = json.loads(state_json)

            return state
        except Exception as e:
            print(f"Error loading state from Redis: {e}")
            return None

    def save_node_output(
        self,
        execution_id: str,
        node_id: str,
        node_name: str,
        outputs: Dict[str, Any]
    ) -> bool:
        """
        Save node output to Redis for variable resolution.

        Args:
            execution_id: Workflow execution ID
            node_id: Node ID from workflow definition
            node_name: Human-readable node name
            outputs: Node output data (with parsed fields from OutputParser)

        Returns:
            True if saved successfully

        Example:
            >>> manager.save_node_output(
            ...     "exec-123",
            ...     "textgen-2",
            ...     "headline",
            ...     {"content": "Summer Sale!", "title": "Hot Deals", "word_count": 2}
            ... )
            True
        """
        key = f"workflow:execution:{execution_id}:outputs"

        try:
            # Store as hash field (node_name -> outputs JSON)
            outputs_json = json.dumps(outputs, default=str)
            self.redis.hset(key, node_name, outputs_json)

            # Set TTL on hash
            self.redis.expire(key, self.state_ttl)

            return True
        except Exception as e:
            print(f"Error saving node output to Redis: {e}")
            return False

    def get_node_outputs(self, execution_id: str) -> Dict[str, Dict[str, Any]]:
        """
        Get all node outputs for an execution (for variable resolution).

        Args:
            execution_id: Workflow execution ID

        Returns:
            Dict mapping node names to their output dictionaries

        Example:
            >>> outputs = manager.get_node_outputs("exec-123")
            >>> print(outputs["headline"]["title"])
            "Hot Deals"
        """
        key = f"workflow:execution:{execution_id}:outputs"

        try:
            # Get all hash fields
            outputs_hash = self.redis.hgetall(key)

            if not outputs_hash:
                return {}

            # Deserialize each field
            outputs = {}
            for node_name, outputs_json in outputs_hash.items():
                # Redis returns bytes, decode to string
                node_name_str = node_name.decode('utf-8') if isinstance(node_name, bytes) else node_name
                outputs_json_str = outputs_json.decode('utf-8') if isinstance(outputs_json, bytes) else outputs_json

                outputs[node_name_str] = json.loads(outputs_json_str)

            return outputs
        except Exception as e:
            print(f"Error getting node outputs from Redis: {e}")
            return {}

    def snapshot_to_db(
        self,
        execution_id: str,
        db: Session,
        node_output: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Snapshot current execution state to PostgreSQL for durability.

        Should be called:
        1. After each node completes (with node_output parameter)
        2. On final completion (without node_output)

        Args:
            execution_id: Workflow execution ID
            db: SQLAlchemy database session
            node_output: Optional dict with node output to save:
                {
                    "node_id": "textgen-2",
                    "node_name": "headline",
                    "node_type": "text_generation",
                    "outputs": {...},
                    "execution_order": 1,
                    "iteration_number": 0
                }

        Returns:
            True if snapshot saved successfully

        Example:
            >>> # After node completes
            >>> manager.snapshot_to_db(
            ...     "exec-123",
            ...     db,
            ...     node_output={
            ...         "node_id": "textgen-2",
            ...         "node_name": "headline",
            ...         "node_type": "text_generation",
            ...         "outputs": {"content": "Summer Sale!"},
            ...         "execution_order": 1
            ...     }
            ... )
            True
        """
        try:
            # Get current state from Redis
            state = self.load_state(execution_id)

            if state is None:
                # Fall back to loading from database if not in Redis
                execution = db.query(WorkflowExecution).filter_by(id=execution_id).first()
                if not execution:
                    print(f"Execution {execution_id} not found")
                    return False
            else:
                # Update PostgreSQL execution record with current state
                execution = db.query(WorkflowExecution).filter_by(id=execution_id).first()

                if execution:
                    execution.status = state.get("status", execution.status)
                    execution.progress_percent = state.get("progress_percent", execution.progress_percent)
                    execution.current_node_id = state.get("current_node_id", execution.current_node_id)
                    execution.execution_context = state.get("execution_context", execution.execution_context)

            # Save node output if provided
            if node_output:
                db_node_output = NodeOutput(
                    execution_id=execution_id,
                    node_id=node_output["node_id"],
                    node_name=node_output["node_name"],
                    node_type=node_output["node_type"],
                    outputs=node_output["outputs"],
                    execution_order=node_output.get("execution_order", 0),
                    iteration_number=node_output.get("iteration_number", 0),
                    completed_at=datetime.utcnow()
                )
                db.add(db_node_output)

            # Commit transaction
            db.commit()

            return True
        except Exception as e:
            print(f"Error snapshotting to database: {e}")
            db.rollback()
            return False

    def restore_from_db(self, execution_id: str, db: Session) -> Optional[Dict[str, Any]]:
        """
        Restore execution state from PostgreSQL to Redis.

        Used for resume-from-failure scenarios when Redis state is lost.

        Args:
            execution_id: Workflow execution ID
            db: SQLAlchemy database session

        Returns:
            Restored state dictionary or None if not found

        Example:
            >>> # After Redis restart
            >>> state = manager.restore_from_db("exec-123", db)
            >>> if state:
            ...     print(f"Resumed at node: {state['current_node_id']}")
        """
        try:
            # Load execution record
            execution = db.query(WorkflowExecution).filter_by(id=execution_id).first()

            if not execution:
                return None

            # Build state from database
            state = {
                "status": execution.status,
                "progress_percent": execution.progress_percent,
                "current_node_id": execution.current_node_id,
                "execution_context": execution.execution_context or {}
            }

            # Load node outputs into Redis
            node_outputs = db.query(NodeOutput).filter_by(
                execution_id=execution_id
            ).order_by(NodeOutput.execution_order).all()

            for node_output in node_outputs:
                self.save_node_output(
                    execution_id,
                    node_output.node_id,
                    node_output.node_name,
                    node_output.outputs
                )

            # Save state to Redis
            self.save_state(execution_id, state)

            return state
        except Exception as e:
            print(f"Error restoring from database: {e}")
            return None

    def delete_state(self, execution_id: str) -> bool:
        """
        Delete execution state from Redis (cleanup after completion).

        Args:
            execution_id: Workflow execution ID

        Returns:
            True if deleted successfully
        """
        try:
            state_key = f"workflow:execution:{execution_id}"
            outputs_key = f"workflow:execution:{execution_id}:outputs"

            self.redis.delete(state_key, outputs_key)

            return True
        except Exception as e:
            print(f"Error deleting state from Redis: {e}")
            return False
