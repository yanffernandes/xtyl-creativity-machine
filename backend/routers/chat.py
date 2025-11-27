from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import asyncio
from database import get_db, SessionLocal
from auth import get_current_user
from models import User, Project, Workspace, UserPreferences
from llm_service import list_models, chat_completion, chat_completion_stream
from crud import get_user_preferences
from rag_service import query_knowledge_base
from tools import TOOL_DEFINITIONS, execute_tool
from vision_service import vision_service
from ai_usage_service import log_ai_usage
from attachment_service import attachment_service
import json
import os
import uuid
import time
import redis

router = APIRouter(
    prefix="/chat",
    tags=["chat"],
)

# Redis client for shared state across workers
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
redis_client = redis.from_url(redis_url, decode_responses=True)


def _get_tool_description(tool_name: str, args: dict) -> str:
    """Generate a human-readable description for a tool call."""
    descriptions = {
        "read_document": lambda a: f"Ler documento: {a.get('title', a.get('document_id', 'documento'))}",
        "edit_document": lambda a: f"Editar documento: {a.get('title', a.get('document_id', 'documento'))}",
        "create_document": lambda a: f"Criar documento: {a.get('title', 'novo documento')}",
        "create_folder": lambda a: f"Criar pasta: {a.get('name', 'nova pasta')}",
        "list_documents": lambda a: "Listar documentos do projeto",
        "list_folders": lambda a: "Listar pastas do projeto",
        "search_documents": lambda a: f"Buscar documentos: {a.get('query', 'busca')[:30]}",
        "move_file": lambda a: f"Mover arquivo para: {a.get('destination', 'destino')}",
        "move_folder": lambda a: f"Mover pasta para: {a.get('destination', 'destino')}",
        "delete_file": lambda a: f"Deletar arquivo: {a.get('title', a.get('file_id', 'arquivo'))}",
        "delete_folder": lambda a: f"Deletar pasta: {a.get('name', a.get('folder_id', 'pasta'))}",
        "web_search": lambda a: f"Pesquisar na web: {a.get('query', 'busca')[:30]}",
        "generate_image": lambda a: f"Gerar imagem: {a.get('prompt', 'imagem')[:30]}",
        "rename_document": lambda a: f"Renomear documento para: {a.get('new_title', 'novo nome')}",
        "rename_folder": lambda a: f"Renomear pasta para: {a.get('new_name', 'novo nome')}",
        "get_folder_contents": lambda a: f"Listar conteúdo da pasta",
    }

    if tool_name in descriptions:
        return descriptions[tool_name](args)
    return f"Executar: {tool_name}"


# Global storage for running tool tasks to allow cancellation
# Key: tool_call_id, Value: asyncio.Task
running_tool_tasks: Dict[str, asyncio.Task] = {}

# Timeout configuration (seconds)
TOOL_TIMEOUTS = {
    "generate_image": 120.0,
    "default": 60.0
}

def store_approval_request(approval_id: str, tool_name: str, tool_args: dict):
    """Store approval request in Redis with 5 minute expiry"""
    data = json.dumps({
        "tool_name": tool_name,
        "tool_args": tool_args,
        "approved": None,
        "timestamp": time.time()
    })
    redis_client.setex(f"approval:{approval_id}", 300, data)  # 5 min TTL

def get_approval_request(approval_id: str) -> Optional[Dict]:
    """Get approval request from Redis"""
    data = redis_client.get(f"approval:{approval_id}")
    return json.loads(data) if data else None

def update_approval_response(approval_id: str, approved: bool):
    """Update approval response in Redis"""
    data = get_approval_request(approval_id)
    if data:
        data["approved"] = approved
        redis_client.setex(f"approval:{approval_id}", 300, json.dumps(data))

def delete_approval_request(approval_id: str):
    """Delete approval request from Redis"""
    redis_client.delete(f"approval:{approval_id}")

def get_workspace_id_from_project(db: Session, project_id: Optional[str]) -> Optional[str]:
    """Get workspace_id from project_id."""
    if not project_id:
        return None
    project = db.query(Project).filter(Project.id == project_id).first()
    return project.workspace_id if project else None

class Attachment(BaseModel):
    type: str  # 'image', 'pdf_text', 'pdf_image'
    content: str  # The extracted/analyzed content
    filename: str
    metadata: Optional[Dict[str, Any]] = None

class ChatMessage(BaseModel):
    role: str
    content: str
    attachments: Optional[List[Attachment]] = None  # Attachments with this message

class CurrentDocument(BaseModel):
    id: str
    title: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str
    project_id: Optional[str] = None
    use_rag: bool = False
    current_document: Optional[CurrentDocument] = None
    document_ids: Optional[List[str]] = None  # IDs of selected context documents
    folder_ids: Optional[List[str]] = None  # IDs of selected folders (all docs inside)
    autonomous_mode: bool = False  # Execute all tools without approval when True

