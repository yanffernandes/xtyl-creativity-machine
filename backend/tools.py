"""
AI Agent Tools for document and folder manipulation
"""
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from models import Document, Folder
from crud import (
    get_document, get_project_documents, update_document, create_document,
    create_folder, list_folders, move_document, move_folder,
    soft_delete_document, soft_delete_folder
)
from schemas import DocumentUpdate, DocumentCreate
import asyncio
from image_generation_service import generate_and_store_image
from image_naming_service import generate_image_title


def read_document_tool(db: Session, document_id: str) -> Dict[str, Any]:
    """
    Read the content of a specific document.
    
    Args:
        db: Database session
        document_id: ID of the document to read
        
    Returns:
        Dictionary with document data or error
    """
    doc = get_document(db, document_id)
    if not doc:
        return {"error": f"Document with ID {document_id} not found"}
    
    return {
        "id": doc.id,
        "title": doc.title,
        "content": doc.content,
        "status": doc.status,
        "created_at": str(doc.created_at)
    }


def edit_document_tool(
    db: Session, 
    document_id: str, 
    content: str = None,
    title: str = None,
    edit_type: str = "replace"
) -> Dict[str, Any]:
    """
    Edit a document's content or title.
    
    Args:
        db: Database session
        document_id: ID of the document to edit
        content: New content (optional)
        title: New title (optional)
        edit_type: Type of edit - "replace", "append", or "prepend"
        
    Returns:
        Dictionary with updated document data or error
    """
    doc = get_document(db, document_id)
    if not doc:
        return {"error": f"Document with ID {document_id} not found"}
    
    # Handle content editing based on edit_type
    if content is not None:
        if edit_type == "append":
            new_content = (doc.content or "") + "\n\n" + content
        elif edit_type == "prepend":
            new_content = content + "\n\n" + (doc.content or "")
        else:  # replace
            new_content = content
    else:
        new_content = doc.content
    
    # Create update object
    update_data = DocumentUpdate(
        content=new_content,
        title=title if title is not None else doc.title
    )
    
    # Update document
    updated_doc = update_document(db, document_id, update_data)
    if not updated_doc:
        return {"error": "Failed to update document"}
    
    return {
        "id": updated_doc.id,
        "title": updated_doc.title,
        "content": updated_doc.content,
        "status": updated_doc.status,
        "message": f"Document updated successfully using {edit_type} mode"
    }


def list_documents_tool(db: Session, project_id: str) -> Dict[str, Any]:
    """
    List all documents in a project.
    
    Args:
        db: Database session
        project_id: ID of the project
        
    Returns:
        Dictionary with list of documents
    """
    docs = get_project_documents(db, project_id)
    
    return {
        "documents": [
            {
                "id": doc.id,
                "title": doc.title,
                "status": doc.status,
                "created_at": str(doc.created_at)
            }
            for doc in docs
        ],
        "count": len(docs)
    }


def search_documents_tool(
    db: Session,
    project_id: str,
    query: str
) -> Dict[str, Any]:
    """
    Search for content across documents in a project.

    Args:
        db: Database session
        project_id: ID of the project
        query: Search query string

    Returns:
        Dictionary with matching documents
    """
    docs = get_project_documents(db, project_id)
    query_lower = query.lower()

    # Simple text search in title and content
    matching_docs = []
    for doc in docs:
        title_match = query_lower in (doc.title or "").lower()
        content_match = query_lower in (doc.content or "").lower()

        if title_match or content_match:
            matching_docs.append({
                "id": doc.id,
                "title": doc.title,
                "status": doc.status,
                "match_in_title": title_match,
                "match_in_content": content_match,
                "created_at": str(doc.created_at)
            })

    return {
        "query": query,
        "matches": matching_docs,
        "count": len(matching_docs)
    }


def create_document_tool(
    db: Session,
    project_id: str,
    title: str,
    content: str = "",
    status: str = "draft"
) -> Dict[str, Any]:
    """
    Create a new document in a project.

    Args:
        db: Database session
        project_id: ID of the project
        title: Title of the new document
        content: Initial content (optional)
        status: Initial status (default: "draft")

    Returns:
        Dictionary with created document data or error
    """
    try:
        document_create = DocumentCreate(
            title=title,
            content=content,
            status=status
        )

        new_doc = create_document(db, document_create, project_id)

        return {
            "id": new_doc.id,
            "title": new_doc.title,
            "content": new_doc.content,
            "status": new_doc.status,
            "project_id": new_doc.project_id,
            "created_at": str(new_doc.created_at),
            "message": "Document created successfully"
        }
    except Exception as e:
        return {"error": f"Failed to create document: {str(e)}"}


