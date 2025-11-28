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
    status = Column(String, default="draft") # draft, text_ok, art_ok, done, published
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
    attachments = relationship("DocumentAttachment", foreign_keys="[DocumentAttachment.document_id]", back_populates="document")

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

# ============================================================================
# WORKFLOW SYSTEM MODELS
# ============================================================================

class WorkflowTemplate(Base):
    """Reusable workflow definition with nodes and edges"""
    __tablename__ = "workflow_templates"

    id = Column(String, primary_key=True, default=generate_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True, index=True)  # NULL for system templates
    project_id = Column(String, ForeignKey("projects.id"), nullable=True, index=True)  # NULL for workspace/system templates
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True, index=True)  # social_media, paid_ads, blog, email, seo

    # Workflow definition (ReactFlow format)
    nodes_json = Column(JSONB, nullable=False, default=list)  # Array of {id, type, data, position}
    edges_json = Column(JSONB, nullable=False, default=list)  # Array of {id, source, target}
    default_params_json = Column(JSONB, nullable=True, default=dict)  # Default configuration

    # Template metadata
    is_system = Column(Boolean, default=False, index=True)  # System template vs custom
    is_recommended = Column(Boolean, default=False, index=True)  # Featured in template library
    usage_count = Column(Integer, default=0)
    version = Column(String, default="1.0")  # Workflow schema version
    created_by = Column(String, ForeignKey("users.id"), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    workspace = relationship("Workspace")
    project = relationship("Project")
    creator = relationship("User", foreign_keys=[created_by])
    executions = relationship("WorkflowExecution", back_populates="template")

class WorkflowExecution(Base):
    """Running instance of a workflow template"""
    __tablename__ = "workflow_executions"

    id = Column(String, primary_key=True, default=generate_uuid)
    template_id = Column(String, ForeignKey("workflow_templates.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    # Execution state
    status = Column(String, nullable=False, default="pending", index=True)  # pending, running, paused, completed, failed, stopped
    config_json = Column(JSONB, nullable=True, default=dict)  # User-provided execution parameters
    execution_context = Column(JSONB, nullable=True, default=dict)  # Current variable values, loop state
    progress_percent = Column(Integer, default=0)
    current_node_id = Column(String, nullable=True)  # Current executing node
    celery_task_id = Column(String, nullable=True, index=True)  # Celery task ID for pause/resume/cancel

    # Results and errors
    error_message = Column(Text, nullable=True)
    total_cost = Column(Numeric(10, 6), default=0.0)  # Total USD cost
    total_tokens_used = Column(Integer, default=0)  # Sum of all AI API tokens
    generated_document_ids = Column(JSONB, nullable=True, default=list)  # Array of Document IDs created

    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    template = relationship("WorkflowTemplate", back_populates="executions")
    project = relationship("Project")
    workspace = relationship("Workspace")
    user = relationship("User")
    agent_jobs = relationship("AgentJob", back_populates="execution")
    node_outputs = relationship("NodeOutput", back_populates="execution")

class AgentJob(Base):
    """Individual AI task within a workflow execution"""
    __tablename__ = "agent_jobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    execution_id = Column(String, ForeignKey("workflow_executions.id"), nullable=False, index=True)
    node_id = Column(String, nullable=False)  # Node ID from workflow template
    job_type = Column(String, nullable=False)  # generate_copy, generate_image, attach, review

    # Job state
    status = Column(String, nullable=False, default="pending", index=True)  # pending, running, completed, failed, skipped
    input_data_json = Column(JSONB, nullable=True)
    output_data_json = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)

    # Usage tracking
    tokens_used = Column(Integer, default=0)

    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    execution = relationship("WorkflowExecution", back_populates="agent_jobs")

class NodeOutput(Base):
    """Stores outputs from each node execution for variable resolution and execution history"""
    __tablename__ = "node_outputs"

    id = Column(String, primary_key=True, default=generate_uuid)
    execution_id = Column(String, ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=False, index=True)

    # Node identification
    node_id = Column(String, nullable=False, index=True)  # Node ID from workflow definition
    node_name = Column(String, nullable=False)  # Human-readable node name for debugging
    node_type = Column(String, nullable=False)  # start, text_generation, image_generation, etc.

    # Output data (supports structured outputs via OutputParser)
    outputs = Column(JSONB, nullable=False)  # Structured output data with parsed fields

    # Metadata
    execution_order = Column(Integer, nullable=False)  # Sequence number in execution
    iteration_number = Column(Integer, default=0)  # Loop iteration (0 if not in loop)

    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    execution = relationship("WorkflowExecution", back_populates="node_outputs")

class UserPreferences(Base):
    """Stores AI assistant preferences per user"""
    __tablename__ = "user_preferences"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    autonomous_mode = Column(Boolean, default=False, nullable=False)
    max_iterations = Column(Integer, default=15, nullable=False)
    default_model = Column(String(100), nullable=True)
    use_rag_by_default = Column(Boolean, default=True, nullable=False)
    settings = Column(JSONB, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User")


class ChatConversation(Base):
    """Stores chat conversation history for users"""
    __tablename__ = "chat_conversations"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True, index=True)
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=False, index=True)

    # Conversation metadata
    title = Column(String, nullable=True)  # Auto-generated from first message or user-defined
    summary = Column(Text, nullable=True)  # Brief summary of conversation
    messages_json = Column(JSONB, nullable=False, default=list)  # Array of {role, content, toolExecutions?, taskList?}

    # Context used in conversation
    model_used = Column(String, nullable=True)
    document_ids_context = Column(JSONB, nullable=True, default=list)  # IDs of documents used as context
    folder_ids_context = Column(JSONB, nullable=True, default=list)  # IDs of folders used as context

    # Documents created during conversation
    created_document_ids = Column(JSONB, nullable=True, default=list)  # IDs of documents created by AI

    # Status
    is_archived = Column(Boolean, default=False)
    message_count = Column(Integer, default=0)

    # Timestamps
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User")
    project = relationship("Project")
    workspace = relationship("Workspace")


class DocumentAttachment(Base):
    """Many-to-many relationship between documents (copies) and images"""
    __tablename__ = "document_attachments"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    image_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)  # Images are also documents

    # Attachment metadata
    is_primary = Column(Boolean, default=False)  # Only one primary per document
    attachment_order = Column(Integer, default=0)
    created_by_workflow_id = Column(String, ForeignKey("workflow_executions.id"), nullable=True)  # Track if created by workflow

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    document = relationship("Document", foreign_keys=[document_id])
    image = relationship("Document", foreign_keys=[image_id])