class ToolApprovalResponse(BaseModel):
    approval_id: str
    approved: bool

@router.get("/models")
async def get_available_models(current_user: User = Depends(get_current_user)):
    return await list_models()

@router.post("/upload-attachment")
async def upload_attachment(
    file: UploadFile = File(...),
    project_id: Optional[str] = None,
    user_question: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and process an attachment (image or PDF).
    Returns the processed content that can be included in a chat message.
    """
    # Check if file type is supported
    if not attachment_service.is_supported_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported formats: images (jpg, png, gif, etc.) and PDF"
        )

    # Read file content
    file_content = await file.read()

    # Get workspace settings to determine which model to use
    workspace_id = get_workspace_id_from_project(db, project_id)
    attachment_model = None

    if workspace_id:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if workspace and workspace.attachment_analysis_model:
            attachment_model = workspace.attachment_analysis_model
        elif workspace and workspace.default_vision_model:
            # Fallback to default vision model
            attachment_model = workspace.default_vision_model

    # Process attachment
    try:
        result = await attachment_service.process_attachment(
            file_content=file_content,
            filename=file.filename,
            model=attachment_model,
            user_question=user_question
        )

        return {
            "success": True,
            "attachment": result
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Error processing attachment: {e}")
        raise HTTPException(status_code=500, detail="Failed to process attachment")

@router.post("/tool-approval")
async def respond_to_tool_approval(
    response: ToolApprovalResponse,
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint to respond to a tool approval request.
    The streaming endpoint waits for this response before executing tools.
    """
    approval_id = response.approval_id

    print(f"📨 Received approval response for: {approval_id}")

    # Check if approval exists in Redis
    approval_data = get_approval_request(approval_id)
    if not approval_data:
        print(f"❌ Approval ID {approval_id} not found in Redis!")
        raise HTTPException(status_code=404, detail="Approval request not found or expired")

    # Update the approval status in Redis (the streaming endpoint polls this)
    update_approval_response(approval_id, response.approved)
    print(f"✅ Approval status updated in Redis: {response.approved}")

    return {"success": True, "approval_id": approval_id, "approved": response.approved}

class ToolCancelRequest(BaseModel):
    tool_call_id: str

@router.post("/tool-cancel")
async def cancel_tool_execution(
    request: ToolCancelRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Cancel a running tool execution.
    """
    tool_call_id = request.tool_call_id
    print(f"🛑 Received cancellation request for tool call: {tool_call_id}")
    
    if tool_call_id in running_tool_tasks:
        task = running_tool_tasks[tool_call_id]
        task.cancel()
        print(f"✅ Task {tool_call_id} cancelled")
        return {"success": True, "message": "Tool execution cancelled"}
    
    print(f"⚠️ Task {tool_call_id} not found in running tasks")
    return {"success": False, "message": "Tool execution not found or already completed"}

@router.post("/completion")
async def generate_chat_completion(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Build messages including attachments
    messages = []
    for m in request.messages:
        msg_content = m.content

        # If message has attachments, prepend them to the content
        if m.attachments:
            attachment_texts = []
            for att in m.attachments:
                att_text = f"\n\n**[Attached {att.type.upper()}: {att.filename}]**\n{att.content}\n"
                attachment_texts.append(att_text)

            msg_content = "".join(attachment_texts) + "\n" + msg_content

        messages.append({"role": m.role, "content": msg_content})

    # Build system prompt with context
    system_parts = ["""You are a helpful AI assistant for content creation.

CRITICAL FORMATTING RULES:
1. ALWAYS use Markdown formatting in your responses (not HTML)
2. Use ## for headings, **bold**, *italic*, - for lists, ` for code
3. NEVER use HTML tags like <p>, <h1>, <div> in your text responses
4. When editing documents with edit_document tool, use the format the document already has

IMPORTANT: You have access to powerful tools that allow you to directly edit documents, read files, and perform actions.
When a user asks you to make changes to a document, you should ALWAYS use the tools (especially edit_document) to make those changes directly,
rather than just suggesting changes in your response. Taking action is preferred over describing what should be done.

Available actions:
- When editing content: Use edit_document tool immediately
- When reading files: Use read_document tool
- When creating content: Use appropriate tools to create and populate documents

IMAGE GENERATION RULES (CRITICAL):
- When generating images for a document, you MUST use the attach_to_document_id parameter in the generate_image tool
- Do NOT manually add markdown image syntax (![...](...)) to document content - this is forbidden
- The generate_image tool will automatically attach the image to the document's attached images section
- Example: generate_image(project_id="...", prompt="...", attach_to_document_id="document-id-here")
- If you need to attach an existing image, use attach_image_to_document tool

Only provide explanatory text when tools cannot accomplish the task or when the user specifically asks for suggestions."""]

    # Add current document context if available
    if request.current_document and request.use_rag:
        system_parts.append(f"""
Current Document Context:
- ID: {request.current_document.id}
- Title: {request.current_document.title}
- Content:
{request.current_document.content}

IMPORTANT: When working with this document:
- To edit text: use edit_document tool with document_id="{request.current_document.id}"
- To generate and attach images: use generate_image tool with attach_to_document_id="{request.current_document.id}"
- NEVER add markdown image syntax to the document content manually
""")

    # Add selected documents context if available
    if request.use_rag and (request.document_ids or request.folder_ids):
        from models import Document as DBDocument

        # Collect all document IDs (from direct selection and folders)
        all_doc_ids = list(request.document_ids) if request.document_ids else []

        # Add documents from selected folders
        if request.folder_ids:
            folder_docs = db.query(DBDocument).filter(
                DBDocument.folder_id.in_(request.folder_ids),
                DBDocument.deleted_at == None
            ).all()
            all_doc_ids.extend([doc.id for doc in folder_docs])

        # Remove duplicates
        all_doc_ids = list(set(all_doc_ids))

        if all_doc_ids:
            selected_docs = db.query(DBDocument).filter(DBDocument.id.in_(all_doc_ids)).all()

            if selected_docs:
                system_parts.append("\nSelected Context Documents:")
                for doc in selected_docs:
                    # Truncate very long documents to avoid token limits
                    content_preview = doc.content[:2000] if doc.content else ""
                    if doc.content and len(doc.content) > 2000:
                        content_preview += "\n... (content truncated)"

                    system_parts.append(f"""
- Document: {doc.title} (ID: {doc.id})
  Content:
{content_preview}
""")

    # Add RAG context if available (semantic search when no specific docs selected)
    if request.use_rag and request.project_id and not request.current_document and not request.document_ids:
        last_user_message = messages[-1]["content"]
        docs = query_knowledge_base(
            last_user_message,
            project_id=request.project_id,
            document_ids=request.document_ids if request.document_ids else None
        )

        if docs:
            context_text = "\n\n".join([doc.page_content for doc in docs])
            system_parts.append(f"""
Retrieved Context:
{context_text}
""")
    
    
    # Insert system prompt
    system_prompt = "\n".join(system_parts)
    if not messages or messages[0]["role"] != "system":
        messages.insert(0, {"role": "system", "content": system_prompt})
    
    # Tool calling loop (max 5 iterations to prevent infinite loops)
    max_iterations = 5
    iteration = 0
    total_input_tokens = 0
    total_output_tokens = 0
    start_time = time.time()
    tool_names_used = []

    while iteration < max_iterations:
        iteration += 1

        # Call LLM with tools
        response = await chat_completion(
            messages,
            model=request.model,
            tools=TOOL_DEFINITIONS
        )

        # Track token usage
        usage = response.get("usage", {})
        total_input_tokens += usage.get("prompt_tokens", 0)
        total_output_tokens += usage.get("completion_tokens", 0)

        # Check if AI wants to use tools
        response_message = response.get("choices", [{}])[0].get("message", {})
        tool_calls = response_message.get("tool_calls", [])

        if not tool_calls:
            # No tools to call, log usage and return the response
            duration_ms = int((time.time() - start_time) * 1000)

            # Get user message preview and assistant response preview
            user_msg = next((m.content for m in reversed(request.messages) if m.role == "user"), "")
            assistant_msg = response_message.get("content", "")

            # Log AI usage
            log_ai_usage(
                db=db,
                user_id=current_user.id,
                workspace_id=get_workspace_id_from_project(db, request.project_id),
                project_id=request.project_id,
                model=request.model,
                provider="openrouter",  # TODO: Detect from model string
                request_type="chat" if not tool_names_used else "tool_call",
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens,
                prompt_preview=user_msg,
                response_preview=assistant_msg,
                tool_calls=tool_names_used if tool_names_used else None,
                duration_ms=duration_ms
            )

            return response
        
        # Add assistant's message with tool calls to history
        messages.append(response_message)
        
        # Execute each tool call
        for tool_call in tool_calls:
            tool_name = tool_call["function"]["name"]
            tool_args = json.loads(tool_call["function"]["arguments"])

            # Inject real project_id for tools that need it
            # (LLM may pass "current_project" or similar placeholder)
            if "project_id" in tool_args:
                tool_args["project_id"] = request.project_id

            # Track tool names
            if tool_name not in tool_names_used:
                tool_names_used.append(tool_name)

            # Execute the tool
            tool_result = await execute_tool(tool_name, tool_args, db)

            # Add tool result to messages
            # Note: Gemini doesn't accept "name" field in tool messages
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call["id"],
                "content": json.dumps(tool_result)
            })

        # Continue loop to let AI process tool results

    # If we hit max iterations, log usage and return last response
    duration_ms = int((time.time() - start_time) * 1000)
    user_msg = next((m.content for m in reversed(request.messages) if m.role == "user"), "")
    assistant_msg = response.get("choices", [{}])[0].get("message", {}).get("content", "")

    log_ai_usage(
        db=db,
        user_id=current_user.id,
        workspace_id=get_workspace_id_from_project(db, request.project_id),
        project_id=request.project_id,
        model=request.model,
        provider="openrouter",
        request_type="tool_call",
        input_tokens=total_input_tokens,
        output_tokens=total_output_tokens,
        prompt_preview=user_msg,
        response_preview=assistant_msg,
        tool_calls=tool_names_used,
        duration_ms=duration_ms
    )

    return response


@router.post("/completion-stream")
async def generate_chat_completion_stream(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Streaming version of chat completion with real-time progress updates.
    Returns Server-Sent Events (SSE) with status updates, tool execution, and final response.
    """
    async def event_generator():
        try:
            print(f"\n{'='*80}")
            print(f"🤖 STREAMING CHAT REQUEST STARTED")
            print(f"{'='*80}")
            print(f"Model: {request.model}")
            print(f"Project ID: {request.project_id}")
            print(f"Use RAG: {request.use_rag}")
            print(f"Current Document: {request.current_document.id if request.current_document else None}")
            print(f"Document IDs: {request.document_ids}")
            print(f"User ID: {current_user.id}")

            # Build messages including attachments
            messages = []
            for m in request.messages:
                msg_content = m.content

                # If message has attachments, prepend them to the content
                if m.attachments:
                    attachment_texts = []
                    for att in m.attachments:
                        att_text = f"\n\n**[Attached {att.type.upper()}: {att.filename}]**\n{att.content}\n"
                        attachment_texts.append(att_text)

                    msg_content = "".join(attachment_texts) + "\n" + msg_content

                messages.append({"role": m.role, "content": msg_content})

            print(f"Messages count: {len(messages)}")
            if messages:
                last_msg = messages[-1]['content']
                print(f"Last user message: {last_msg[:100]}..." if len(last_msg) > 100 else f"Last user message: {last_msg}")

            # Build system prompt (same as non-streaming version)
            system_parts = ["""You are a helpful AI assistant for content creation.

CRITICAL FORMATTING RULES:
1. ALWAYS use Markdown formatting in your responses (not HTML)
2. Use ## for headings, **bold**, *italic*, - for lists, ` for code
3. NEVER use HTML tags like <p>, <h1>, <div> in your text responses
4. When editing documents with edit_document tool, use the format the document already has

IMPORTANT: You have access to powerful tools that allow you to directly edit documents, read files, and perform actions.
When a user asks you to make changes to a document, you should ALWAYS use the tools (especially edit_document) to make those changes directly,
rather than just suggesting changes in your response. Taking action is preferred over describing what should be done.

Available actions:
- When editing content: Use edit_document tool immediately
- When reading files: Use read_document tool
- When creating content: Use appropriate tools to create and populate documents

IMAGE GENERATION RULES (CRITICAL):
- When generating images for a document, you MUST use the attach_to_document_id parameter in the generate_image tool
- Do NOT manually add markdown image syntax (![...](...)) to document content - this is forbidden
- The generate_image tool will automatically attach the image to the document's attached images section
- Example: generate_image(project_id="...", prompt="...", attach_to_document_id="document-id-here")
- If you need to attach an existing image, use attach_image_to_document tool

Only provide explanatory text when tools cannot accomplish the task or when the user specifically asks for suggestions."""]

            # Add current document context
            if request.current_document and request.use_rag:
                system_parts.append(f"""
Current Document Context:
- ID: {request.current_document.id}
- Title: {request.current_document.title}
- Content:
{request.current_document.content}

IMPORTANT: When working with this document:
- To edit text: use edit_document tool with document_id="{request.current_document.id}"
- To generate and attach images: use generate_image tool with attach_to_document_id="{request.current_document.id}"
- NEVER add markdown image syntax to the document content manually
""")

            # Add selected documents context
            if request.use_rag and (request.document_ids or request.folder_ids):
                from models import Document as DBDocument

                # Collect all document IDs (from direct selection and folders)
                all_doc_ids = list(request.document_ids) if request.document_ids else []

                # Add documents from selected folders
                if request.folder_ids:
                    folder_docs = db.query(DBDocument).filter(
                        DBDocument.folder_id.in_(request.folder_ids),
                        DBDocument.deleted_at == None
                    ).all()
                    all_doc_ids.extend([doc.id for doc in folder_docs])

                # Remove duplicates
                all_doc_ids = list(set(all_doc_ids))

                if all_doc_ids:
                    selected_docs = db.query(DBDocument).filter(DBDocument.id.in_(all_doc_ids)).all()

                    if selected_docs:
                        system_parts.append("\nSelected Context Documents:")
                        for doc in selected_docs:
                            content_preview = doc.content[:2000] if doc.content else ""
                            if doc.content and len(doc.content) > 2000:
                                content_preview += "\n... (content truncated)"

                            system_parts.append(f"""
- Document: {doc.title} (ID: {doc.id})
  Content:
{content_preview}
""")

            # Add RAG context
            if request.use_rag and request.project_id and not request.current_document and not request.document_ids:
                last_user_message = messages[-1]["content"]
                docs = query_knowledge_base(
                    last_user_message,
                    project_id=request.project_id,
                    document_ids=request.document_ids if request.document_ids else None
                )

                if docs:
                    context_text = "\n\n".join([doc.page_content for doc in docs])
                    system_parts.append(f"""
Retrieved Context:
{context_text}
""")

            # Build final system prompt
            system_prompt = "\n".join(system_parts)

            if not messages or messages[0]["role"] != "system":
                messages.insert(0, {"role": "system", "content": system_prompt})

            # Send initial status
            yield f"data: {json.dumps({'type': 'status', 'message': 'Iniciando agente IA...'})}\n\n"
            await asyncio.sleep(0.1)  # Small delay for client to connect

            # Tool calling loop with streaming updates
            # Read max_iterations from user preferences, default to 15
            user_prefs = get_user_preferences(db, current_user.id)
            max_iterations = user_prefs.max_iterations if user_prefs else 15
            iteration = 0
            tool_call_history = []  # Track tool calls for infinite loop detection
            total_input_tokens = 0
            total_output_tokens = 0
            start_time = time.time()
            tool_names_used = []

            while iteration < max_iterations:
                iteration += 1
                print(f"\n📍 Iteration {iteration}/{max_iterations}")

                # Send iteration status
                yield f"data: {json.dumps({'type': 'iteration', 'current': iteration, 'max': max_iterations})}\n\n"

                # Send LLM call status
                print(f"⚡ Sending 'Consultando modelo de IA...' status")
                yield f"data: {json.dumps({'type': 'status', 'message': 'Consultando modelo de IA...'})}\n\n"

                # Call LLM with streaming
                print(f"🔄 Calling LLM with model: {request.model} (streaming)")
                llm_start = time.time()

                # Accumulate streaming response
                accumulated_content = ""
                accumulated_tool_calls = []
                usage = {}
                response_message = {}

                try:
                    async for chunk in chat_completion_stream(
                        messages,
                        model=request.model,
                        tools=TOOL_DEFINITIONS
                    ):
                        # Process chunk
                        if "choices" in chunk and len(chunk["choices"]) > 0:
                            delta = chunk["choices"][0].get("delta", {})

                            # Stream content tokens
                            if "content" in delta and delta["content"]:
                                content_chunk = delta["content"]
                                accumulated_content += content_chunk
                                # Send content chunk immediately
                                yield f"data: {json.dumps({'type': 'message_chunk', 'content': content_chunk})}\n\n"

                            # Accumulate tool calls
                            if "tool_calls" in delta:
                                # OpenRouter streams tool calls incrementally
                                for tool_call_delta in delta["tool_calls"]:
                                    index = tool_call_delta.get("index", 0)
                                    # Ensure we have enough space in array
                                    while len(accumulated_tool_calls) <= index:
                                        accumulated_tool_calls.append({
                                            "id": "",
                                            "type": "function",
                                            "function": {"name": "", "arguments": ""}
                                        })

                                    # Accumulate tool call data
                                    if "id" in tool_call_delta:
                                        accumulated_tool_calls[index]["id"] = tool_call_delta["id"]
                                    if "function" in tool_call_delta:
                                        func_delta = tool_call_delta["function"]
                                        if "name" in func_delta:
                                            accumulated_tool_calls[index]["function"]["name"] += func_delta["name"]
                                        if "arguments" in func_delta:
                                            accumulated_tool_calls[index]["function"]["arguments"] += func_delta["arguments"]

                        # Track usage if available
                        if "usage" in chunk:
                            usage = chunk["usage"]

                    llm_duration = int((time.time() - llm_start) * 1000)
                    print(f"✅ LLM streaming completed in {llm_duration}ms")

                except Exception as e:
                    print(f"❌ LLM call failed: {str(e)}")
                    raise

                # Send LLM timing
                yield f"data: {json.dumps({'type': 'timing', 'duration_ms': llm_duration, 'step': 'llm_call'})}\n\n"

                # Track token usage
                total_input_tokens += usage.get("prompt_tokens", 0)
                total_output_tokens += usage.get("completion_tokens", 0)
                print(f"📊 Tokens - Input: {usage.get('prompt_tokens', 0)}, Output: {usage.get('completion_tokens', 0)}")

                # Build response message from accumulated data
                # Note: Some models (like Gemini) don't accept content: null, so use empty string
                response_message = {
                    "role": "assistant",
                    "content": accumulated_content if accumulated_content else ""
                }

                if accumulated_tool_calls:
                    response_message["tool_calls"] = accumulated_tool_calls

                tool_calls = accumulated_tool_calls
                print(f"🔧 Tool calls: {len(tool_calls) if tool_calls else 0}")

                if not tool_calls:
                    # No tools, send usage and done
                    # Send usage stats
                    yield f"data: {json.dumps({'type': 'usage', 'data': usage})}\n\n"

                    # Log AI usage
                    duration_ms = int((time.time() - start_time) * 1000)
                    user_msg = next((m.content for m in reversed(request.messages) if m.role == "user"), "")

                    log_ai_usage(
                        db=db,
                        user_id=current_user.id,
                        workspace_id=get_workspace_id_from_project(db, request.project_id),
                        project_id=request.project_id,
                        model=request.model,
                        provider="openrouter",
                        request_type="chat" if not tool_names_used else "tool_call",
                        input_tokens=total_input_tokens,
                        output_tokens=total_output_tokens,
                        prompt_preview=user_msg,
                        response_preview=accumulated_content,
                        tool_calls=tool_names_used if tool_names_used else None,
                        duration_ms=duration_ms
                    )

                    # Send done signal
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    break

                # Add assistant message to history
                messages.append(response_message)

                # Emit task list for the planned tool executions
                if tool_calls:
                    task_list = []
                    for idx, tc in enumerate(tool_calls):
                        tc_name = tc["function"]["name"]
                        tc_args = json.loads(tc["function"]["arguments"]) if tc["function"]["arguments"] else {}

                        # Generate human-readable description
                        description = _get_tool_description(tc_name, tc_args)

                        task_list.append({
                            "id": f"task-{iteration}-{idx}",
                            "description": description,
                            "tool_name": tc_name,
                            "status": "pending"
                        })

                    # Send task_list event
                    yield f"data: {json.dumps({'type': 'task_list', 'tasks': task_list})}\n\n"

                # Execute tools (with or without approval based on autonomous_mode)
                for i, tool_call in enumerate(tool_calls):
                    tool_name = tool_call["function"]["name"]
                    tool_args = json.loads(tool_call["function"]["arguments"])

                    # DEBUG: Log tool arguments to understand what LLM is passing
                    print(f"🔧 Tool call: {tool_name}")
                    print(f"   Args from LLM: {json.dumps(tool_args, indent=2)}")

                    # Inject real project_id for tools that need it
                    # (LLM may pass "current_project" or similar placeholder)
                    if "project_id" in tool_args:
                        tool_args["project_id"] = request.project_id

                    # Track tool names
                    if tool_name not in tool_names_used:
                        tool_names_used.append(tool_name)

                    # Infinite loop detection: track (tool_name, args_hash)
                    args_hash = hash(json.dumps(tool_args, sort_keys=True))
                    call_signature = (tool_name, args_hash)
                    call_count = tool_call_history.count(call_signature)
                    tool_call_history.append(call_signature)

                    if call_count >= 2:  # 3rd time (0, 1, 2) = infinite loop detected
                        print(f"🔄 Infinite loop detected: {tool_name} called 3 times with same args")
                        yield f"data: {json.dumps({'type': 'status', 'message': f'Loop infinito detectado: {tool_name} executado 3x com mesmos argumentos. Parando execução.'})}\n\n"
                        yield f"data: {json.dumps({'type': 'done'})}\n\n"
                        return

                    approved = True  # Default to approved for autonomous mode

                    # Only request approval if NOT in autonomous mode
                    if not request.autonomous_mode:
                        # Create approval request
                        approval_id = str(uuid.uuid4())

                        # Store in Redis (with pending status)
                        store_approval_request(approval_id, tool_name, tool_args)

                        # Send approval request to frontend
                        approval_request_data = json.dumps({
                            'type': 'tool_approval_request',
                            'approval_id': approval_id,
                            'tool': tool_name,
                            'args': tool_args,
                            'index': i + 1,
                            'total': len(tool_calls)
                        })
                        yield f"data: {approval_request_data}\n\n"
                        print(f"🔔 Waiting for approval for tool: {tool_name}")

                        # Poll Redis for approval response (works across multiple workers)
                        timeout_seconds = 300  # 5 min timeout
                        poll_interval = 0.5  # Check every 500ms
                        elapsed = 0
                        approved = None

                        while elapsed < timeout_seconds:
                            approval_data = get_approval_request(approval_id)
                            if approval_data and approval_data.get("approved") is not None:
                                approved = approval_data.get("approved", False)
                                print(f"✅ Approval response received: {approved}")
                                break
                            await asyncio.sleep(poll_interval)
                            elapsed += poll_interval

                        if approved is None:
                            # Timeout - treat as rejection
                            approved = False
                            print(f"⏱️ Approval timeout for tool: {tool_name}")

                        # Clean up Redis
                        delete_approval_request(approval_id)

                        if not approved:
                            # User rejected - stop execution
                            print(f"❌ User rejected tool: {tool_name}")
                            yield f"data: {json.dumps({'type': 'tool_rejected', 'tool': tool_name})}\n\n"
                            yield f"data: {json.dumps({'type': 'status', 'message': 'Operação cancelada pelo usuário.'})}\n\n"
                            yield f"data: {json.dumps({'type': 'done'})}\n\n"

                            # Log usage before stopping
                            duration_ms = int((time.time() - start_time) * 1000)
                            user_msg = next((m.content for m in reversed(request.messages) if m.role == "user"), "")
                            log_ai_usage(
                                db=db,
                                user_id=current_user.id,
                                workspace_id=get_workspace_id_from_project(db, request.project_id),
                                project_id=request.project_id,
                                model=request.model,
                                provider="openrouter",
                                request_type="tool_call",
                                input_tokens=total_input_tokens,
                                output_tokens=total_output_tokens,
                                prompt_preview=user_msg,
                                response_preview="Operação cancelada pelo usuário",
                                tool_calls=tool_names_used,
                                duration_ms=duration_ms
                            )
                            return  # Stop execution completely

                        # Approved - send approval event
                        print(f"✅ User approved tool: {tool_name}")
                        yield f"data: {json.dumps({'type': 'tool_approved', 'tool': tool_name})}\n\n"
                    else:
                        # Autonomous mode - auto-approve and notify
                        print(f"🤖 Autonomous mode: auto-executing tool: {tool_name}")
                        yield f"data: {json.dumps({'type': 'tool_auto_approved', 'tool': tool_name})}\n\n"

                    # Send tool start event
                    event_data = json.dumps({
                        'type': 'tool_start',
                        'tool': tool_name,
                        'args': tool_args,
                        'index': i + 1,
                        'total': len(tool_calls)
                    })
                    yield f"data: {event_data}\n\n"

                    # Send task_update: in_progress
                    task_id = f"task-{iteration}-{i}"
                    yield f"data: {json.dumps({'type': 'task_update', 'task_id': task_id, 'status': 'in_progress'})}\n\n"

                    # Execute tool with project_id injection
                    tool_start = time.time()
                    
                    # Determine timeout
                    timeout = TOOL_TIMEOUTS.get(tool_name, TOOL_TIMEOUTS["default"])
                    
                    # Retry logic
                    max_retries = 1
                    retry_count = 0
                    tool_result = None
                    tool_error = None
                    
                    # Use tool_call_id from OpenRouter or generate one if missing
                    tool_call_id = tool_call.get("id", f"tool-{iteration}-{i}")
                    
                    while retry_count <= max_retries:
                        # Create a fresh database session for each tool execution
                        # This is necessary because the dependency-injected 'db' may be closed
                        # during streaming response execution
                        tool_db = SessionLocal()
                        try:
                            # Create task for cancellation support
                            tool_task = asyncio.create_task(execute_tool(tool_name, tool_args, tool_db))
                            running_tool_tasks[tool_call_id] = tool_task

                            try:
                                # Wait for completion with timeout
                                tool_result = await asyncio.wait_for(tool_task, timeout=timeout)
                                tool_error = None
                                break # Success
                            except asyncio.TimeoutError:
                                print(f"⏱️ Tool execution timed out: {tool_name}")
                                tool_task.cancel()
                                raise TimeoutError(f"Tool execution timed out after {timeout}s")
                            except asyncio.CancelledError:
                                print(f"🛑 Tool execution cancelled: {tool_name}")
                                raise # Re-raise to be caught below
                            finally:
                                # Cleanup
                                if tool_call_id in running_tool_tasks:
                                    del running_tool_tasks[tool_call_id]

                        except asyncio.CancelledError:
                            # Handle manual cancellation
                            tool_error = "Execution cancelled by user"
                            yield f"data: {json.dumps({'type': 'tool_error', 'tool': tool_name, 'error': tool_error})}\n\n"
                            break

                        except Exception as e:
                            tool_error = str(e)
                            print(f"❌ Tool execution failed: {tool_error}")

                            if retry_count < max_retries:
                                retry_count += 1
                                print(f"🔄 Retrying tool {tool_name} ({retry_count}/{max_retries})...")
                                yield f"data: {json.dumps({'type': 'tool_retry', 'tool': tool_name, 'retry': retry_count, 'max_retries': max_retries})}\n\n"
                                await asyncio.sleep(2) # Backoff
                            else:
                                print(f"❌ Max retries reached for {tool_name}")
                                # Send timeout event if it was a timeout
                                if isinstance(e, TimeoutError):
                                    yield f"data: {json.dumps({'type': 'tool_timeout', 'tool': tool_name, 'timeout': timeout})}\n\n"
                                break
                        finally:
                            # Always close the tool-specific database session
                            tool_db.close()
                    
                    # If we have a result (success)
                    if tool_result is not None:
                        tool_duration = int((time.time() - tool_start) * 1000)

                        # Send tool complete event
                        event_data = json.dumps({
                            'type': 'tool_complete',
                            'tool': tool_name,
                            'result': tool_result,
                            'duration_ms': tool_duration,
                            'index': i + 1,
                            'total': len(tool_calls)
                        })
                        yield f"data: {event_data}\n\n"
                        
                        # Send task_update: completed
                        yield f"data: {json.dumps({'type': 'task_update', 'task_id': task_id, 'status': 'completed'})}\n\n"

                        # Add result to messages
                        # Note: Gemini doesn't accept "name" field in tool messages
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "content": json.dumps(tool_result)
                        })
                    else:
                        # Failed after retries or cancelled
                        tool_duration = int((time.time() - tool_start) * 1000)
                        
                        # Send error event if not already sent (e.g. for cancellation we sent it)
                        if not isinstance(tool_error, str) or tool_error != "Execution cancelled by user":
                             yield f"data: {json.dumps({'type': 'tool_error', 'tool': tool_name, 'error': tool_error or 'Unknown error'})}\n\n"
                        
                        # Send task_update: failed
                        yield f"data: {json.dumps({'type': 'task_update', 'task_id': task_id, 'status': 'failed'})}\n\n"
                        
                        # Note: Gemini doesn't accept "name" field in tool messages
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "content": json.dumps({"error": tool_error})
                        })

            # If max iterations reached
            if iteration >= max_iterations:
                yield f"data: {json.dumps({'type': 'iteration_limit', 'current': iteration, 'max': max_iterations, 'message': f'Limite de {max_iterations} iterações atingido. Você pode aumentar este limite nas preferências.'})}\n\n"
                yield f"data: {json.dumps({'type': 'status', 'message': f'Limite de {max_iterations} iterações atingido'})}\n\n"

                # Log usage
                duration_ms = int((time.time() - start_time) * 1000)
                user_msg = next((m.content for m in reversed(request.messages) if m.role == "user"), "")
                assistant_msg = accumulated_content or ""

                log_ai_usage(
                    db=db,
                    user_id=current_user.id,
                    workspace_id=None,
                    project_id=request.project_id,
                    model=request.model,
                    provider="openrouter",
                    request_type="tool_call",
                    input_tokens=total_input_tokens,
                    output_tokens=total_output_tokens,
                    prompt_preview=user_msg,
                    response_preview=assistant_msg,
                    tool_calls=tool_names_used,
                    duration_ms=duration_ms
                )

                yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            error_msg = str(e)
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