# ========== FOLDER MANAGEMENT TOOLS ==========

def create_folder_tool(
    db: Session,
    project_id: str,
    name: str,
    parent_folder_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new folder in a project.

    Args:
        db: Database session
        project_id: ID of the project
        name: Name of the folder
        parent_folder_id: ID of parent folder (None for root level)

    Returns:
        Dictionary with created folder data or error
    """
    try:
        new_folder = create_folder(
            db=db,
            name=name,
            project_id=project_id,
            parent_folder_id=parent_folder_id,
            user_id=None,  # Will be set by system context
        )

        return {
            "id": new_folder.id,
            "name": new_folder.name,
            "parent_folder_id": new_folder.parent_folder_id,
            "project_id": new_folder.project_id,
            "created_at": str(new_folder.created_at),
            "message": f"Folder '{name}' created successfully"
        }
    except Exception as e:
        return {"error": f"Failed to create folder: {str(e)}"}


def list_folders_tool(
    db: Session,
    project_id: str,
    parent_folder_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    List folders in a project, optionally filtered by parent folder.

    Args:
        db: Database session
        project_id: ID of the project
        parent_folder_id: ID of parent folder to filter by (None for root folders)

    Returns:
        Dictionary with list of folders
    """
    try:
        folders = list_folders(db, project_id, parent_folder_id)

        return {
            "folders": [
                {
                    "id": folder.id,
                    "name": folder.name,
                    "parent_folder_id": folder.parent_folder_id,
                    "created_at": str(folder.created_at)
                }
                for folder in folders
            ],
            "count": len(folders)
        }
    except Exception as e:
        return {"error": f"Failed to list folders: {str(e)}"}


def move_file_tool(
    db: Session,
    document_id: str,
    folder_id: Optional[str]
) -> Dict[str, Any]:
    """
    Move a document to a different folder.

    Args:
        db: Database session
        document_id: ID of the document to move
        folder_id: ID of destination folder (None for root level)

    Returns:
        Dictionary with updated document data or error
    """
    try:
        updated_doc = move_document(
            db=db,
            document_id=document_id,
            folder_id=folder_id,
            user_id=None  # Will be set by system context
        )

        if not updated_doc:
            return {"error": f"Document with ID {document_id} not found"}

        return {
            "id": updated_doc.id,
            "title": updated_doc.title,
            "folder_id": updated_doc.folder_id,
            "message": f"Document '{updated_doc.title}' moved successfully"
        }
    except Exception as e:
        return {"error": f"Failed to move document: {str(e)}"}


def move_folder_tool(
    db: Session,
    folder_id: str,
    new_parent_id: Optional[str]
) -> Dict[str, Any]:
    """
    Move a folder to a new parent folder.

    Args:
        db: Database session
        folder_id: ID of the folder to move
        new_parent_id: ID of new parent folder (None for root level)

    Returns:
        Dictionary with updated folder data or error
    """
    try:
        result = move_folder(
            db=db,
            folder_id=folder_id,
            new_parent_id=new_parent_id,
            user_id=None  # Will be set by system context
        )

        if isinstance(result, dict) and "error" in result:
            return result

        if not result:
            return {"error": f"Folder with ID {folder_id} not found"}

        return {
            "id": result.id,
            "name": result.name,
            "parent_folder_id": result.parent_folder_id,
            "message": f"Folder '{result.name}' moved successfully"
        }
    except Exception as e:
        return {"error": f"Failed to move folder: {str(e)}"}


def delete_file_tool(
    db: Session,
    document_id: str
) -> Dict[str, Any]:
    """
    Soft delete (archive) a document.

    Args:
        db: Database session
        document_id: ID of the document to delete

    Returns:
        Dictionary with confirmation or error
    """
    try:
        deleted_doc = soft_delete_document(
            db=db,
            document_id=document_id,
            user_id=None  # Will be set by system context
        )

        if not deleted_doc:
            return {"error": f"Document with ID {document_id} not found"}

        return {
            "id": deleted_doc.id,
            "title": deleted_doc.title,
            "deleted_at": str(deleted_doc.deleted_at),
            "message": f"Document '{deleted_doc.title}' archived successfully. It can be restored later."
        }
    except Exception as e:
        return {"error": f"Failed to delete document: {str(e)}"}


def delete_folder_tool(
    db: Session,
    folder_id: str,
    delete_contents: bool = True
) -> Dict[str, Any]:
    """
    Soft delete (archive) a folder and optionally its contents.

    Args:
        db: Database session
        folder_id: ID of the folder to delete
        delete_contents: Whether to also delete all contents (default: True)

    Returns:
        Dictionary with confirmation or error
    """
    try:
        deleted_folder = soft_delete_folder(
            db=db,
            folder_id=folder_id,
            cascade=delete_contents,
            user_id=None  # Will be set by system context
        )

        if not deleted_folder:
            return {"error": f"Folder with ID {folder_id} not found"}

        contents_msg = " and its contents" if delete_contents else ""
        return {
            "id": deleted_folder.id,
            "name": deleted_folder.name,
            "deleted_at": str(deleted_folder.deleted_at),
            "message": f"Folder '{deleted_folder.name}'{contents_msg} archived successfully. It can be restored later."
        }
    except Exception as e:
        return {"error": f"Failed to delete folder: {str(e)}"}


# ========== RENAME AND CONTENTS TOOLS ==========

def rename_document_tool(
    db: Session,
    document_id: str,
    new_title: str
) -> Dict[str, Any]:
    """
    Rename a document by changing its title.

    Args:
        db: Database session
        document_id: ID of the document to rename
        new_title: New title for the document

    Returns:
        Dictionary with updated document data or error
    """
    doc = get_document(db, document_id)
    if not doc:
        return {"error": f"Document with ID {document_id} not found"}

    old_title = doc.title
    update_data = DocumentUpdate(title=new_title)
    updated_doc = update_document(db, document_id, update_data)

    if not updated_doc:
        return {"error": "Failed to rename document"}

    return {
        "id": updated_doc.id,
        "old_title": old_title,
        "new_title": updated_doc.title,
        "message": f"Document renamed from '{old_title}' to '{updated_doc.title}'"
    }


def rename_folder_tool(
    db: Session,
    folder_id: str,
    new_name: str
) -> Dict[str, Any]:
    """
    Rename a folder by changing its name.

    Args:
        db: Database session
        folder_id: ID of the folder to rename
        new_name: New name for the folder

    Returns:
        Dictionary with updated folder data or error
    """
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.deleted_at.is_(None)
    ).first()

    if not folder:
        return {"error": f"Folder with ID {folder_id} not found"}

    old_name = folder.name
    folder.name = new_name
    db.commit()
    db.refresh(folder)

    return {
        "id": folder.id,
        "old_name": old_name,
        "new_name": folder.name,
        "message": f"Folder renamed from '{old_name}' to '{folder.name}'"
    }


