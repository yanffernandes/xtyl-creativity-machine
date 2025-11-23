from sqlalchemy.orm import Session
from models import User, Workspace, Project, WorkspaceUser, Document, Folder, ActivityLog
from schemas import UserCreate, WorkspaceCreate, ProjectCreate, DocumentCreate, DocumentUpdate, UserUpdate, WorkspaceUpdate
from passlib.context import CryptContext
from datetime import datetime
from typing import Optional, List

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password, full_name=user.full_name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: str, user_update: UserUpdate):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return None

    if user_update.full_name is not None:
        db_user.full_name = user_update.full_name
    if user_update.password is not None:
        db_user.hashed_password = get_password_hash(user_update.password)
    if user_update.email is not None:
        db_user.email = user_update.email

    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_password(db: Session, user_id: str, new_password: str):
    """Update user password (for password reset)"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        return None

    db_user.hashed_password = get_password_hash(new_password)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_workspace(db: Session, workspace: WorkspaceCreate, user_id: str):
    db_workspace = Workspace(name=workspace.name, description=workspace.description)
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)

    # Add creator as owner
    workspace_user = WorkspaceUser(workspace_id=db_workspace.id, user_id=user_id, role="owner")
    db.add(workspace_user)
    db.commit()
    
    return db_workspace

def get_user_workspaces(db: Session, user_id: str):
    return db.query(Workspace).join(WorkspaceUser).filter(WorkspaceUser.user_id == user_id).all()

def get_workspace(db: Session, workspace_id: str):
    return db.query(Workspace).filter(Workspace.id == workspace_id).first()

def update_workspace(db: Session, workspace_id: str, workspace_update: WorkspaceUpdate):
    db_workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not db_workspace:
        return None

    if workspace_update.name is not None:
        db_workspace.name = workspace_update.name
    if workspace_update.description is not None:
        db_workspace.description = workspace_update.description
    if workspace_update.default_text_model is not None:
        db_workspace.default_text_model = workspace_update.default_text_model
    if workspace_update.default_vision_model is not None:
        db_workspace.default_vision_model = workspace_update.default_vision_model
    if workspace_update.attachment_analysis_model is not None:
        db_workspace.attachment_analysis_model = workspace_update.attachment_analysis_model
    if workspace_update.available_models is not None:
        db_workspace.available_models = workspace_update.available_models

    db.commit()
    db.refresh(db_workspace)
    return db_workspace

def get_workspace_members(db: Session, workspace_id: str):
    workspace_users = db.query(WorkspaceUser).filter(WorkspaceUser.workspace_id == workspace_id).all()
    members = []
    for wu in workspace_users:
        user = db.query(User).filter(User.id == wu.user_id).first()
        if user:
            members.append({
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": wu.role
            })
    return members

def add_workspace_member(db: Session, workspace_id: str, user_email: str, role: str = "member", inviter_name: str = "Team"):
    user = get_user_by_email(db, user_email)
    if not user:
        return None

    # Check if already a member
    existing = db.query(WorkspaceUser).filter(
        WorkspaceUser.workspace_id == workspace_id,
        WorkspaceUser.user_id == user.id
    ).first()

    if existing:
        return {"error": "User is already a member"}

    # Get workspace info for email
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()

    workspace_user = WorkspaceUser(workspace_id=workspace_id, user_id=user.id, role=role)
    db.add(workspace_user)
    db.commit()

    # Send welcome email
    from email_service import send_welcome_email
    if workspace:
        send_welcome_email(
            email=user.email,
            workspace_name=workspace.name,
            invited_by=inviter_name,
            user_name=user.full_name
        )

    return {"success": True, "user": user}

def remove_workspace_member(db: Session, workspace_id: str, user_id: str):
    workspace_user = db.query(WorkspaceUser).filter(
        WorkspaceUser.workspace_id == workspace_id,
        WorkspaceUser.user_id == user_id
    ).first()

    if not workspace_user:
        return False

    # Don't allow removing the owner
    if workspace_user.role == "owner":
        return False

    db.delete(workspace_user)
    db.commit()
    return True

def create_project(db: Session, project: ProjectCreate):
    db_project = Project(name=project.name, description=project.description, workspace_id=project.workspace_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_workspace_projects(db: Session, workspace_id: str):
    return db.query(Project).filter(Project.workspace_id == workspace_id).all()

def get_project_documents(db: Session, project_id: str):
    return db.query(Document).filter(
        Document.project_id == project_id,
        Document.deleted_at == None
    ).all()

def get_document(db: Session, document_id: str):
    return db.query(Document).filter(Document.id == document_id).first()

def create_document(db: Session, document: DocumentCreate, project_id: str):
    db_document = Document(
        title=document.title,
        content=document.content,
        status=document.status,
        project_id=project_id
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    return db_document

def update_document(db: Session, document_id: str, document: DocumentUpdate):
    from datetime import datetime

    db_document = db.query(Document).filter(Document.id == document_id).first()
    if not db_document:
        return None

    if document.title is not None:
        db_document.title = document.title
    if document.content is not None:
        db_document.content = document.content
    if document.status is not None:
        db_document.status = document.status

    # Manually update the updated_at timestamp (SQLAlchemy onupdate doesn't trigger on Python attr changes)
    db_document.updated_at = datetime.now()

    db.commit()
    db.refresh(db_document)
    return db_document

def delete_document(db: Session, document_id: str):
    """Hard delete - use soft_delete_document for archiving"""
    db_document = db.query(Document).filter(Document.id == document_id).first()
    if db_document:
        db.delete(db_document)
        db.commit()
        return True
    return False

def soft_delete_document(db: Session, document_id: str, user_id: Optional[str] = None):
    """Soft delete (archive) a document"""
    db_document = db.query(Document).filter(Document.id == document_id).first()
    if not db_document:
        return None

    # Log activity before deletion
    log_activity(
        db=db,
        entity_type="document",
        entity_id=document_id,
        action="delete",
        actor_type="human",
        user_id=user_id,
        changes={
            "before": {
                "title": db_document.title,
                "content": db_document.content,
                "status": db_document.status,
                "folder_id": db_document.folder_id
            },
            "after": None
        }
    )

    db_document.deleted_at = datetime.now()
    db.commit()
    db.refresh(db_document)
    return db_document

# ========== FOLDER CRUD FUNCTIONS ==========

def get_folder(db: Session, folder_id: str):
    return db.query(Folder).filter(
        Folder.id == folder_id,
        Folder.deleted_at == None
    ).first()

def list_folders(db: Session, project_id: str, parent_folder_id: Optional[str] = None):
    """List folders in a project, optionally filtered by parent"""
    query = db.query(Folder).filter(
        Folder.project_id == project_id,
        Folder.deleted_at == None
    )

    if parent_folder_id:
        query = query.filter(Folder.parent_folder_id == parent_folder_id)
    else:
        query = query.filter(Folder.parent_folder_id == None)

    return query.all()

def create_folder(db: Session, name: str, project_id: str, parent_folder_id: Optional[str] = None, user_id: Optional[str] = None):
    """Create a new folder"""
    db_folder = Folder(
        name=name,
        project_id=project_id,
        parent_folder_id=parent_folder_id
    )
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)

    # Log activity
    log_activity(
        db=db,
        entity_type="folder",
        entity_id=db_folder.id,
        action="create",
        actor_type="human",
        user_id=user_id,
        changes={
            "before": None,
            "after": {
                "name": name,
                "parent_folder_id": parent_folder_id
            }
        }
    )

    return db_folder

def update_folder(db: Session, folder_id: str, name: Optional[str] = None, user_id: Optional[str] = None):
    """Update folder name"""
    db_folder = get_folder(db, folder_id)
    if not db_folder:
        return None

    old_name = db_folder.name

    if name is not None:
        db_folder.name = name
        db_folder.updated_at = datetime.now()

    db.commit()
    db.refresh(db_folder)

    # Log activity
    log_activity(
        db=db,
        entity_type="folder",
        entity_id=folder_id,
        action="update",
        actor_type="human",
        user_id=user_id,
        changes={
            "before": {"name": old_name},
            "after": {"name": name}
        }
    )

    return db_folder

def move_folder(db: Session, folder_id: str, new_parent_id: Optional[str], user_id: Optional[str] = None):
    """Move folder to a new parent (or to root if new_parent_id is None)"""
    db_folder = get_folder(db, folder_id)
    if not db_folder:
        return None

    # Validate no circular reference
    if new_parent_id:
        if new_parent_id == folder_id:
            return {"error": "Cannot make folder its own parent"}

        # Check if new_parent is a descendant of folder
        current = get_folder(db, new_parent_id)
        while current and current.parent_folder_id:
            if current.parent_folder_id == folder_id:
                return {"error": "Cannot move folder into its own descendant"}
            current = get_folder(db, current.parent_folder_id)

    old_parent_id = db_folder.parent_folder_id
    db_folder.parent_folder_id = new_parent_id
    db_folder.updated_at = datetime.now()
    db.commit()
    db.refresh(db_folder)

    # Log activity
    log_activity(
        db=db,
        entity_type="folder",
        entity_id=folder_id,
        action="move",
        actor_type="human",
        user_id=user_id,
        changes={
            "before": {"parent_folder_id": old_parent_id},
            "after": {"parent_folder_id": new_parent_id}
        }
    )

    return db_folder

def soft_delete_folder(db: Session, folder_id: str, cascade: bool = True, user_id: Optional[str] = None):
    """Soft delete a folder and optionally its contents"""
    db_folder = get_folder(db, folder_id)
    if not db_folder:
        return None

    # Log activity before deletion
    log_activity(
        db=db,
        entity_type="folder",
        entity_id=folder_id,
        action="delete",
        actor_type="human",
        user_id=user_id,
        changes={
            "before": {
                "name": db_folder.name,
                "parent_folder_id": db_folder.parent_folder_id
            },
            "after": None
        }
    )

    db_folder.deleted_at = datetime.now()

    if cascade:
        # Soft delete all documents in this folder
        documents = db.query(Document).filter(
            Document.folder_id == folder_id,
            Document.deleted_at == None
        ).all()

        for doc in documents:
            soft_delete_document(db, doc.id, user_id)

        # Recursively soft delete subfolders
        subfolders = db.query(Folder).filter(
            Folder.parent_folder_id == folder_id,
            Folder.deleted_at == None
        ).all()

        for subfolder in subfolders:
            soft_delete_folder(db, subfolder.id, cascade=True, user_id=user_id)

    db.commit()
    db.refresh(db_folder)
    return db_folder

def move_document(db: Session, document_id: str, folder_id: Optional[str], user_id: Optional[str] = None):
    """Move a document to a different folder"""
    db_document = db.query(Document).filter(Document.id == document_id).first()
    if not db_document:
        return None

    old_folder_id = db_document.folder_id
    db_document.folder_id = folder_id
    db_document.updated_at = datetime.now()
    db.commit()
    db.refresh(db_document)

    # Log activity
    log_activity(
        db=db,
        entity_type="document",
        entity_id=document_id,
        action="move",
        actor_type="human",
        user_id=user_id,
        changes={
            "before": {"folder_id": old_folder_id},
            "after": {"folder_id": folder_id}
        }
    )

    return db_document

# ========== ACTIVITY LOG FUNCTIONS ==========

def log_activity(
    db: Session,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_type: str,
    user_id: Optional[str] = None,
    changes: Optional[dict] = None
):
    """Log an activity to the activity log"""
    activity = ActivityLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_type=actor_type,
        user_id=user_id,
        changes=changes
    )
    db.add(activity)
    db.commit()
    return activity

def get_entity_activity(db: Session, entity_type: str, entity_id: str):
    """Get activity history for an entity"""
    return db.query(ActivityLog).filter(
        ActivityLog.entity_type == entity_type,
        ActivityLog.entity_id == entity_id
    ).order_by(ActivityLog.created_at.desc()).all()

def list_archived_documents(db: Session, project_id: str):
    """List all archived documents in a project"""
    return db.query(Document).filter(
        Document.project_id == project_id,
        Document.deleted_at != None
    ).all()

def list_archived_folders(db: Session, project_id: str):
    """List all archived folders in a project"""
    return db.query(Folder).filter(
        Folder.project_id == project_id,
        Folder.deleted_at != None
    ).all()

def restore_document(db: Session, document_id: str, user_id: Optional[str] = None):
    """Restore a soft-deleted document"""
    db_document = db.query(Document).filter(Document.id == document_id).first()
    if not db_document or not db_document.deleted_at:
        return None

    # Log activity
    log_activity(
        db=db,
        entity_type="document",
        entity_id=document_id,
        action="restore",
        actor_type="human",
        user_id=user_id,
        changes={
            "before": {"deleted_at": str(db_document.deleted_at)},
            "after": {"deleted_at": None}
        }
    )

    db_document.deleted_at = None
    db.commit()
    db.refresh(db_document)
    return db_document

def restore_folder(db: Session, folder_id: str, restore_contents: bool = False, user_id: Optional[str] = None):
    """Restore a soft-deleted folder"""
    db_folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not db_folder or not db_folder.deleted_at:
        return None

    # Log activity
    log_activity(
        db=db,
        entity_type="folder",
        entity_id=folder_id,
        action="restore",
        actor_type="human",
        user_id=user_id,
        changes={
            "before": {"deleted_at": str(db_folder.deleted_at)},
            "after": {"deleted_at": None}
        }
    )

    db_folder.deleted_at = None

    if restore_contents:
        # Restore all documents in this folder
        documents = db.query(Document).filter(
            Document.folder_id == folder_id,
            Document.deleted_at != None
        ).all()

        for doc in documents:
            restore_document(db, doc.id, user_id)

        # Restore subfolders
        subfolders = db.query(Folder).filter(
            Folder.parent_folder_id == folder_id,
            Folder.deleted_at != None
        ).all()

        for subfolder in subfolders:
            restore_folder(db, subfolder.id, restore_contents=True, user_id=user_id)

    db.commit()
    db.refresh(db_folder)
    return db_folder
