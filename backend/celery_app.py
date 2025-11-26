"""
Celery Application Configuration for XTYL Workflow System

This module configures Celery for async task execution of AI workflows.
"""

import os
from celery import Celery

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# Create Celery app
celery_app = Celery(
    "xtyl_workflows",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "tasks.workflow_tasks",  # Import workflow task modules
    ]
)

# Celery configuration
celery_app.conf.update(
    # Task execution settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task result settings
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={"master_name": "mymaster"},

    # Task routing and priority
    task_routes={
        "tasks.workflow_tasks.*": {"queue": "workflows"},
    },
    task_default_queue="workflows",
    task_default_exchange="workflows",
    task_default_routing_key="workflow.default",

    # Worker settings
    worker_prefetch_multiplier=1,  # Don't prefetch tasks
    worker_max_tasks_per_child=100,  # Restart worker after 100 tasks to prevent memory leaks

    # Retry settings
    task_acks_late=True,  # Acknowledge tasks after completion (safer)
    task_reject_on_worker_lost=True,  # Reject tasks if worker dies

    # Rate limits
    task_default_rate_limit="10/m",  # Default: 10 tasks per minute

    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
)

# Optional: Beat schedule for periodic tasks (future use)
celery_app.conf.beat_schedule = {
    # Example: Clean up old executions every day
    # 'cleanup-old-executions': {
    #     'task': 'tasks.workflow_tasks.cleanup_old_executions',
    #     'schedule': crontab(hour=2, minute=0),  # Run at 2 AM daily
    # },
}

if __name__ == "__main__":
    celery_app.start()
