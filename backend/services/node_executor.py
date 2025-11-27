"""
Node Executor - Execute individual workflow nodes

Handles different node types:
- generate_copy: Generate text content
- generate_image: Generate images
- attach: Attach images to documents
- review: Human review checkpoint
- parallel: Parallel execution
"""

import os
import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from models import WorkflowExecution, AgentJob, Document
from datetime import datetime
import uuid
import sys
import base64
import httpx

# Add parent directory to path for imports
sys.path.append('/app')

# Import existing services
# Import existing services
from llm_service import chat_completion
from image_generation_service import generate_image_openrouter
from image_naming_service import generate_image_title
from minio_service import upload_file
from services.context_retrieval import retrieve_workflow_context

logger = logging.getLogger(__name__)


async def execute_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Dispatcher for node execution

    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session

    Returns:
        Node execution result
    """
    node_type = node.get("type")

    # Route to specific handler
    handlers = {
        "generate_copy": execute_generate_copy_node,
        "text_generation": execute_generate_copy_node,  # Alias for compatibility
        "generate_image": execute_generate_image_node,
        "image_generation": execute_generate_image_node,  # Alias for compatibility
        "attach": execute_attach_to_document_node,
        "review": execute_review_node,
        "parallel": execute_parallel_node,
        "conditional": execute_conditional_node,
        "finish": execute_finish_node,
        "context_retrieval": execute_context_retrieval_node,
        "processing": execute_processing_node,
    }

    handler = handlers.get(node_type)

    if not handler:
        raise ValueError(f"Unknown node type: {node_type}")

    # Create agent job
    job = AgentJob(
        id=str(uuid.uuid4()),
        execution_id=execution.id,
        node_id=node["id"],
        job_type=node_type,
        status="pending",
        input_data_json=node.get("data", {}),
        started_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()

    try:
        # Execute node
        job.status = "running"
        db.commit()

        result = await handler(node, execution, db)

        # Mark as completed
        job.status = "completed"
        job.output_data_json = result
        job.completed_at = datetime.utcnow()
        db.commit()

        return result

    except Exception as e:
        logger.error(f"Node execution failed: {e}")
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.utcnow()
        db.commit()
        raise


async def execute_generate_copy_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute generate_copy node

    Creates draft documents with AI-generated text

    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session

    Returns:
        Dict with document_ids
    """
    data = node.get("data", {})
    prompt_template = data.get("prompt", "")
    model = data.get("model", "openai/gpt-5.1")
    temperature = data.get("temperature", 0.7)

    # Replace template variables with config values
    prompt = prompt_template
    for key, value in execution.config_json.items():
        prompt = prompt.replace(f"{{{key}}}", str(value))

    logger.info(f"Generating copy with prompt: {prompt[:100]}...")

    # Call LLM service
    response = await chat_completion(
        messages=[{"role": "user", "content": prompt}],
        model=model,
        temperature=temperature
    )

    # Extract content from response
    content = response.get("choices", [{}])[0].get("message", {}).get("content", "")

    # Create draft document
    document = Document(
        id=str(uuid.uuid4()),
        project_id=execution.project_id,
        title=data.get("title", f"Generated Copy - {node['id']}"),
        content=content,
        status="draft",
        media_type="text",
        created_at=datetime.utcnow()
    )
    db.add(document)
    db.commit()

    logger.info(f"Created document {document.id}")

    return {
        "document_ids": [document.id],
        "content_length": len(content)
    }


async def execute_generate_image_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute generate_image node

    Creates image documents with AI-generated images

    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session

    Returns:
        Dict with image_ids
    """
    from image_generation_service import generate_and_store_image

    data = node.get("data", {})
    prompt_template = data.get("prompt", "")
    model = data.get("model", "google/gemini-3-pro-image-preview")
    aspect_ratio = data.get("aspect_ratio", "1:1")
    quality = data.get("quality", "standard")

    # Replace template variables
    prompt = prompt_template
    for key, value in execution.config_json.items():
        prompt = prompt.replace(f"{{{key}}}", str(value))

    logger.info(f"Generating image with prompt: {prompt[:100]}...")

    # Generate and store image
    result = await generate_and_store_image(
        prompt=prompt,
        project_id=execution.project_id,
        model=model,
        aspect_ratio=aspect_ratio,
        quality=quality
    )

    # Create document record for the image
    # Generate AI title if not provided in node config
    if data.get("title"):
        image_title = data.get("title")
    else:
        image_title = await generate_image_title(prompt)
        logger.info(f"Generated AI title: {image_title}")

    document = Document(
        id=str(uuid.uuid4()),
        project_id=execution.project_id,
        title=image_title,
        content=prompt,  # Store prompt as content
        media_type="image",
        status="approved",
        file_url=result["file_url"],
        thumbnail_url=result["thumbnail_url"],
        generation_metadata=result["generation_metadata"],
        created_at=datetime.utcnow()
    )
    db.add(document)
    db.commit()

    logger.info(f"Created image document {document.id}")

    return {
        "image_ids": [document.id],
        "file_url": result["file_url"]
    }


async def execute_attach_to_document_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute attach node

    Attaches images to copy documents

    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session

    Returns:
        Dict with attachment info
    """
    data = node.get("data", {})
    document_ref = data.get("document_ref")
    image_ref = data.get("image_ref")
    is_primary = data.get("is_primary", False)

    # TODO: Implement document attachment logic
    # Need to track node outputs in execution context
    # For now, just log

    logger.info(f"Attaching image {image_ref} to document {document_ref}")

    return {
        "attached": True,
        "document_ref": document_ref,
        "image_ref": image_ref
    }


