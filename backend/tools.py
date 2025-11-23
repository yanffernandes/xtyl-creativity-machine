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
    }
]


def execute_tool(
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

    else:
        return {"error": f"Unknown tool: {tool_name}"}