def get_folder_contents_tool(
    db: Session,
    folder_id: str,
    project_id: str
) -> Dict[str, Any]:
    """
    Get all documents and subfolders inside a specific folder.

    Args:
        db: Database session
        folder_id: ID of the folder to get contents from
        project_id: ID of the project (for validation)

    Returns:
        Dictionary with folder contents (documents and subfolders)
    """
    # Get the folder
    folder = db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.deleted_at.is_(None)
    ).first()

    if not folder:
        return {"error": f"Folder with ID {folder_id} not found"}

    # Get documents in this folder
    documents = db.query(Document).filter(
        Document.folder_id == folder_id,
        Document.deleted_at.is_(None)
    ).all()

    # Get subfolders
    subfolders = db.query(Folder).filter(
        Folder.parent_folder_id == folder_id,
        Folder.deleted_at.is_(None)
    ).all()

    return {
        "folder": {
            "id": folder.id,
            "name": folder.name,
            "parent_folder_id": folder.parent_folder_id
        },
        "documents": [
            {
                "id": doc.id,
                "title": doc.title,
                "status": doc.status,
                "media_type": doc.media_type,
                "created_at": str(doc.created_at)
            }
            for doc in documents
        ],
        "subfolders": [
            {
                "id": sf.id,
                "name": sf.name,
                "created_at": str(sf.created_at)
            }
            for sf in subfolders
        ],
        "document_count": len(documents),
        "subfolder_count": len(subfolders)
    }



