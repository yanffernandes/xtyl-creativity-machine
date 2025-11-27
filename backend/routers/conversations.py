"""
Chat Conversations Router

Handles saving, listing, loading, and deleting chat conversation history.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from datetime import datetime

import models
import schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/conversations", tags=["conversations"])


def generate_conversation_title(messages: list) -> str:
    """Generate a title from the first user message."""
    for msg in messages:
        if msg.get("role") == "user" and msg.get("content"):
            content = msg["content"].strip()
            # Take first 50 chars, truncate at word boundary
            if len(content) > 50:
                content = content[:50].rsplit(" ", 1)[0] + "..."
            return content
    return "Nova conversa"


def generate_conversation_summary(messages: list) -> str:
    """Generate a brief summary from the conversation."""
    user_messages = [m["content"] for m in messages if m.get("role") == "user"]
    if user_messages:
        first_msg = user_messages[0][:100]
        return first_msg + "..." if len(user_messages[0]) > 100 else first_msg
    return None


@router.post("/", response_model=schemas.ChatConversationDetail)
async def create_conversation(
    data: schemas.ChatConversationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new chat conversation."""
    # Generate title if not provided
    title = data.title
    if not title and data.messages:
        title = generate_conversation_title([m.model_dump() for m in data.messages])

    # Generate summary
    summary = generate_conversation_summary([m.model_dump() for m in data.messages])

    conversation = models.ChatConversation(
        user_id=current_user.id,
        workspace_id=data.workspace_id,
        project_id=data.project_id,
        title=title,
        summary=summary,
        messages_json=[m.model_dump() for m in data.messages],
        model_used=data.model_used,
        document_ids_context=data.document_ids_context or [],
        folder_ids_context=data.folder_ids_context or [],
        created_document_ids=[],
        message_count=len(data.messages),
        last_message_at=datetime.utcnow() if data.messages else None
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return conversation


@router.get("/", response_model=schemas.ChatConversationList)
async def list_conversations(
    workspace_id: str,
    project_id: Optional[str] = None,
    is_archived: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List chat conversations for the current user."""
    query = db.query(models.ChatConversation).filter(
        models.ChatConversation.user_id == current_user.id,
        models.ChatConversation.workspace_id == workspace_id,
        models.ChatConversation.is_archived == is_archived
    )

    if project_id:
        query = query.filter(models.ChatConversation.project_id == project_id)

    # Get total count
    total = query.count()

    # Get paginated results
    conversations = query.order_by(
        desc(models.ChatConversation.last_message_at)
    ).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "conversations": conversations,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/{conversation_id}", response_model=schemas.ChatConversationDetail)
async def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific conversation by ID."""
    conversation = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return conversation


@router.put("/{conversation_id}", response_model=schemas.ChatConversationDetail)
async def update_conversation(
    conversation_id: str,
    data: schemas.ChatConversationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a conversation (add messages, change title, archive)."""
    conversation = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if data.title is not None:
        conversation.title = data.title

    if data.messages is not None:
        conversation.messages_json = [m.model_dump() for m in data.messages]
        conversation.message_count = len(data.messages)
        conversation.last_message_at = datetime.utcnow()

        # Update summary
        conversation.summary = generate_conversation_summary(
            [m.model_dump() for m in data.messages]
        )

        # Update title if not manually set
        if not conversation.title or conversation.title == "Nova conversa":
            conversation.title = generate_conversation_title(
                [m.model_dump() for m in data.messages]
            )

    if data.is_archived is not None:
        conversation.is_archived = data.is_archived

    if data.created_document_ids is not None:
        conversation.created_document_ids = data.created_document_ids

    db.commit()
    db.refresh(conversation)

    return conversation


@router.post("/{conversation_id}/messages", response_model=schemas.ChatConversationDetail)
async def add_messages(
    conversation_id: str,
    messages: list[schemas.ChatMessageSchema],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Add messages to an existing conversation."""
    conversation = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Append new messages
    current_messages = conversation.messages_json or []
    new_messages = [m.model_dump() for m in messages]
    conversation.messages_json = current_messages + new_messages
    conversation.message_count = len(conversation.messages_json)
    conversation.last_message_at = datetime.utcnow()

    db.commit()
    db.refresh(conversation)

    return conversation


@router.post("/{conversation_id}/add-document", response_model=schemas.ChatConversationDetail)
async def add_created_document(
    conversation_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Add a document ID to the list of documents created during this conversation."""
    conversation = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    current_docs = conversation.created_document_ids or []
    if document_id not in current_docs:
        conversation.created_document_ids = current_docs + [document_id]

    db.commit()
    db.refresh(conversation)

    return conversation


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a conversation permanently."""
    conversation = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.delete(conversation)
    db.commit()

    return {"message": "Conversation deleted successfully"}


@router.post("/{conversation_id}/archive", response_model=schemas.ChatConversationDetail)
async def archive_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Archive a conversation."""
    conversation = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.is_archived = True
    db.commit()
    db.refresh(conversation)

    return conversation


@router.post("/{conversation_id}/unarchive", response_model=schemas.ChatConversationDetail)
async def unarchive_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Unarchive a conversation."""
    conversation = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.user_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.is_archived = False
    db.commit()
    db.refresh(conversation)

    return conversation
