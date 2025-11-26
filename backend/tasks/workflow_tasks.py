"""
Celery Tasks for Workflow Execution

This module defines async Celery tasks for executing AI workflows.
Tasks are executed by Celery workers and manage workflow state in the database.
"""

from celery import Task
from celery_app import celery_app
from sqlalchemy.orm import Session
from database import SessionLocal
from models import WorkflowExecution
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """Base task class that provides database session management"""
    _db = None

    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        """Close database session after task completes"""
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(bind=True, base=DatabaseTask, name="tasks.workflow_tasks.execute_workflow")
def execute_workflow(self, execution_id: str):
    """
    Execute a workflow asynchronously

    Args:
        execution_id: ID of the WorkflowExecution to run

    Returns:
        Dict with execution results
    """
    logger.info(f"Starting workflow execution: {execution_id}")

    try:
        # Import here to avoid circular dependency
        from services.workflow_engine import execute_workflow as execute_workflow_engine
        import asyncio

        # Get database session
        db = self.db

        # Get execution record
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()

        if not execution:
            raise ValueError(f"Workflow execution {execution_id} not found")

        # Execute workflow using engine
        result = asyncio.run(execute_workflow_engine(execution_id, db))

        logger.info(f"Workflow execution {execution_id} completed successfully")
        return {
            "execution_id": execution_id,
            "status": result.status,
            "progress": result.progress_percent
        }

    except Exception as e:
        logger.error(f"Workflow execution {execution_id} failed: {str(e)}", exc_info=True)

        # Update execution status to failed
        try:
            db = self.db
            execution = db.query(WorkflowExecution).filter(
                WorkflowExecution.id == execution_id
            ).first()

            if execution:
                execution.status = "failed"
                execution.error_message = str(e)
                execution.completed_at = datetime.utcnow()
                db.commit()
        except Exception as update_error:
            logger.error(f"Failed to update execution status: {update_error}")

        raise


@celery_app.task(name="tasks.workflow_tasks.pause_workflow")
def pause_workflow(execution_id: str):
    """
    Pause a running workflow

    Args:
        execution_id: ID of the WorkflowExecution to pause
    """
    logger.info(f"Pausing workflow execution: {execution_id}")

    db = SessionLocal()
    try:
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()

        if execution and execution.status == "running":
            execution.status = "paused"
            db.commit()
            logger.info(f"Workflow {execution_id} paused")
        else:
            logger.warning(f"Cannot pause workflow {execution_id} - not running")

    finally:
        db.close()


@celery_app.task(name="tasks.workflow_tasks.resume_workflow")
def resume_workflow(execution_id: str):
    """
    Resume a paused workflow

    Args:
        execution_id: ID of the WorkflowExecution to resume
    """
    logger.info(f"Resuming workflow execution: {execution_id}")

    db = SessionLocal()
    try:
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()

        if execution and execution.status == "paused":
            execution.status = "running"
            db.commit()

            # Re-trigger execution
            execute_workflow.delay(execution_id)
            logger.info(f"Workflow {execution_id} resumed")
        else:
            logger.warning(f"Cannot resume workflow {execution_id} - not paused")

    finally:
        db.close()


@celery_app.task(name="tasks.workflow_tasks.stop_workflow")
def stop_workflow(execution_id: str):
    """
    Stop a running workflow

    Args:
        execution_id: ID of the WorkflowExecution to stop
    """
    logger.info(f"Stopping workflow execution: {execution_id}")

    db = SessionLocal()
    try:
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()

        if execution and execution.status in ["running", "paused"]:
            execution.status = "stopped"
            execution.completed_at = datetime.utcnow()
            db.commit()
            logger.info(f"Workflow {execution_id} stopped")
        else:
            logger.warning(f"Cannot stop workflow {execution_id} - not running/paused")

    finally:
        db.close()