async def generate_image_tool(
    db: Session,
    project_id: str,
    prompt: str,
    aspect_ratio: str = "1:1",
    attach_to_document_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate an image using AI and optionally attach it to a document.

    Args:
        db: Database session
        project_id: ID of the project
        prompt: Image description
        aspect_ratio: Image aspect ratio (default: "1:1")
        attach_to_document_id: Optional ID of document to attach image to

    Returns:
        Dictionary with image URL and metadata
    """
    from models import DocumentAttachment
    import uuid

    print(f"\n{'='*60}")
    print(f"🖼️ GENERATE IMAGE TOOL STARTED")
    print(f"{'='*60}")
    print(f"Project ID: {project_id}")
    print(f"Prompt: {prompt[:100]}...")
    print(f"Aspect Ratio: {aspect_ratio}")
    print(f"Attach to Document ID: {attach_to_document_id}")

    try:
        # Generate and store image
        result = await generate_and_store_image(
            prompt=prompt,
            project_id=project_id,
            aspect_ratio=aspect_ratio
        )

        image_url = result["file_url"]
        thumbnail_url = result["thumbnail_url"]
        print(f"✅ Image generated: {image_url}")

        # Create a Document record for the generated image
        # Images are stored as documents with media_type='image'
        # Generate AI title for the image
        image_title = await generate_image_title(prompt)
        print(f"📝 Generated title: {image_title}")
        image_doc_id = str(uuid.uuid4())
        print(f"📄 Creating image document with ID: {image_doc_id}")

        image_doc = Document(
            id=image_doc_id,
            title=image_title,
            content=prompt,  # Store prompt as content for reference
            project_id=project_id,
            media_type="image",
            file_url=image_url,
            thumbnail_url=thumbnail_url,
            generation_metadata=result.get("generation_metadata", {}),
            status="approved"
        )
        db.add(image_doc)
        db.commit()
        db.refresh(image_doc)
        print(f"✅ Image document created and committed: {image_doc.id}")

        response = {
            "image_url": image_url,
            "thumbnail_url": thumbnail_url,
            "image_document_id": image_doc.id,
            "prompt": prompt,
            "message": "Image generated successfully"
        }

        # Attach to document if requested (using DocumentAttachment relation)
        if attach_to_document_id:
            print(f"\n📎 Attempting to attach image to document: {attach_to_document_id}")
            doc = get_document(db, attach_to_document_id)
            if doc:
                print(f"✅ Target document found: '{doc.title}'")
                try:
                    # Create DocumentAttachment to link image to document
                    # This uses the proper attached_images system instead of inline markdown
                    attachment_id = str(uuid.uuid4())
                    print(f"📎 Creating attachment with ID: {attachment_id}")
                    print(f"   document_id: {attach_to_document_id}")
                    print(f"   image_id: {image_doc.id}")

                    attachment = DocumentAttachment(
                        id=attachment_id,
                        document_id=attach_to_document_id,
                        image_id=image_doc.id,
                        is_primary=True,  # First attached image is primary
                        attachment_order=0
                    )
                    db.add(attachment)
                    print(f"📎 Attachment added to session, committing...")
                    db.commit()
                    print(f"✅ Attachment committed successfully!")
                    db.refresh(attachment)
                    print(f"✅ Attachment refreshed: {attachment.id}")

                    response["attached_to_document_id"] = attach_to_document_id
                    response["attachment_id"] = attachment.id
                    response["message"] += f" and attached to document '{doc.title}'"
                except Exception as attach_error:
                    print(f"❌ ERROR creating attachment: {attach_error}")
                    import traceback
                    traceback.print_exc()
                    response["warning"] = f"Image generated but attachment failed: {str(attach_error)}"
            else:
                print(f"⚠️ Target document NOT found: {attach_to_document_id}")
                response["warning"] = f"Document with ID {attach_to_document_id} not found, image was generated but not attached."

        print(f"\n{'='*60}")
        print(f"🖼️ GENERATE IMAGE TOOL COMPLETED")
        print(f"Response: {response}")
        print(f"{'='*60}\n")
        return response
    except Exception as e:
        print(f"❌ GENERATE IMAGE TOOL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return {"error": f"Failed to generate image: {str(e)}"}


def attach_image_to_document_tool(
    db: Session,
    document_id: str,
    image_id: str,
    is_primary: bool = False
) -> Dict[str, Any]:
    """
    Attach an existing image to a document.

    Args:
        db: Database session
        document_id: ID of the document to attach the image to
        image_id: ID of the image document to attach
        is_primary: Whether this should be the primary image (default: False)

    Returns:
        Dictionary with attachment details or error
    """
    from models import DocumentAttachment
    import uuid

    try:
        # Verify document exists
        doc = get_document(db, document_id)
        if not doc:
            return {"error": f"Document with ID {document_id} not found"}

        # Verify image exists and is an image
        image = get_document(db, image_id)
        if not image:
            return {"error": f"Image with ID {image_id} not found"}

        if image.media_type != "image":
            return {"error": f"Document {image_id} is not an image (media_type: {image.media_type})"}

        # Check if already attached
        existing = db.query(DocumentAttachment).filter(
            DocumentAttachment.document_id == document_id,
            DocumentAttachment.image_id == image_id
        ).first()

        if existing:
            return {
                "attachment_id": existing.id,
                "document_id": document_id,
                "image_id": image_id,
                "message": "Image was already attached to this document"
            }

        # If setting as primary, unmark other primary attachments
        if is_primary:
            db.query(DocumentAttachment).filter(
                DocumentAttachment.document_id == document_id,
                DocumentAttachment.is_primary == True
            ).update({"is_primary": False})

        # Create attachment
        attachment = DocumentAttachment(
            id=str(uuid.uuid4()),
            document_id=document_id,
            image_id=image_id,
            is_primary=is_primary,
            attachment_order=0
        )
        db.add(attachment)
        db.commit()

        return {
            "attachment_id": attachment.id,
            "document_id": document_id,
            "document_title": doc.title,
            "image_id": image_id,
            "image_url": image.file_url,
            "is_primary": is_primary,
            "message": f"Image attached successfully to document '{doc.title}'"
        }
    except Exception as e:
        return {"error": f"Failed to attach image: {str(e)}"}


# Tool definitions for OpenRouter function calling
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "read_document",
            "description": "Read the full content of a specific document by its ID",
            "parameters": {
                "type": "object",
                "properties": {
                    "document_id": {
                        "type": "string",
                        "description": "The ID of the document to read"
                    }
                },
                "required": ["document_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "edit_document",
            "description": "Edit a document's content or title. Can replace, append, or prepend content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "document_id": {
                        "type": "string",
                        "description": "The ID of the document to edit"
                    },
                    "content": {
                        "type": "string",
                        "description": "The new content to set, append, or prepend"
                    },
                    "title": {
                        "type": "string",
                        "description": "Optional new title for the document"
                    },
                    "edit_type": {
                        "type": "string",
                        "enum": ["replace", "append", "prepend"],
                        "description": "How to apply the content: replace (default), append to end, or prepend to beginning"
                    }
                },
                "required": ["document_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_documents",
            "description": "List all documents in the current project",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The ID of the project"
                    }
                },
                "required": ["project_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": "Search for documents containing specific text in title or content",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The ID of the project to search in"
                    },
                    "query": {
                        "type": "string",
                        "description": "The search query text"
                    }
                },
                "required": ["project_id", "query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_document",
            "description": "Create a new document in a project with given title and content",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The ID of the project where the document will be created"
                    },
                    "title": {
                        "type": "string",
                        "description": "Title of the new document"
                    },
                    "content": {
                        "type": "string",
                        "description": "Initial content for the document (optional)"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["draft", "review", "approved", "production"],
                        "description": "Initial status of the document (default: draft)"
                    }
                },
                "required": ["project_id", "title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_folder",
            "description": "Create a new folder in a project to organize documents hierarchically",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The ID of the project where the folder will be created"
                    },
                    "name": {
                        "type": "string",
                        "description": "Name of the new folder"
                    },
                    "parent_folder_id": {
                        "type": "string",
                        "description": "ID of the parent folder (omit for root-level folder)"
                    }
                },
                "required": ["project_id", "name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_folders",
            "description": "List all folders in a project, optionally filtered by parent folder",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The ID of the project"
                    },
                    "parent_folder_id": {
                        "type": "string",
                        "description": "ID of parent folder to filter by (omit to list root folders)"
                    }
                },
                "required": ["project_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "move_file",
            "description": "Move a document to a different folder or to root level",
            "parameters": {
                "type": "object",
                "properties": {
                    "document_id": {
                        "type": "string",
                        "description": "The ID of the document to move"
                    },
                    "folder_id": {
                        "type": "string",
                        "description": "ID of the destination folder (omit or set to null for root level)"
                    }
                },
                "required": ["document_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "move_folder",
            "description": "Move a folder to a new parent folder or to root level",
            "parameters": {
                "type": "object",
                "properties": {
                    "folder_id": {
                        "type": "string",
                        "description": "The ID of the folder to move"
                    },
                    "new_parent_id": {
                        "type": "string",
                        "description": "ID of the new parent folder (omit or set to null for root level)"
                    }
                },
                "required": ["folder_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_file",
            "description": "Archive (soft delete) a document. The document can be restored later. Use this instead of permanently deleting.",
            "parameters": {
                "type": "object",
                "properties": {
                    "document_id": {
                        "type": "string",
                        "description": "The ID of the document to archive"
                    }
                },
                "required": ["document_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_folder",
            "description": "Archive (soft delete) a folder and optionally its contents. The folder can be restored later.",
            "parameters": {
                "type": "object",
                "properties": {
                    "folder_id": {
                        "type": "string",
                        "description": "The ID of the folder to archive"
                    },
                    "delete_contents": {
                        "type": "boolean",
                        "description": "Whether to also archive all documents and subfolders (default: true)"
                    }
                },
                "required": ["folder_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the internet for current information, news, facts, or any topic. Use this when you need up-to-date information not in your training data or when the user asks about recent events, current data, or anything happening after your knowledge cutoff.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query. Be specific and clear about what you're looking for."
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Number of search results to return (1-20, default: 5)",
                        "default": 5
                    },
                    "search_type": {
                        "type": "string",
                        "enum": ["general", "news"],
                        "description": "Type of search to perform. Use 'news' for recent news/events, 'general' for everything else (default: general)"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "rename_document",
            "description": "Rename a document by changing its title",
            "parameters": {
                "type": "object",
                "properties": {
                    "document_id": {
                        "type": "string",
                        "description": "The ID of the document to rename"
                    },
                    "new_title": {
                        "type": "string",
                        "description": "The new title for the document"
                    }
                },
                "required": ["document_id", "new_title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "rename_folder",
            "description": "Rename a folder by changing its name",
            "parameters": {
                "type": "object",
                "properties": {
                    "folder_id": {
                        "type": "string",
                        "description": "The ID of the folder to rename"
                    },
                    "new_name": {
                        "type": "string",
                        "description": "The new name for the folder"
                    }
                },
                "required": ["folder_id", "new_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_folder_contents",
            "description": "Get all documents and subfolders inside a specific folder",
            "parameters": {
                "type": "object",
                "properties": {
                    "folder_id": {
                        "type": "string",
                        "description": "The ID of the folder to get contents from"
                    },
                    "project_id": {
                        "type": "string",
                        "description": "The ID of the project"
                    }
                },
                "required": ["folder_id", "project_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_image",
            "description": "Generate an image using AI based on a text prompt. The image is saved as a separate document in the project. If attach_to_document_id is provided, the image will be attached to that document as an attached image (visible in the document's image attachments section).",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The ID of the project"
                    },
                    "prompt": {
                        "type": "string",
                        "description": "Detailed description of the image to generate"
                    },
                    "aspect_ratio": {
                        "type": "string",
                        "enum": ["1:1", "16:9", "9:16", "4:3", "3:4"],
                        "description": "Aspect ratio of the image (default: 1:1)"
                    },
                    "attach_to_document_id": {
                        "type": "string",
                        "description": "Optional ID of a document to attach the generated image to. The image will appear in the document's attached images section."
                    }
                },
                "required": ["project_id", "prompt"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "attach_image_to_document",
            "description": "Attach an existing image (that was previously generated or uploaded) to a document. The image must already exist as a document with media_type='image'. Use this to link images to text documents so they appear in the document's attached images section.",
            "parameters": {
                "type": "object",
                "properties": {
                    "document_id": {
                        "type": "string",
                        "description": "The ID of the document to attach the image to"
                    },
                    "image_id": {
                        "type": "string",
                        "description": "The ID of the image document to attach"
                    },
                    "is_primary": {
                        "type": "boolean",
                        "description": "Whether this image should be the primary/featured image for the document (default: false)"
                    }
                },
                "required": ["document_id", "image_id"]
            }
        }
    }
]


async def execute_tool(
    tool_name: str,
    tool_args: Dict[str, Any],
    db: Session
) -> Dict[str, Any]:
    """
    Execute a tool by name with given arguments.
    
    Args:
        tool_name: Name of the tool to execute
        tool_args: Arguments for the tool
        db: Database session
        
    Returns:
        Tool execution result
    """
    if tool_name == "read_document":
        return read_document_tool(db, tool_args["document_id"])
    
    elif tool_name == "edit_document":
        return edit_document_tool(
            db,
            tool_args["document_id"],
            content=tool_args.get("content"),
            title=tool_args.get("title"),
            edit_type=tool_args.get("edit_type", "replace")
        )
    
    elif tool_name == "list_documents":
        return list_documents_tool(db, tool_args["project_id"])
    
    elif tool_name == "search_documents":
        return search_documents_tool(
            db,
            tool_args["project_id"],
            tool_args["query"]
        )

    elif tool_name == "create_document":
        return create_document_tool(
            db,
            tool_args["project_id"],
            tool_args["title"],
            content=tool_args.get("content", ""),
            status=tool_args.get("status", "draft")
        )

    elif tool_name == "create_folder":
        # Convert empty string to None for parent_folder_id
        parent_id = tool_args.get("parent_folder_id")
        if parent_id == "" or parent_id == "null":
            parent_id = None

        return create_folder_tool(
            db,
            tool_args["project_id"],
            tool_args["name"],
            parent_folder_id=parent_id
        )

    elif tool_name == "list_folders":
        return list_folders_tool(
            db,
            tool_args["project_id"],
            parent_folder_id=tool_args.get("parent_folder_id")
        )

    elif tool_name == "move_file":
        return move_file_tool(
            db,
            tool_args["document_id"],
            folder_id=tool_args.get("folder_id")
        )

    elif tool_name == "move_folder":
        return move_folder_tool(
            db,
            tool_args["folder_id"],
            new_parent_id=tool_args.get("new_parent_id")
        )

    elif tool_name == "delete_file":
        return delete_file_tool(
            db,
            tool_args["document_id"]
        )

    elif tool_name == "delete_folder":
        return delete_folder_tool(
            db,
            tool_args["folder_id"],
            delete_contents=tool_args.get("delete_contents", True)
        )

    elif tool_name == "web_search":
        # Import here to avoid circular dependencies
        from search_service import web_search_sync
        # Use synchronous version to avoid event loop issues
        return web_search_sync(
            query=tool_args["query"],
            max_results=tool_args.get("max_results", 5),
            search_type=tool_args.get("search_type", "general")
        )

    elif tool_name == "rename_document":
        return rename_document_tool(
            db,
            tool_args["document_id"],
            tool_args["new_title"]
        )

    elif tool_name == "rename_folder":
        return rename_folder_tool(
            db,
            tool_args["folder_id"],
            tool_args["new_name"]
        )

    elif tool_name == "get_folder_contents":
        return get_folder_contents_tool(
            db,
            tool_args["folder_id"],
            tool_args["project_id"]
        )

    elif tool_name == "generate_image":
        return await generate_image_tool(
            db,
            tool_args["project_id"],
            tool_args["prompt"],
            aspect_ratio=tool_args.get("aspect_ratio", "1:1"),
            attach_to_document_id=tool_args.get("attach_to_document_id")
        )

    elif tool_name == "attach_image_to_document":
        return attach_image_to_document_tool(
            db,
            tool_args["document_id"],
            tool_args["image_id"],
            is_primary=tool_args.get("is_primary", False)
        )

    else:
        return {"error": f"Unknown tool: {tool_name}"}