async def execute_review_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute review node

    Pauses workflow for human review

    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session

    Returns:
        Dict with review status
    """
    logger.info(f"Pausing workflow {execution.id} for review")

    # Pause execution
    execution.status = "paused"
    db.commit()

    # TODO: Send notification to user

    return {
        "status": "awaiting_review"
    }


async def execute_parallel_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute parallel node

    Executes multiple nodes concurrently

    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session

    Returns:
        Dict with parallel execution results
    """
    # TODO: Implement Celery group execution
    logger.info(f"Parallel execution not yet implemented")

    return {
        "status": "parallel_execution_pending"
    }


async def execute_conditional_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute conditional node

    Evaluates a condition and branches execution

    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session

    Returns:
        Dict with branch decision (true/false)
    """
    data = node.get("data", {})
    condition = data.get("condition", "")

    logger.info(f"Evaluating condition: {condition}")

    # Simple condition evaluation (can be enhanced with AI evaluation)
    # For now, check if condition string evaluates to truthy value
    try:
        # Basic evaluation: check if any documents were generated in previous nodes
        # This is a simple implementation - can be enhanced with AI-based evaluation
        result = True  # Default to true branch

        if "no documents" in condition.lower():
            # Check if we have any documents
            docs = db.query(Document).filter(
                Document.project_id == execution.project_id
            ).limit(1).all()
            result = len(docs) == 0

        return {
            "branch": "true" if result else "false",
            "condition_evaluated": condition,
            "result": result
        }

    except Exception as e:
        logger.error(f"Condition evaluation failed: {e}")
        # Default to true branch on error
        return {
            "branch": "true",
            "condition_evaluated": condition,
            "result": True,
            "error": str(e)
        }


async def execute_finish_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute finish node

    Finalizes workflow execution, saves results, and notifies user

    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session

    Returns:
        Dict with execution summary
    """
    data = node.get("data", {})
    save_to_project = data.get("saveToProject", True)
    document_title = data.get("documentTitle")
    notify_user = data.get("notifyUser", False)

    logger.info(f"Executing finish node for execution {execution.id}")

    result = {
        "status": "completed",
        "saved_documents": [],
        "notification_sent": False
    }

    # 1. Handle Document Saving
    if save_to_project and execution.generated_document_ids:
        # If we have generated documents, update their status to 'approved' or 'production'
        # and optionally update title if provided
        
        doc_ids = execution.generated_document_ids
        documents = db.query(Document).filter(Document.id.in_(doc_ids)).all()
        
        for doc in documents:
            # Update status from draft to approved
            if doc.status == "draft":
                doc.status = "approved"
            
            # Update title if provided (and if it's a single document or we append index)
            if document_title:
                if len(documents) > 1:
                    # Append index for multiple docs
                    # Find index in list
                    try:
                        idx = doc_ids.index(doc.id)
                        doc.title = f"{document_title} ({idx + 1})"
                    except ValueError:
                        doc.title = document_title
                else:
                    doc.title = document_title
            
            result["saved_documents"].append(doc.id)
        
        db.commit()
        logger.info(f"Finalized {len(documents)} documents for project {execution.project_id}")

    # 2. Handle Notification
    if notify_user:
        # TODO: Implement actual notification service (email/websocket)
        # For now, we just log it
        logger.info(f"Sending completion notification to user {execution.user_id}")
        result["notification_sent"] = True

    return result


async def execute_context_retrieval_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute context retrieval node
    
    Fetches relevant documents from knowledge base
    
    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session
        
    Returns:
        Dict with retrieved context and documents
    """
    data = node.get("data", {})
    query = data.get("query", "")
    folder_ids = data.get("folderIds", [])
    max_results = data.get("maxResults", 5)
    use_rag = data.get("useRag", True)

    logger.info(f"Retrieving context for query: {query}")

    # Note: Variable resolution is handled by WorkflowExecutor before calling this
    
    context = await retrieve_workflow_context(
        db=db,
        project_id=execution.project_id,
        context_params={
            "query": query,
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


async def execute_processing_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute processing node (AI task)
    
    Processes input text using AI model (summarization, extraction, etc.)
    
    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session
        
    Returns:
        Dict with processing result
    """
    # Reuse text generation logic as processing is essentially text generation
    # with specific prompts/instructions
    return await execute_generate_copy_node(node, execution, db)
