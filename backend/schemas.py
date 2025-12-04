from pydantic import BaseModel, Field, field_serializer, field_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from decimal import Decimal
from uuid import UUID

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None


class UserUpdate(BaseModel):
    """User update schema - password managed by Supabase Auth"""
    full_name: Optional[str] = None
    email: Optional[str] = None


class User(UserBase):
    id: Union[str, UUID]  # Accept both string and UUID
    created_at: datetime

    @field_serializer('id')
    def serialize_id(self, v):
        """Convert UUID to string for JSON serialization"""
        return str(v) if isinstance(v, UUID) else v

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
    settings: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# BRAND IDENTITY SCHEMAS (Feature 012)
# ============================================================================

import re

class BrandTypography(BaseModel):
    """Typography settings for brand identity"""
    primary: Optional[str] = Field(None, max_length=100, description="Primary font for headlines")
    secondary: Optional[str] = Field(None, max_length=100, description="Secondary font for body text")
    tertiary: Optional[str] = Field(None, max_length=100, description="Tertiary font for accents")


class BrandIdentity(BaseModel):
    """Brand identity settings (colors + typography)"""
    color_palette: List[str] = Field(
        default_factory=list,
        max_length=6,
        description="Ordered list of HEX colors (index 0 = primary)"
    )
    typography: Optional[BrandTypography] = None

    @field_validator('color_palette')
    @classmethod
    def validate_hex_colors(cls, colors: List[str]) -> List[str]:
        hex_pattern = re.compile(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$')
        for color in colors:
            if not hex_pattern.match(color):
                raise ValueError(f"Invalid HEX color: {color}")
        if len(colors) > 6:
            raise ValueError("Maximum 6 colors allowed in palette")
        return colors


class ColorExtractionResult(BaseModel):
    """Result from color extraction endpoint"""
    colors: List[str] = Field(description="Extracted HEX colors sorted by prevalence")
    source_filename: str
    processing_time_ms: int
    message: Optional[str] = None  # For edge cases like "Limited colors found"


class AssetColorExtractionRequest(BaseModel):
    """Request body for extracting colors from an existing asset"""
    asset_id: str = Field(..., description="ID of the visual asset to extract colors from")


class AssetColorExtractionResult(ColorExtractionResult):
    """Result from extracting colors from an existing asset"""
    source_asset_id: str = Field(description="ID of the source asset")
    source_asset_name: str = Field(description="Name of the source asset")


# Project Settings schemas
class ProjectSettingsBase(BaseModel):
    """Base schema for project settings"""
    client_name: str = Field(..., max_length=200, description="Client/company name (required)")
    description: Optional[str] = Field(None, max_length=2000, description="Project description")
    target_audience: Optional[str] = Field(None, max_length=1000, description="Target audience characteristics")
    brand_voice: Optional[str] = Field(None, description="Predefined brand voice option")
    brand_voice_custom: Optional[str] = Field(None, max_length=500, description="Custom brand voice text")
    key_messages: Optional[List[str]] = Field(None, max_items=10, description="Key messages or talking points")
    competitors: Optional[List[str]] = Field(None, max_items=10, description="Competitor names")
    custom_notes: Optional[str] = Field(None, max_length=5000, description="Additional notes for AI context")
    brand_identity: Optional[BrandIdentity] = Field(None, description="Brand colors and typography")


class ProjectSettingsUpdate(BaseModel):
    """Schema for updating project settings (all fields optional except client_name)"""
    client_name: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    target_audience: Optional[str] = Field(None, max_length=1000)
    brand_voice: Optional[str] = None
    brand_voice_custom: Optional[str] = Field(None, max_length=500)
    key_messages: Optional[List[str]] = None
    competitors: Optional[List[str]] = None
    custom_notes: Optional[str] = Field(None, max_length=5000)
    brand_identity: Optional[BrandIdentity] = None


class ProjectSettings(ProjectSettingsBase):
    """Full project settings response"""
    pass


class ProjectContext(BaseModel):
    """Formatted AI context from project settings"""
    formatted_context: str = Field(..., description="Formatted text ready for AI prompt injection")
    has_settings: bool = Field(..., description="Whether project has settings configured")
    missing_fields: List[str] = Field(default_factory=list, description="Suggested fields to improve AI responses")

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
    is_context: Optional[bool] = None

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
    is_context: Optional[bool] = False  # Context file for RAG
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
    id: Union[str, UUID]
    user_id: Union[str, UUID]
    workspace_id: Optional[Union[str, UUID]] = None
    project_id: Optional[Union[str, UUID]] = None
    model: str
    provider: str
    request_type: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    input_cost: Union[float, Decimal]
    output_cost: Union[float, Decimal]
    total_cost: Union[float, Decimal]
    prompt_preview: Optional[str] = None
    response_preview: Optional[str] = None
    tool_calls: Optional[List[str]] = None
    created_at: datetime
    duration_ms: Optional[int] = None

    class Config:
        from_attributes = True

    # Serialize UUID fields to strings for JSON output
    @field_serializer('id', 'user_id', 'workspace_id', 'project_id')
    def serialize_uuid(self, v):
        if isinstance(v, UUID):
            return str(v)
        return v

    # Serialize Decimal to float for JSON output
    @field_serializer('input_cost', 'output_cost', 'total_cost')
    def serialize_decimal(self, v):
        if isinstance(v, Decimal):
            return float(v)
        return v

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
    project_id: Optional[str] = None
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
    workspace_id: Optional[str] = None  # NULL for system templates
    project_id: Optional[str] = None
    nodes_json: List[WorkflowNode] = Field(serialization_alias="nodes")
    edges_json: List[WorkflowEdge] = Field(serialization_alias="edges")
    default_params_json: Dict[str, Any] = Field(serialization_alias="default_params")
    is_system: bool
    is_recommended: bool
    usage_count: int
    version: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True  # Allow both names and aliases

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


# ============================================================================
# USER PREFERENCES SCHEMAS
# ============================================================================

class UserPreferencesBase(BaseModel):
    autonomous_mode: bool = False
    max_iterations: int = Field(default=15, ge=1, le=50)
    default_model: Optional[str] = None
    use_rag_by_default: bool = True
    settings: Optional[Dict[str, Any]] = {}


class UserPreferencesCreate(UserPreferencesBase):
    pass


class UserPreferencesUpdate(BaseModel):
    autonomous_mode: Optional[bool] = None
    max_iterations: Optional[int] = Field(default=None, ge=1, le=50)
    default_model: Optional[str] = None
    use_rag_by_default: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None


class UserPreferencesRead(UserPreferencesBase):
    id: str
    user_id: Union[str, UUID]  # Accept both string and UUID from database
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# CHAT CONVERSATION SCHEMAS
# ============================================================================

class ChatMessageSchema(BaseModel):
    role: str  # user, assistant, system
    content: str
    toolExecutions: Optional[List[Dict[str, Any]]] = None
    taskList: Optional[List[Dict[str, Any]]] = None


class ChatConversationBase(BaseModel):
    title: Optional[str] = None
    project_id: Optional[str] = None


class ChatConversationCreate(ChatConversationBase):
    workspace_id: str
    messages: List[ChatMessageSchema] = []
    model_used: Optional[str] = None
    document_ids_context: Optional[List[str]] = []
    folder_ids_context: Optional[List[str]] = []


class ChatConversationUpdate(BaseModel):
    title: Optional[str] = None
    messages: Optional[List[ChatMessageSchema]] = None
    is_archived: Optional[bool] = None
    created_document_ids: Optional[List[str]] = None


class ChatConversationSummary(BaseModel):
    id: str
    title: Optional[str] = None
    summary: Optional[str] = None
    message_count: int
    model_used: Optional[str] = None
    is_archived: bool
    last_message_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatConversationDetail(ChatConversationSummary):
    project_id: Optional[str] = None
    workspace_id: str
    messages_json: List[ChatMessageSchema] = Field(serialization_alias="messages")
    document_ids_context: Optional[List[str]] = []
    folder_ids_context: Optional[List[str]] = []
    created_document_ids: Optional[List[str]] = []
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True


class ChatConversationList(BaseModel):
    conversations: List[ChatConversationSummary]
    total: int
    page: int
    page_size: int


# ============================================================================
# SMART VISUAL ASSETS SCHEMAS (Feature 011)
# ============================================================================

from enum import Enum


class AssetCategory(str, Enum):
    """Visual asset categories for AI classification"""
    LOGO = "Logo"
    PESSOA = "Pessoa"
    BACKGROUND = "Background"
    PRODUTO = "Produto"
    OUTRO = "Outro"


class VisualContextMode(str, Enum):
    """Visual context selection mode"""
    MANUAL = "manual"
    AUTO = "auto"


# Asset Classification Schemas (US1)
class AssetClassificationResult(BaseModel):
    """Result of AI image classification"""
    asset_id: str
    suggested_category: AssetCategory
    suggested_tags: List[str] = Field(default_factory=list, max_length=10)
    ai_description: str = Field(max_length=500)
    confidence: Optional[float] = Field(None, ge=0, le=1)


class AssetMetadataUpdate(BaseModel):
    """Update asset classification metadata"""
    category: Optional[AssetCategory] = None
    tags: Optional[List[str]] = Field(None, max_length=10)
    ai_description: Optional[str] = Field(None, max_length=500)


# Visual Asset Schemas
class VisualAsset(BaseModel):
    """Visual asset with classification metadata"""
    id: str
    project_id: str
    name: str
    file_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[AssetCategory] = None
    tags: Optional[List[str]] = None
    ai_description: Optional[str] = None
    is_classified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VisualAssetList(BaseModel):
    """List of visual assets with categorization"""
    assets: List[VisualAsset]
    total: int
    by_category: Optional[Dict[str, List[VisualAsset]]] = None


class VisualAssetsSummary(BaseModel):
    """Summary of visual assets by category"""
    total: int
    by_category: Dict[str, int]


# Assistant Visual Settings Schemas (US2)
class AssistantVisualSettingsBase(BaseModel):
    """Base settings for visual context"""
    is_enabled: bool = False
    mode: VisualContextMode = VisualContextMode.MANUAL
    assets_per_category: int = Field(default=2, ge=1, le=5)


class AssistantVisualSettingsCreate(AssistantVisualSettingsBase):
    """Create visual settings"""
    pass


class AssistantVisualSettingsUpdate(BaseModel):
    """Update visual settings (all optional)"""
    is_enabled: Optional[bool] = None
    mode: Optional[VisualContextMode] = None
    assets_per_category: Optional[int] = Field(None, ge=1, le=5)


class AssistantVisualSettings(AssistantVisualSettingsBase):
    """Full visual settings response"""
    id: str
    project_id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Asset Selection Schemas (US2 - Manual Mode)
class AssetSelection(BaseModel):
    """Single asset selection"""
    id: str
    asset_id: str
    asset: Optional[VisualAsset] = None
    is_enabled: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class AssetSelectionList(BaseModel):
    """List of asset selections"""
    selections: List[AssetSelection]
    total_enabled: int


class AssetSelectionUpdate(BaseModel):
    """Update asset selections (replace all)"""
    asset_ids: List[str] = Field(max_length=20)


# Visual Context Schemas (US3)
class VisualContextResponse(BaseModel):
    """Resolved visual context for image generation"""
    is_enabled: bool
    mode: Optional[VisualContextMode] = None
    assets: List[VisualAsset] = Field(default_factory=list, max_length=5)
    message: Optional[str] = None


# Asset Usage Schemas (US4)
class AssetUsageRecord(BaseModel):
    """Record asset usage for rotation"""
    asset_ids: List[str]
    generation_id: Optional[str] = None


# ============================================================================
# ADMIN PANEL SCHEMAS (Feature 015)
# ============================================================================

# AI Model Configuration
class AIModelDefaults(BaseModel):
    """Default models for each task type"""
    chat: str = "openai/gpt-4-turbo"
    embedding: str = "openai/text-embedding-3-small"
    vision: str = "openai/gpt-4-turbo"
    document_analysis: str = "openai/gpt-4-turbo"
    image_generation: str = "openai/dall-e-3"
    image_naming: str = "openai/gpt-3.5-turbo"


class AIModelFallbacks(BaseModel):
    """Fallback models for each task type"""
    chat: str = "openai/gpt-3.5-turbo"
    embedding: str = "openai/text-embedding-ada-002"
    vision: str = "anthropic/claude-3-sonnet"
    document_analysis: str = "anthropic/claude-3-sonnet"
    image_generation: str = "stabilityai/stable-diffusion-xl"
    image_naming: str = "openai/gpt-3.5-turbo"


class AIModelConfig(BaseModel):
    """AI model configuration"""
    defaults: Dict[str, str] = {}
    fallbacks: Dict[str, str] = {}
    visible_models: List[str] = []  # Deprecated - use visible_text_models/visible_image_models
    visible_text_models: List[str] = []
    visible_image_models: List[str] = []


class AIModelConfigUpdate(BaseModel):
    """Update AI model configuration"""
    defaults: Optional[Dict[str, str]] = None
    fallbacks: Optional[Dict[str, str]] = None
    visible_models: Optional[List[str]] = None  # Deprecated - use visible_text_models/visible_image_models
    visible_text_models: Optional[List[str]] = None
    visible_image_models: Optional[List[str]] = None


class AvailableModel(BaseModel):
    """Model available from OpenRouter"""
    id: str
    name: str
    description: Optional[str] = None
    context_length: Optional[int] = None
    pricing_prompt: Optional[str] = None
    pricing_completion: Optional[str] = None
    top_provider: Optional[str] = None
    output_modalities: Optional[List[str]] = None  # e.g., ["text"], ["embedding"], ["image"]


class ModelValidationRequest(BaseModel):
    """Request to validate a model ID"""
    model_id: str


class ModelValidationResponse(BaseModel):
    """Response from model validation"""
    valid: bool
    model_id: str
    model_name: Optional[str] = None
    message: str


# User Management
class AdminUserListItem(BaseModel):
    """User item for admin list"""
    id: Union[str, UUID]
    email: str
    full_name: Optional[str] = None
    is_super_admin: bool = False
    is_blocked: bool = False
    created_at: datetime
    last_active_at: Optional[datetime] = None
    workspace_count: int = 0

    @field_serializer('id')
    def serialize_id(self, v):
        return str(v) if isinstance(v, UUID) else v

    class Config:
        from_attributes = True


class AdminUserListResponse(BaseModel):
    """Paginated user list"""
    items: List[AdminUserListItem]
    total: int
    page: int
    limit: int


class AdminUserWorkspace(BaseModel):
    """Workspace info for user details"""
    id: str
    name: str
    role: str


class AdminUserStats(BaseModel):
    """User usage statistics"""
    total_conversations: int = 0
    total_documents: int = 0
    total_tokens_used: int = 0
    tokens_this_month: int = 0


class AdminUserDetails(BaseModel):
    """Detailed user information for admin"""
    id: Union[str, UUID]
    email: str
    full_name: Optional[str] = None
    is_super_admin: bool = False
    is_blocked: bool = False
    blocked_at: Optional[datetime] = None
    blocked_by: Optional[str] = None
    created_at: datetime
    last_active_at: Optional[datetime] = None
    workspaces: List[AdminUserWorkspace] = []
    stats: AdminUserStats = AdminUserStats()

    @field_serializer('id')
    def serialize_id(self, v):
        return str(v) if isinstance(v, UUID) else v

    class Config:
        from_attributes = True


# Workspace Management
class AdminWorkspaceOwner(BaseModel):
    """Workspace owner info"""
    id: str
    email: str
    full_name: Optional[str] = None


class AdminWorkspaceListItem(BaseModel):
    """Workspace item for admin list"""
    id: str
    name: str
    owner_id: str
    owner_email: str
    member_count: int = 0
    project_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class AdminWorkspaceListResponse(BaseModel):
    """Paginated workspace list"""
    items: List[AdminWorkspaceListItem]
    total: int
    page: int
    limit: int


class AdminWorkspaceMember(BaseModel):
    """Workspace member info"""
    user_id: str
    email: str
    full_name: Optional[str] = None
    role: str
    joined_at: Optional[datetime] = None


class AdminWorkspaceProject(BaseModel):
    """Project info for workspace details"""
    id: str
    name: str
    document_count: int = 0


class AdminWorkspaceStats(BaseModel):
    """Workspace usage statistics"""
    total_documents: int = 0
    total_conversations: int = 0
    total_tokens_used: int = 0


class AdminWorkspaceDetails(BaseModel):
    """Detailed workspace information for admin"""
    id: str
    name: str
    created_at: datetime
    owner: AdminWorkspaceOwner
    members: List[AdminWorkspaceMember] = []
    projects: List[AdminWorkspaceProject] = []
    stats: AdminWorkspaceStats = AdminWorkspaceStats()

    class Config:
        from_attributes = True


# Dashboard & Metrics
class UserMetrics(BaseModel):
    """User metrics for dashboard"""
    total: int = 0
    active: int = 0
    new_this_period: int = 0
    blocked: int = 0


class WorkspaceMetrics(BaseModel):
    """Workspace metrics for dashboard"""
    total: int = 0
    active: int = 0
    avg_members: float = 0.0


class AIUsageMetrics(BaseModel):
    """AI usage metrics for dashboard"""
    total_tokens: int = 0
    api_calls: int = 0
    error_rate: float = 0.0


class DashboardMetrics(BaseModel):
    """Combined dashboard metrics"""
    users: UserMetrics = UserMetrics()
    workspaces: WorkspaceMetrics = WorkspaceMetrics()
    ai_usage: AIUsageMetrics = AIUsageMetrics()
    period: str = "30d"


class SystemAlert(BaseModel):
    """System alert"""
    id: str
    severity: str  # info, warning, error, critical
    title: str
    message: str
    created_at: datetime


class UsageDataPoint(BaseModel):
    """Single data point for usage stats"""
    date: Optional[str] = None
    model: Optional[str] = None
    user_id: Optional[str] = None
    tokens: int = 0
    api_calls: int = 0


class UsageStats(BaseModel):
    """Usage statistics response"""
    data: List[UsageDataPoint] = []
    period: str = "30d"
    group_by: str = "day"


# System Settings
class GlobalLimits(BaseModel):
    """Global system limits"""
    max_tokens_per_user_month: int = 1000000
    max_workspaces_per_user: int = 10
    max_documents_per_project: int = 500
    max_image_size_mb: int = 10
    max_concurrent_workflows: int = 5
    updated_at: Optional[datetime] = None


class GlobalLimitsUpdate(BaseModel):
    """Update global limits"""
    max_tokens_per_user_month: Optional[int] = Field(None, ge=0)
    max_workspaces_per_user: Optional[int] = Field(None, ge=1)
    max_documents_per_project: Optional[int] = Field(None, ge=1)
    max_image_size_mb: Optional[int] = Field(None, ge=1)
    max_concurrent_workflows: Optional[int] = Field(None, ge=1)


class FeatureFlags(BaseModel):
    """Feature flags"""
    enable_image_generation: bool = True
    enable_workflows: bool = True
    enable_rag: bool = True
    enable_vision: bool = True
    maintenance_mode: bool = False
    updated_at: Optional[datetime] = None


class FeatureFlagsUpdate(BaseModel):
    """Update feature flags"""
    enable_image_generation: Optional[bool] = None
    enable_workflows: Optional[bool] = None
    enable_rag: Optional[bool] = None
    enable_vision: Optional[bool] = None
    maintenance_mode: Optional[bool] = None


class ApiKeyStatus(BaseModel):
    """API key status (masked)"""
    openrouter: Dict[str, Any] = {
        "configured": False,
        "masked_key": None,
        "updated_at": None
    }


class ApiKeyUpdate(BaseModel):
    """Update API keys"""
    openrouter_key: Optional[str] = None


# Audit Log
class AdminAuditLogEntry(BaseModel):
    """Audit log entry"""
    id: Union[str, UUID]
    admin_id: Union[str, UUID]
    admin_email: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    @field_serializer('id', 'admin_id')
    def serialize_uuid(self, v):
        return str(v) if isinstance(v, UUID) else v

    class Config:
        from_attributes = True


class AdminAuditLogResponse(BaseModel):
    """Paginated audit log"""
    items: List[AdminAuditLogEntry]
    total: int
    page: int
    limit: int


# Admin verification
class AdminVerifyResponse(BaseModel):
    """Admin verification response"""
    is_admin: bool
    user_id: str
    email: str


# ============================================================================
# IMAGE REFINEMENT SCHEMAS (Feature 016 - V1 Polish)
# ============================================================================

class RefinementHistoryEntry(BaseModel):
    """Single entry in refinement history"""
    prompt: str
    applied_at: datetime


class RefineImageResponse(BaseModel):
    """Enhanced response from image refinement with quality preservation fields"""
    document_id: str
    file_url: str
    thumbnail_url: str
    title: str
    generation_metadata: Dict[str, Any]
    original_image_id: Optional[str] = None  # ID of the original image (for quality preservation)
    refinement_count: int = 0  # Number of refinements applied to original
    refinement_history: List[RefinementHistoryEntry] = []  # History of all refinements


class EnrichPromptRequest(BaseModel):
    """Request to enrich a user prompt with brand context"""
    prompt: str = Field(..., min_length=1, max_length=1000)
    project_id: str


class EnrichPromptResponse(BaseModel):
    """Response from prompt enrichment"""
    original_prompt: str
    enriched_prompt: str
    brand_context_applied: bool = False
    model_used: str


class DeleteImagePermanentResponse(BaseModel):
    """Response from permanent image deletion"""
    success: bool
    message: str
    deleted_files: List[str] = []  # URLs of deleted files from storage


class DetachImageResponse(BaseModel):
    """Response from image detachment"""
    success: bool
    message: str
    image_id: str  # ID of the detached image (still available in library)
