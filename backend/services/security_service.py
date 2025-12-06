"""
Security Service - Feature 025: Security Hardening

Provides authorization helper functions to prevent IDOR vulnerabilities.
All resource access should be validated through these functions.
"""

import os
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException

from models import Project, Document, WorkflowTemplate, WorkspaceUser


def verify_project_access(db: Session, project_id: str, user_id: str) -> Project:
    """
    Verify user has access to project via workspace membership.

    Args:
        db: Database session
        project_id: ID of the project to verify access to
        user_id: ID of the user requesting access

    Returns:
        Project if access is granted

    Raises:
        HTTPException 404 if project not found
        HTTPException 403 if access denied
    """
    # First check if project exists
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Project has been deleted")

    # Check if user is a member of the project's workspace
    workspace_member = db.query(WorkspaceUser).filter(
        WorkspaceUser.workspace_id == project.workspace_id,
        WorkspaceUser.user_id == str(user_id)
    ).first()

    if not workspace_member:
        raise HTTPException(status_code=403, detail="Access denied")

    return project


def verify_document_access(db: Session, document_id: str, user_id: str) -> Document:
    """
    Verify user has access to document via project membership.

    Args:
        db: Database session
        document_id: ID of the document to verify access to
        user_id: ID of the user requesting access

    Returns:
        Document if access is granted

    Raises:
        HTTPException 404 if document not found
        HTTPException 403 if access denied
    """
    document = db.query(Document).filter(Document.id == document_id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Document has been deleted")

    # Verify user has access to the document's project
    verify_project_access(db, document.project_id, user_id)

    return document


def verify_workflow_access(db: Session, template_id: str, user_id: str) -> WorkflowTemplate:
    """
    Verify user has access to workflow template via project membership.

    Args:
        db: Database session
        template_id: ID of the workflow template to verify access to
        user_id: ID of the user requesting access

    Returns:
        WorkflowTemplate if access is granted

    Raises:
        HTTPException 404 if workflow not found
        HTTPException 403 if access denied
    """
    template = db.query(WorkflowTemplate).filter(
        WorkflowTemplate.id == template_id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Verify user has access to the workflow's project
    verify_project_access(db, template.project_id, user_id)

    return template


def validate_file_path(file_path: str) -> str:
    """
    Validate file path to prevent path traversal attacks.

    Args:
        file_path: The file path to validate

    Returns:
        Normalized file path if valid

    Raises:
        HTTPException 400 if path is invalid (contains traversal attempts)
    """
    # Reject absolute paths
    if os.path.isabs(file_path):
        raise HTTPException(status_code=400, detail="Invalid file path: absolute paths not allowed")

    # Reject path traversal attempts
    if ".." in file_path:
        raise HTTPException(status_code=400, detail="Invalid file path: path traversal not allowed")

    # Reject paths with null bytes (can bypass checks in some systems)
    if "\x00" in file_path:
        raise HTTPException(status_code=400, detail="Invalid file path: null bytes not allowed")

    # Normalize the path
    normalized = os.path.normpath(file_path)

    # After normalization, check again for traversal
    if normalized.startswith("..") or normalized.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid file path")

    return normalized


def verify_admin_access(user_id: str, db: Session) -> bool:
    """
    Verify user has admin privileges.

    Args:
        user_id: ID of the user to check
        db: Database session

    Returns:
        True if user is admin

    Raises:
        HTTPException 403 if not admin
    """
    from models import User

    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.is_super_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    return True