TEMP_IMAGE_DIR = "/tmp/xtyl_chat_images"
os.makedirs(TEMP_IMAGE_DIR, exist_ok=True)


@router.post("/analyze-image")
async def analyze_image_with_vision(
    file: UploadFile = File(...),
    prompt: str = "Descreva esta imagem em detalhes.",
    current_user: User = Depends(get_current_user)
):
    """
    Analyze an uploaded image using Claude 3.5 Sonnet vision
    """
    # Save temp file
    temp_filename = f"{uuid.uuid4()}_{file.filename}"
    temp_path = os.path.join(TEMP_IMAGE_DIR, temp_filename)

    try:
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Analyze with vision service
        result = vision_service.analyze_image(temp_path, prompt)

        # Clean up temp file
        os.remove(temp_path)

        if not result or not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to analyze image") if result else "Vision service unavailable"
            )

        return result

    except Exception as e:
        # Clean up on error
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


class ImageAnalysisRequest(BaseModel):
    document_id: str
    prompt: Optional[str] = "Descreva esta imagem em detalhes e extraia qualquer texto visível."


@router.post("/analyze-document-image")
async def analyze_document_image(
    request: ImageAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze an already uploaded image document using vision
    """
    from models import Document as DBDocument

    # Get document from database
    doc = db.query(DBDocument).filter(DBDocument.id == request.document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Check if this is an image
    from image_service import image_service
    if not image_service.is_image(doc.title):
        raise HTTPException(status_code=400, detail="Document is not an image")

    # Get image from MinIO or temp storage
    # For now, we'll need to reconstruct the path
    # This is a simplified version - in production you'd fetch from MinIO
    temp_path = f"/tmp/xtyl_uploads/{request.document_id}_{doc.title}"

    if not os.path.exists(temp_path):
        raise HTTPException(status_code=404, detail="Image file not found in storage")

    # Analyze with vision service
    result = vision_service.analyze_image(temp_path, request.prompt)

    if not result or not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to analyze image") if result else "Vision service unavailable"
        )

    return result
