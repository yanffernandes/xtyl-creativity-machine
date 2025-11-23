from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Text, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspaces = relationship("WorkspaceUser", back_populates="user")

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    default_text_model = Column(String, nullable=True)
    default_vision_model = Column(String, nullable=True)
    attachment_analysis_model = Column(String, nullable=True)  # Model for analyzing attachments (PDFs, images)
    available_models = Column(JSONB, nullable=True, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("WorkspaceUser", back_populates="workspace")
    projects = relationship("Project", back_populates="workspace")

class WorkspaceUser(Base):
    __tablename__ = "workspace_users"

    workspace_id = Column(String, ForeignKey("workspaces.id"), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    role = Column(String, default="member") # owner, admin, member

    workspace = relationship("Workspace", back_populates="users")
    user = relationship("User", back_populates="workspaces")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="projects")
    documents = relationship("Document", back_populates="project")
    folders = relationship("Folder", back_populates="project")

class Folder(Base):
    __tablename__ = "folders"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    parent_folder_id = Column(String, ForeignKey("folders.id"), nullable=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="folders")
    parent = relationship("Folder", remote_side=[id], backref="children")
    documents = relationship("Document", back_populates="folder")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String)
    content = Column(Text) # Markdown content
    status = Column(String, default="draft") # draft, review, approved, production
    project_id = Column(String, ForeignKey("projects.id"))
    folder_id = Column(String, ForeignKey("folders.id"), nullable=True)

    # Media fields for images and other file types
    media_type = Column(String, default="text")  # 'text', 'image', 'pdf'
    file_url = Column(String, nullable=True)  # URL in MinIO storage
    thumbnail_url = Column(String, nullable=True)  # Thumbnail URL
    generation_metadata = Column(JSONB, nullable=True)  # {model, prompt, params, etc}

    # Visual asset fields (for reference images/logos/backgrounds)
    is_reference_asset = Column(Boolean, default=False)  # Flag for visual assets library
    asset_type = Column(String, nullable=True)  # 'logo', 'background', 'person', 'reference', 'other'
    asset_metadata = Column(JSONB, nullable=True)  # {tags: [], dimensions: '', file_size: '', format: '', etc}

    # Public sharing fields
    is_public = Column(Boolean, default=False)
    share_token = Column(String, unique=True, nullable=True, index=True)
    share_expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project", back_populates="documents")
    folder = relationship("Folder", back_populates="documents")

class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(String, primary_key=True, default=generate_uuid)
    entity_type = Column(String, nullable=False)  # 'document', 'folder'
    entity_id = Column(String, nullable=False)
    action = Column(String, nullable=False)  # 'create', 'update', 'delete', 'restore', 'move'
    actor_type = Column(String, nullable=False)  # 'human', 'ai'
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    changes = Column(JSONB, nullable=True)  # {before: {...}, after: {...}}
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

class AIUsageLog(Base):
    __tablename__ = "ai_usage_log"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)

    # Request details
    model = Column(String, nullable=False)
    provider = Column(String, nullable=False)  # 'openrouter', 'anthropic', 'openai'
    request_type = Column(String, nullable=False)  # 'chat', 'vision', 'tool_call'

    # Token usage
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)

    # Cost (in USD)
    input_cost = Column(Numeric(10, 6), nullable=False, default=0.0)
    output_cost = Column(Numeric(10, 6), nullable=False, default=0.0)
    total_cost = Column(Numeric(10, 6), nullable=False, default=0.0)

    # Context
    prompt_preview = Column(Text, nullable=True)  # First 500 chars
    response_preview = Column(Text, nullable=True)  # First 500 chars
    tool_calls = Column(JSONB, nullable=True)  # List of tools used

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    duration_ms = Column(Integer, nullable=True)  # Response time

    # Relationships
    user = relationship("User")
    workspace = relationship("Workspace")
    project = relationship("Project")


class Template(Base):
    __tablename__ = "templates"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True)  # Null = global/system template
    user_id = Column(String, ForeignKey("users.id"), nullable=True)  # Who created (null for system templates)

    # Template details
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False, index=True)  # 'ads', 'landing_page', 'email', 'social_media', 'seo', 'creative'
    icon = Column(String, nullable=True)  # Emoji or icon name

    # The actual prompt
    prompt = Column(Text, nullable=False)

    # Configuration
    is_system = Column(Boolean, default=False, index=True)  # System templates vs user-created
    is_active = Column(Boolean, default=True)
    tags = Column(JSONB, nullable=True)  # Array of tag strings

    # Usage stats
    usage_count = Column(Integer, default=0)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    workspace = relationship("Workspace")
    user = relationship("User")
