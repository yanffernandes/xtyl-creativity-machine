from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
from models import Document, User, DocumentAttachment
from schemas import (
    DocumentCreate, DocumentUpdate, Document as DocumentSchema,
    DocumentAttachmentCreate, DocumentAttachment as DocumentAttachmentSchema
)
from supabase_auth import get_current_user
from rag_service import process_document
from crud import (
    get_project_documents, get_document, create_document, update_document, delete_document,
    soft_delete_document, restore_document, move_document, list_archived_documents
)
import shutil
import os
import uuid
import secrets
from export_service import export_to_pdf, export_to_docx, export_to_markdown

router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)

UPLOAD_DIR = "/tmp/xtyl_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload/{project_id}")
async def upload_document(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    is_context: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a document. Set is_context=true to mark as context file for RAG."""
    # Create DB entry
    doc_id = str(uuid.uuid4())
    db_doc = Document(
        id=doc_id,
        title=file.filename,
        content="",  # Will be filled or just used for metadata
        status="processing",
        project_id=project_id,
        is_context=is_context
    )
    db.add(db_doc)
    db.commit()

    # Save temp file
    temp_path = f"{UPLOAD_DIR}/{doc_id}_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Trigger background processing (RAG indexing happens here)
    background_tasks.add_task(process_document, db, doc_id, temp_path, file.filename)

    return {
        "id": doc_id,
        "status": "processing",
        "is_context": is_context,
        "message": "Document uploaded and processing started"
    }

@router.get("/projects/{project_id}/documents", response_model=List[DocumentSchema])
def list_project_documents(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get documents with eager loading of attachments and their images
    documents = db.query(Document).options(
        joinedload(Document.attachments).joinedload(DocumentAttachment.image)
    ).filter(
        Document.project_id == project_id,
        Document.deleted_at == None
    ).all()
    return documents


@router.get("/projects/{project_id}/context-files", response_model=List[DocumentSchema])
def list_context_files(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all context files (is_context=True) for a project"""
    documents = db.query(Document).filter(
        Document.project_id == project_id,
        Document.is_context == True,
        Document.deleted_at == None
    ).order_by(Document.created_at.desc()).all()
    return documents


@router.post("/{document_id}/toggle-context")
async def toggle_document_context(
    document_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle is_context flag for a document. If turning ON, triggers RAG processing."""
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Toggle the flag
    new_value = not doc.is_context
    doc.is_context = new_value
    db.commit()
    db.refresh(doc)

    # If turning ON context and document has content, we could trigger RAG re-indexing
    # For now, just return the updated state
    # TODO: If needed, trigger background_tasks.add_task(reindex_document, db, document_id)

    return {
        "id": doc.id,
        "title": doc.title,
        "is_context": doc.is_context,
        "message": f"Document {'added to' if new_value else 'removed from'} context files"
    }

@router.post("/projects/{project_id}/documents", response_model=DocumentSchema)
def create_new_document(
    project_id: str,
    document: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return create_document(db, document, project_id)

@router.get("/{document_id}", response_model=DocumentSchema)
def get_single_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.put("/{document_id}", response_model=DocumentSchema)
def update_existing_document(
    document_id: str,
    document: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated_doc = update_document(db, document_id, document)
    if not updated_doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return updated_doc

@router.delete("/{document_id}")
def delete_existing_document(
    document_id: str,
    hard_delete: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete document. Use hard_delete=true for permanent deletion, otherwise soft deletes (archives)"""
    if hard_delete:
        success = delete_document(db, document_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"message": "Document permanently deleted"}
    else:
        deleted_doc = soft_delete_document(db, document_id, str(current_user.id))
        if not deleted_doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return {
            "message": "Document archived successfully",
            "id": deleted_doc.id,
            "deleted_at": str(deleted_doc.deleted_at)
        }

@router.post("/{document_id}/move")
def move_document_to_folder(
    document_id: str,
    folder_id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Move document to a folder (or to root if folder_id is None)"""
    moved_doc = move_document(db, document_id, folder_id, str(current_user.id))
    if not moved_doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": moved_doc.id,
        "title": moved_doc.title,
        "folder_id": moved_doc.folder_id,
        "message": "Document moved successfully"
    }

@router.post("/{document_id}/restore")
def restore_archived_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Restore a soft-deleted (archived) document"""
    restored_doc = restore_document(db, document_id, str(current_user.id))
    if not restored_doc:
        raise HTTPException(status_code=404, detail="Document not found or not archived")

    return {
        "id": restored_doc.id,
        "title": restored_doc.title,
        "message": "Document restored successfully"
    }

@router.get("/projects/{project_id}/archived", response_model=dict)
def list_archived_project_documents(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all archived documents in a project"""
    archived = list_archived_documents(db, project_id)

    return {
        "documents": [
            {
                "id": doc.id,
                "title": doc.title,
                "status": doc.status,
                "folder_id": doc.folder_id,
                "deleted_at": str(doc.deleted_at),
                "created_at": str(doc.created_at)
            }
            for doc in archived
        ],
        "count": len(archived)
    }


# ===== EXPORT ENDPOINTS =====

@router.get("/{document_id}/export/pdf")
async def export_document_pdf(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export document as PDF with formatted markdown"""
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Only allow text documents to be exported
    if doc.media_type != "text":
        raise HTTPException(status_code=400, detail="Only text documents can be exported to PDF")

    try:
        pdf_bytes = export_to_pdf(doc.content or "", doc.title)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{doc.title}.pdf"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@router.get("/{document_id}/export/docx")
async def export_document_docx(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export document as DOCX with formatted markdown"""
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.media_type != "text":
        raise HTTPException(status_code=400, detail="Only text documents can be exported to DOCX")

    try:
        docx_bytes = export_to_docx(doc.content or "", doc.title)

        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{doc.title}.docx"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate DOCX: {str(e)}")


@router.get("/{document_id}/export/md")
async def export_document_markdown(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export document as Markdown file"""
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.media_type != "text":
        raise HTTPException(status_code=400, detail="Only text documents can be exported to Markdown")

    try:
        md_bytes = export_to_markdown(doc.content or "", doc.title)

        return Response(
            content=md_bytes,
            media_type="text/markdown",
            headers={
                "Content-Disposition": f'attachment; filename="{doc.title}.md"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Markdown: {str(e)}")


# ===== PUBLIC SHARING ENDPOINTS =====

@router.post("/{document_id}/share")
async def create_share_link(
    document_id: str,
    expires_in_days: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a public share link for a document"""
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Generate secure random token
    share_token = secrets.token_urlsafe(32)

    # Set expiration if specified
    share_expires_at = None
    if expires_in_days:
        share_expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

    # Update document with sharing info
    doc.is_public = True
    doc.share_token = share_token
    doc.share_expires_at = share_expires_at
    db.commit()
    db.refresh(doc)

    return {
        "share_token": share_token,
        "share_url": f"/documents/shared/{share_token}",
        "expires_at": share_expires_at.isoformat() if share_expires_at else None,
        "is_public": True
    }


@router.delete("/{document_id}/share")
async def revoke_share_link(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke public sharing for a document"""
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove sharing info
    doc.is_public = False
    doc.share_token = None
    doc.share_expires_at = None
    db.commit()

    return {
        "message": "Share link revoked successfully",
        "is_public": False
    }


@router.get("/shared/{share_token}")
async def get_shared_document(
    share_token: str,
    db: Session = Depends(get_db)
):
    """Public endpoint to access a shared document (no authentication required)"""
    # Find document by share token
    doc = db.query(Document).filter(
        Document.share_token == share_token,
        Document.is_public == True,
        Document.deleted_at.is_(None)
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Shared document not found or link is invalid")

    # Check if share link has expired
    if doc.share_expires_at and doc.share_expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link has expired")

    # Return document data (read-only)
    return {
        "id": doc.id,
        "title": doc.title,
        "content": doc.content,
        "media_type": doc.media_type,
        "file_url": doc.file_url,
        "thumbnail_url": doc.thumbnail_url,
        "created_at": doc.created_at.isoformat(),
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
        "is_shared": True,
        "read_only": True
    }


# ===== DOCUMENT ATTACHMENT ENDPOINTS =====

@router.get("/{document_id}/attachments", response_model=List[DocumentAttachmentSchema])
async def get_document_attachments(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all image attachments for a document"""
    # Verify document exists and user has access
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get all attachments for this document with eager loading of image data
    attachments = db.query(DocumentAttachment).options(
        joinedload(DocumentAttachment.image)
    ).filter(
        DocumentAttachment.document_id == document_id
    ).order_by(DocumentAttachment.attachment_order).all()

    return attachments


@router.post("/{document_id}/attachments", response_model=DocumentAttachmentSchema)
async def attach_image_to_document(
    document_id: str,
    attachment: DocumentAttachmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Attach an image to a document"""
    # Verify document exists
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Verify image exists and is actually an image
    image = get_document(db, attachment.image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    if image.media_type != "image":
        raise HTTPException(status_code=400, detail="Attached document must be an image")

    # Check if attachment already exists
    existing = db.query(DocumentAttachment).filter(
        DocumentAttachment.document_id == document_id,
        DocumentAttachment.image_id == attachment.image_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Image already attached to this document")

    # If this is marked as primary, unmark other primary attachments
    if attachment.is_primary:
        db.query(DocumentAttachment).filter(
            DocumentAttachment.document_id == document_id,
            DocumentAttachment.is_primary == True
        ).update({"is_primary": False})

    # Create attachment
    db_attachment = DocumentAttachment(
        id=str(uuid.uuid4()),
        document_id=document_id,
        image_id=attachment.image_id,
        is_primary=attachment.is_primary,
        attachment_order=attachment.attachment_order
    )

    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)

    return db_attachment


@router.delete("/{document_id}/attachments/{attachment_id}")
async def remove_image_attachment(
    document_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove an image attachment from a document"""
    # Verify document exists
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Find and delete attachment
    attachment = db.query(DocumentAttachment).filter(
        DocumentAttachment.id == attachment_id,
        DocumentAttachment.document_id == document_id
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    db.delete(attachment)
    db.commit()

    return {"message": "Attachment removed successfully", "id": attachment_id}


@router.put("/{document_id}/attachments/{attachment_id}", response_model=DocumentAttachmentSchema)
async def update_image_attachment(
    document_id: str,
    attachment_id: str,
    is_primary: Optional[bool] = None,
    attachment_order: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an image attachment (e.g., set as primary, change order)"""
    # Verify document exists
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Find attachment
    attachment = db.query(DocumentAttachment).filter(
        DocumentAttachment.id == attachment_id,
        DocumentAttachment.document_id == document_id
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Update fields
    if is_primary is not None:
        # If setting as primary, unmark other primary attachments
        if is_primary:
            db.query(DocumentAttachment).filter(
                DocumentAttachment.document_id == document_id,
                DocumentAttachment.is_primary == True,
                DocumentAttachment.id != attachment_id
            ).update({"is_primary": False})

        attachment.is_primary = is_primary

    if attachment_order is not None:
        attachment.attachment_order = attachment_order

    db.commit()
    db.refresh(attachment)

    return attachment
