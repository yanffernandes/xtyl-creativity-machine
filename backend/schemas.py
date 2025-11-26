from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    email: Optional[str] = None

class User(UserBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class WorkspaceBase(BaseModel):
    name: str
    description: Optional[str] = None

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_text_model: Optional[str] = None
    default_vision_model: Optional[str] = None
    attachment_analysis_model: Optional[str] = None
    available_models: Optional[List[str]] = None

class Workspace(WorkspaceBase):
    id: str
    created_at: datetime
    default_text_model: Optional[str] = None
    default_vision_model: Optional[str] = None
    attachment_analysis_model: Optional[str] = None
    available_models: Optional[List[str]] = None

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    workspace_id: str

class Project(ProjectBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    title: str
    content: Optional[str] = ""
    status: Optional[str] = "draft"
    media_type: Optional[str] = "text"  # 'text', 'image', 'pdf'

class DocumentCreate(DocumentBase):
    file_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    generation_metadata: Optional[Dict[str, Any]] = None

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None
    media_type: Optional[str] = None
    file_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    generation_metadata: Optional[Dict[str, Any]] = None

class Document(DocumentBase):
    id: str
    project_id: str
    folder_id: Optional[str] = None
    file_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    generation_metadata: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = False
    share_token: Optional[str] = None
    share_expires_at: Optional[datetime] = None
    is_reference_asset: Optional[bool] = False
    asset_type: Optional[str] = None
    asset_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    attachments: Optional[List['DocumentAttachment']] = None  # Include attached images

    class Config:
        from_attributes = True

# AI Usage Tracking Schemas

class AIUsageLogCreate(BaseModel):
    user_id: str
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    model: str
    provider: str
    request_type: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    input_cost: float
    output_cost: float
    total_cost: float
    prompt_preview: Optional[str] = None
    response_preview: Optional[str] = None
    tool_calls: Optional[List[str]] = None
    duration_ms: Optional[int] = None

class AIUsageLog(BaseModel):
    id: str
    user_id: str
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    model: str
    provider: str
    request_type: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    input_cost: float
    output_cost: float
    total_cost: float
    prompt_preview: Optional[str] = None
    response_preview: Optional[str] = None
    tool_calls: Optional[List[str]] = None
    created_at: datetime
    duration_ms: Optional[int] = None

    class Config:
        from_attributes = True

class AIUsageStats(BaseModel):
    total_requests: int
    total_tokens: int
    total_input_tokens: int
    total_output_tokens: int
    total_cost: float
    by_model: Dict[str, Any]
    by_provider: Dict[str, Any]
    by_request_type: Dict[str, Any]
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AIUsageSummary(BaseModel):
    today: AIUsageStats
    this_week: AIUsageStats
    this_month: AIUsageStats
    all_time: AIUsageStats


# Template Schemas
class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str  # 'ads', 'landing_page', 'email', 'social_media', 'seo', 'creative'
    icon: Optional[str] = None
    prompt: str
    tags: Optional[List[str]] = None

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    prompt: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None

class Template(TemplateBase):
    id: str
    workspace_id: Optional[str] = None
    user_id: Optional[str] = None
    is_system: bool
    is_active: bool
    usage_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# WORKFLOW SYSTEM SCHEMAS
# ============================================================================

# Workflow Templates
class WorkflowTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None  # social_media, paid_ads, blog, email, seo
    nodes_json: List[Dict[str, Any]] = []
    edges_json: List[Dict[str, Any]] = []
    default_params_json: Optional[Dict[str, Any]] = {}

class WorkflowTemplateCreate(WorkflowTemplateBase):
    workspace_id: str

class WorkflowTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    nodes_json: Optional[List[Dict[str, Any]]] = None
    edges_json: Optional[List[Dict[str, Any]]] = None
    default_params_json: Optional[Dict[str, Any]] = None

class WorkflowTemplate(WorkflowTemplateBase):
    id: str
    workspace_id: Optional[str] = None  # NULL for system templates
    is_system: bool
    usage_count: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Workflow Executions
class WorkflowExecutionBase(BaseModel):
    config_json: Optional[Dict[str, Any]] = {}

class WorkflowExecutionCreate(WorkflowExecutionBase):
    template_id: str
    project_id: str

class WorkflowExecution(WorkflowExecutionBase):
    id: str
    template_id: str
    project_id: str
    workspace_id: str
    user_id: str
    status: str  # pending, running, paused, completed, failed, stopped
    progress_percent: int
    current_node_id: Optional[str] = None
    error_message: Optional[str] = None
    total_cost: float
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Agent Jobs
class AgentJobBase(BaseModel):
    node_id: str
    job_type: str  # generate_copy, generate_image, attach, review
    input_data_json: Optional[Dict[str, Any]] = None

class AgentJobCreate(AgentJobBase):
    execution_id: str

class AgentJob(AgentJobBase):
    id: str
    execution_id: str
    status: str  # pending, running, completed, failed, skipped
    output_data_json: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    tokens_used: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Document Attachments
class DocumentAttachmentBase(BaseModel):
    document_id: str
    image_id: str
    is_primary: Optional[bool] = False
    attachment_order: Optional[int] = 0

class DocumentAttachmentCreate(DocumentAttachmentBase):
    pass

class DocumentAttachment(DocumentAttachmentBase):
    id: str
    created_by_workflow_id: Optional[str] = None
    created_at: datetime
    image: Optional['Document'] = None  # Include the related image document

    class Config:
        from_attributes = True

# ============================================================================
# WORKFLOW SCHEMAS
# ============================================================================

# Node position schema
class NodePosition(BaseModel):
    x: float
    y: float

# Base node data schemas for different node types
class StartNodeData(BaseModel):
    label: str
    inputVariables: Optional[List[Dict[str, Any]]] = []

class FinishNodeData(BaseModel):
    label: str
    saveToProject: bool = True
    documentTitle: Optional[str] = None
    notifyUser: bool = False

class TextGenerationNodeData(BaseModel):
    label: str
    prompt: str
    model: str
    maxTokens: Optional[int] = 1000
    temperature: Optional[float] = 0.7
    outputFormat: Optional[str] = "text"  # text, json, markdown

class ImageGenerationNodeData(BaseModel):
    label: str
    prompt: str
    model: str
    size: Optional[str] = "1024x1024"
    style: Optional[str] = None

class ConditionalNodeData(BaseModel):
    label: str
    condition: str

class LoopNodeData(BaseModel):
    label: str
    iterations: Optional[int] = None
    condition: Optional[str] = None
    maxIterations: Optional[int] = 100

class ContextRetrievalNodeData(BaseModel):
    label: str
    filters: Optional[Dict[str, Any]] = {}
    maxResults: Optional[int] = 10

class ProcessingNodeData(BaseModel):
    label: str
    prompt: str
    model: str
    outputFormat: Optional[str] = "text"  # text, json, markdown

# Workflow node schema
class WorkflowNode(BaseModel):
    id: str
    type: str  # start, finish, text_generation, image_generation, conditional, loop, context_retrieval, processing
    position: NodePosition
    data: Dict[str, Any]  # Union of all node data types

# Workflow edge schema
class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None
    label: Optional[str] = None
    type: Optional[str] = "smoothstep"

# Workflow template schemas
class WorkflowTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None

class WorkflowTemplateCreate(WorkflowTemplateBase):
    workspace_id: str
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    default_params: Optional[Dict[str, Any]] = {}
    is_system: bool = False
    is_recommended: bool = False
    version: str = "1.0"

class WorkflowTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    nodes: Optional[List[WorkflowNode]] = None
    edges: Optional[List[WorkflowEdge]] = None
    default_params: Optional[Dict[str, Any]] = None
    is_recommended: Optional[bool] = None

class WorkflowTemplateDetail(WorkflowTemplateBase):
    id: str
    workspace_id: str
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    default_params: Dict[str, Any]
    is_system: bool
    is_recommended: bool
    usage_count: int
    version: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Execution schemas
class ExecutionStartRequest(BaseModel):
    workflow_id: str
    project_id: str
    input_variables: Optional[Dict[str, Any]] = {}

class NodeExecutionLog(BaseModel):
    node_id: str
    node_name: str
    node_type: str
    status: str  # pending, running, completed, failed
    outputs: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    execution_order: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class ExecutionStatus(BaseModel):
    id: str
    workflow_id: str
    project_id: str
    workspace_id: str
    user_id: str
    status: str  # pending, running, paused, completed, failed, cancelled
    progress_percent: int
    current_node_id: Optional[str] = None
    error_message: Optional[str] = None
    total_cost: Optional[Decimal] = None
    total_tokens_used: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ExecutionSummary(BaseModel):
    id: str
    workflow_id: str
    workflow_name: str
    status: str
    progress_percent: int
    total_cost: Optional[Decimal] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

class ExecutionControlResponse(BaseModel):
    execution_id: str
    status: str
    message: str
