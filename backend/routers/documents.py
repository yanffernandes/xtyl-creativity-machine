from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
from models import Document, User, DocumentAttachment
from schemas import (
    DocumentCreate, DocumentUpdate, Document as DocumentSchema,
    DocumentAttachmentCreate, DocumentAttachment as DocumentAttachmentSchema,
    VersionEntry, VersionHistoryResponse
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
from storage_service import delete_file as delete_from_storage, R2_PUBLIC_URL
from schemas import DeleteImagePermanentResponse, DetachImageResponse
# Feature 025: Security Hardening - Authorization helpers and rate limiting
from services.security_service import verify_project_access, verify_document_access
from middleware.security import limiter
from fastapi import Request

router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)

UPLOAD_DIR = "/tmp/xtyl_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def extract_object_key_from_url(url: str) -> Optional[str]:
    """Extract the R2 object key from a public URL."""
    if not url:
        return None

    # Handle R2 public URL format
    if R2_PUBLIC_URL and url.startswith(R2_PUBLIC_URL):
        return url[len(R2_PUBLIC_URL):].lstrip('/')

    # Fallback: try to extract path after the bucket name or domain
    # URL format: https://domain.com/path/to/file.ext
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if parsed.path:
        # Remove leading slash
        return parsed.path.lstrip('/')

    return None


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
    # Feature 025: Verify user has access to this project
    verify_project_access(db, project_id, str(current_user.id))

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
    campaign_id: Optional[str] = None,  # Feature 028: Filter by campaign
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Feature 025: Verify user has access to this project
    verify_project_access(db, project_id, str(current_user.id))

    # Get documents with eager loading of attachments and their images
    query = db.query(Document).options(
        joinedload(Document.attachments).joinedload(DocumentAttachment.image)
    ).filter(
        Document.project_id == project_id,
        Document.deleted_at == None
    )

    # Feature 028: Filter by campaign if specified
    if campaign_id:
        query = query.filter(Document.campaign_id == campaign_id)

    documents = query.all()
    return documents


