"""
Chat Conversations Router (Simplified)

Only keeps endpoints needed for AI chat operations:
- Adding messages to conversations
- Adding document references

CRUD operations (list, get, create, update, archive, delete) are now
handled via Supabase Client in the frontend.

Feature: 007-hybrid-supabase-architecture
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

import models
import schemas
from database import get_db
from supabase_auth import get_current_user

router = APIRouter(prefix="/conversations", tags=["conversations"])


def generate_conversation_title(messages: list) -> str:
    """Generate a title from the first user message."""
    for msg in messages:
        if msg.get("role") == "user" and msg.get("content"):
            content = msg["content"].strip()
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


@router.post("/{conversation_id}/messages", response_model=schemas.ChatConversationDetail)
async def add_messages(
    conversation_id: str,
    messages: list[schemas.ChatMessageSchema],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Add messages to an existing conversation.

    This endpoint is kept because it's used during AI chat sessions
    to persist new messages as they are generated.
    """
    user_id_str = str(current_user.id)
    conversation = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.user_id == user_id_str
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Append new messages
    current_messages = conversation.messages_json or []
    new_messages = [m.model_dump() for m in messages]
    conversation.messages_json = current_messages + new_messages
    conversation.message_count = len(conversation.messages_json)
    conversation.last_message_at = datetime.utcnow()

    # Update title if not set
    if not conversation.title or conversation.title == "Nova conversa":
        conversation.title = generate_conversation_title(conversation.messages_json)

    # Update summary
    conversation.summary = generate_conversation_summary(conversation.messages_json)

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
    """
    Add a document ID to the list of documents created during this conversation.

    This endpoint is kept because it's called by the AI chat when
    documents are created as part of the conversation.
    """
    user_id_str = str(current_user.id)
    conversation = db.query(models.ChatConversation).filter(
        models.ChatConversation.id == conversation_id,
        models.ChatConversation.user_id == user_id_str
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    current_docs = conversation.created_document_ids or []
    if document_id not in current_docs:
        conversation.created_document_ids = current_docs + [document_id]

    db.commit()
    db.refresh(conversation)

    return conversation
