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
from storage_service import upload_file
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
        "start": execute_start_node,
        "generate_copy": execute_generate_copy_node,
        "text_generation": execute_generate_copy_node,  # Alias for compatibility
        "generate_image": execute_generate_image_node,
        "image_generation": execute_generate_image_node,  # Alias for compatibility
        "attach": execute_attach_to_document_node,
        "attach_creative": execute_attach_to_document_node,  # Alias for compatibility
        "review": execute_review_node,
        "parallel": execute_parallel_node,
        "conditional": execute_conditional_node,
        "loop": execute_loop_node,
        "finish": execute_finish_node,
        "context_retrieval": execute_context_retrieval_node,
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


async def execute_start_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute start node

    Initializes the workflow execution with input variables.
    This is typically the entry point of a workflow.

    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session

    Returns:
        Dict with input variables passed through
    """
    data = node.get("data", {})
    input_variables = data.get("inputVariables", [])

    logger.info(f"Starting workflow execution {execution.id}")

    # Pass through any input variables defined in the start node
    result = {
        "status": "started",
        "input_variables": {}
    }

    # Extract input variable values from execution config
    for var in input_variables:
        var_name = var.get("name")
        if var_name and execution.config_json:
            result["input_variables"][var_name] = execution.config_json.get(
                var_name, var.get("defaultValue", "")
            )

    return result


async def execute_loop_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute loop node

    Manages iteration over a set of items or a fixed number of iterations.
    Note: Actual loop logic is handled by LoopExecutor in workflow_executor.

    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session

    Returns:
        Dict with loop status
    """
    data = node.get("data", {})
    iterations = data.get("iterations")
    condition = data.get("condition")

    logger.info(f"Loop node: iterations={iterations}, condition={condition}")

    return {
        "status": "loop_initialized",
        "iterations": iterations,
        "condition": condition,
        "current_iteration": 0
    }


async def execute_generate_copy_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute generate_copy node

    Creates draft documents with AI-generated text.

    If save_as_document is False, only returns the generated content without
    persisting to the database. This is useful for intermediate processing steps.

    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session

    Returns:
        Dict with content (and document_ids if save_as_document is True)
    """
    data = node.get("data", {})
    prompt_template = data.get("prompt", "")
    model = data.get("model", "openai/gpt-5.1")
    temperature = data.get("temperature", 0.7)
    save_as_document = data.get("save_as_document", True)  # Default to True for backwards compatibility

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

    # If save_as_document is False, just return the content without persisting
    if not save_as_document:
        logger.info(f"Generated content (not saved as document): {len(content)} chars")
        return {
            "content": content,
            "content_length": len(content),
            "document_ids": [],  # Empty list since no document was created
            "title": data.get("title", f"Generated Copy - {node['id']}")
        }

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
        "content_length": len(content),
        "content": content,  # Include content for variable resolution in downstream nodes
        "title": document.title
    }


async def execute_generate_image_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute generate_image node

    Creates image documents with AI-generated images.
    Note: Variable resolution ({{node.field}}) is handled by WorkflowExecutor
    before this function is called.

    Args:
        node: Node configuration (with variables already resolved)
        execution: Workflow execution
        db: Database session

    Returns:
        Dict with image_ids and file_url
    """
    from image_generation_service import generate_and_store_image

    data = node.get("data", {})
    # Prompt should already have {{node.field}} variables resolved by WorkflowExecutor
    prompt = data.get("prompt", "")
    model = data.get("model", "google/gemini-3-pro-image-preview")
    aspect_ratio = data.get("aspect_ratio", "1:1")
    quality = data.get("quality", "standard")

    # Also support legacy {key} syntax for execution config (backwards compatibility)
    if execution.config_json:
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
        status="art_ok",
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
        "file_url": result["file_url"],
        "thumbnail_url": result.get("thumbnail_url"),
        "title": image_title,
        "prompt": prompt  # Include resolved prompt for reference
    }


async def execute_attach_to_document_node(
    node: Dict[str, Any],
    execution: WorkflowExecution,
    db: Session
) -> Dict[str, Any]:
    """
    Execute attach node

    Attaches images to copy documents. Supports two source modes:
    - from_node: Get document/image from connected node outputs
    - from_project: Use existing document/image from project by ID

    Args:
        node: Node configuration
        execution: Workflow execution
        db: Database session

    Returns:
        Dict with attachment info including document and image IDs
    """
    data = node.get("data", {})

    # Source configuration
    document_source = data.get("documentSource", "from_node")
    image_source = data.get("imageSource", "from_node")

    # Get document ID based on source
    document_id = None
    if document_source == "from_project":
        # Use explicit document ID from project
        document_id = data.get("documentId")
        if not document_id:
            logger.warning("AttachNode: documentSource is 'from_project' but no documentId provided")
    else:
        # from_node: document comes from connected node (resolved by workflow executor)
        document_ref = data.get("document_ref")
        if document_ref:
            # document_ref could be a document ID or a reference like "{{node.document_ids[0]}}"
            document_id = document_ref

    # Get image ID based on source
    image_id = None
    if image_source == "from_project":
        # Use explicit image ID from project
        image_id = data.get("imageId")
        if not image_id:
            logger.warning("AttachNode: imageSource is 'from_project' but no imageId provided")
    else:
        # from_node: image comes from connected node (resolved by workflow executor)
        image_ref = data.get("image_ref")
        if image_ref:
            image_id = image_ref

    logger.info(f"AttachNode: document_id={document_id}, image_id={image_id}")
    logger.info(f"AttachNode: document_source={document_source}, image_source={image_source}")

    # If we have both IDs, we can update the document with the image reference
    if document_id and image_id:
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if document:
                # Store image reference in document metadata or as thumbnail
                if not document.thumbnail_url:
                    # Get image document to get its URL
                    image_doc = db.query(Document).filter(Document.id == image_id).first()
                    if image_doc and image_doc.file_url:
                        document.thumbnail_url = image_doc.thumbnail_url or image_doc.file_url
                        db.commit()
                        logger.info(f"Updated document {document_id} with image from {image_id}")
        except Exception as e:
            logger.error(f"Failed to attach image to document: {e}")

    return {
        "attached": True,
        "document_id": document_id,
        "image_id": image_id,
        "document_source": document_source,
        "image_source": image_source
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
            # Update status from draft to done
            if doc.status == "draft":
                doc.status = "done"
            
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