@router.get("/projects/{project_id}/context-files", response_model=List[DocumentSchema])
def list_context_files(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all context files (is_context=True) for a project"""
    # Feature 025: Verify user has access to this project
    verify_project_access(db, project_id, str(current_user.id))

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
    # Feature 025: Verify user has access to this document
    doc = verify_document_access(db, document_id, str(current_user.id))

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
    # Feature 025: Verify user has access to this project
    verify_project_access(db, project_id, str(current_user.id))
    return create_document(db, document, project_id)

@router.get("/{document_id}", response_model=DocumentSchema)
def get_single_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Feature 025: Verify user has access to this document
    doc = verify_document_access(db, document_id, str(current_user.id))
    return doc

@router.put("/{document_id}", response_model=DocumentSchema)
def update_existing_document(
    document_id: str,
    document: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Feature 025: Verify user has access to this document
    verify_document_access(db, document_id, str(current_user.id))

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
    # Feature 025: Verify user has access to this document
    verify_document_access(db, document_id, str(current_user.id))

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
    # Feature 025: Verify user has access to this document
    verify_document_access(db, document_id, str(current_user.id))
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
    # Feature 025: Verify user has access to this document (checks via project)
    # Note: verify_document_access checks deleted_at, but restore needs to access deleted docs
    # So we verify project access directly via the document's project
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    verify_project_access(db, doc.project_id, str(current_user.id))

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
    # Feature 025: Verify user has access to this project
    verify_project_access(db, project_id, str(current_user.id))
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
    # Feature 025: Verify user has access to this document
    doc = verify_document_access(db, document_id, str(current_user.id))

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
    # Feature 025: Verify user has access to this document
    doc = verify_document_access(db, document_id, str(current_user.id))

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
    # Feature 025: Verify user has access to this document
    doc = verify_document_access(db, document_id, str(current_user.id))

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
    # Feature 025: Verify user has access to this document
    doc = verify_document_access(db, document_id, str(current_user.id))

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
    # Feature 025: Verify user has access to this document
    doc = verify_document_access(db, document_id, str(current_user.id))

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
@limiter.limit("30/minute")
async def get_shared_document(
    share_token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Public endpoint to access a shared document (no authentication required).
    Rate limited to 30 requests per minute per IP to prevent abuse."""
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
    # Feature 025: Verify user has access to this document
    verify_document_access(db, document_id, str(current_user.id))

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
    # Feature 025: Verify user has access to this document
    doc = verify_document_access(db, document_id, str(current_user.id))

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


@router.delete("/{document_id}/attachments/{attachment_id}", response_model=DetachImageResponse)
async def remove_image_attachment(
    document_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Detach an image from a document (keeps image in library).

    This only removes the attachment link - the image remains in storage
    and can be reattached or used elsewhere.
    """
    # Feature 025: Verify user has access to this document
    verify_document_access(db, document_id, str(current_user.id))

    # Find attachment
    attachment = db.query(DocumentAttachment).filter(
        DocumentAttachment.id == attachment_id,
        DocumentAttachment.document_id == document_id
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    image_id = attachment.image_id

    db.delete(attachment)
    db.commit()

    return DetachImageResponse(
        success=True,
        message="Image detached from document (still available in library)",
        image_id=image_id
    )


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
    # Feature 025: Verify user has access to this document
    verify_document_access(db, document_id, str(current_user.id))

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


@router.delete("/{document_id}/attachments/{attachment_id}/permanent", response_model=DeleteImagePermanentResponse)
async def delete_image_permanent(
    document_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permanently delete an attached image from the document AND from storage.

    This action:
    1. Removes the attachment record
    2. Deletes the image document record
    3. Deletes the actual file(s) from R2 storage

    WARNING: This is a destructive action that cannot be undone.

    Validation:
    - Will fail if this image is used as original_image_id by another document
      (to prevent breaking refinement chains)
    """
    # Feature 025: Verify user has access to this document
    verify_document_access(db, document_id, str(current_user.id))

    # Find attachment
    attachment = db.query(DocumentAttachment).filter(
        DocumentAttachment.id == attachment_id,
        DocumentAttachment.document_id == document_id
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Get the image document
    image_doc = db.query(Document).filter(Document.id == attachment.image_id).first()
    if not image_doc:
        # Attachment exists but image is gone - just clean up the attachment
        db.delete(attachment)
        db.commit()
        return DeleteImagePermanentResponse(
            success=True,
            message="Attachment removed (image was already deleted)",
            deleted_files=[]
        )

    # Check if this image is used as original_image_id by another document
    # This prevents breaking refinement chains
    dependent_doc = db.query(Document).filter(
        Document.original_image_id == image_doc.id,
        Document.id != image_doc.id  # Exclude self-reference
    ).first()

    if dependent_doc:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete: this image is the original reference for another refined image. Delete the refined image first."
        )

    # Collect files to delete
    deleted_files = []
    storage_errors = []

    # Delete files from R2 storage
    for url_attr in ['file_url', 'thumbnail_url']:
        url = getattr(image_doc, url_attr, None)
        if url:
            object_key = extract_object_key_from_url(url)
            if object_key:
                try:
                    delete_from_storage(object_key)
                    deleted_files.append(object_key)
                except Exception as e:
                    # Log but don't fail - file might not exist
                    storage_errors.append(f"{url_attr}: {str(e)}")

    # Delete the attachment record
    db.delete(attachment)

    # Delete any other attachments pointing to this image
    db.query(DocumentAttachment).filter(
        DocumentAttachment.image_id == image_doc.id
    ).delete()

    # Delete the image document itself
    db.delete(image_doc)

    db.commit()

    message = "Image permanently deleted from document and storage"
    if storage_errors:
        message += f" (storage warnings: {', '.join(storage_errors)})"

    return DeleteImagePermanentResponse(
        success=True,
        message=message,
        deleted_files=deleted_files
    )


# ============================================================================
# Feature 028 T057-T058: Version History Endpoints
# ============================================================================

@router.get("/{document_id}/versions", response_model=VersionHistoryResponse)
async def get_document_versions(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    T057: Get version history for a document.
    Returns the current version and up to 10 historical versions.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Feature 025: Verify user has access to this document's project
    verify_document_access(db, document_id, str(current_user.id))

    # Parse version history from JSONB
    version_history = document.version_history or []
    versions = [
        VersionEntry(
            version=v.get("version", 0),
            title=v.get("title", ""),
            content=v.get("content", ""),
            created_at=datetime.fromisoformat(v.get("created_at", datetime.now().isoformat())),
            created_by=v.get("created_by")
        )
        for v in version_history
    ]

    return VersionHistoryResponse(
        document_id=document_id,
        current_version=document.current_version or 1,
        versions=versions
    )


@router.post("/{document_id}/versions/{version}/restore")
async def restore_document_version(
    document_id: str,
    version: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    T058: Restore a document to a previous version.
    Creates a new version snapshot of current state, then restores the old content.
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Feature 025: Verify user has access to this document's project
    verify_document_access(db, document_id, str(current_user.id))

    # Find the version to restore
    version_history = document.version_history or []
    version_to_restore = None
    for v in version_history:
        if v.get("version") == version:
            version_to_restore = v
            break

    if not version_to_restore:
        raise HTTPException(
            status_code=404,
            detail=f"Version {version} not found in history"
        )

    # Create snapshot of current state before restoring
    current_snapshot = {
        "version": document.current_version or 1,
        "title": document.title,
        "content": document.content,
        "created_at": datetime.now().isoformat(),
        "created_by": str(current_user.id)
    }

    # Add current state to history
    new_history = list(version_history)
    new_history.append(current_snapshot)

    # FIFO: Keep only last 10 versions
    if len(new_history) > 10:
        new_history = new_history[-10:]

    # Restore the old content
    document.title = version_to_restore.get("title", document.title)
    document.content = version_to_restore.get("content", "")
    document.version_history = new_history
    document.current_version = (document.current_version or 1) + 1
    document.updated_at = datetime.now()

    db.commit()
    db.refresh(document)

    return {
        "success": True,
        "message": f"Document restored to version {version}",
        "current_version": document.current_version,
        "restored_from": version
    }


# =============================================================================
# Project Media (Images) - Paginated Endpoint for Studio
# =============================================================================

@router.get("/projects/{project_id}/media")
def list_project_media(
    project_id: str,
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List generated images for a project with pagination.
    Used by the Visual Studio for infinite scroll history.

    Returns media_type='image' documents ordered by created_at desc.

    Feature 030: Uses window function COUNT(*) OVER() to combine count and fetch
    in a single query for better performance.
    """
    from sqlalchemy import desc, func

    # Verify access
    verify_project_access(db, project_id, str(current_user.id))

    # Calculate offset
    offset = (page - 1) * limit

    # Base filter for project images
    base_filter = [
        Document.project_id == project_id,
        Document.media_type == 'image',
        Document.is_reference_asset == False,
        Document.deleted_at == None
    ]

    # Count total matching documents
    total = db.query(func.count(Document.id)).filter(*base_filter).scalar() or 0

    if total == 0:
        return {
            "items": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "has_more": False
        }

    # Fetch paginated items
    items = db.query(Document).filter(
        *base_filter
    ).order_by(desc(Document.created_at)).offset(offset).limit(limit).all()

    has_more = offset + len(items) < total

    return {
        "items": [DocumentSchema.model_validate(doc) for doc in items],
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": has_more
    }
