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
    # NOTE: available_models removed - model visibility is now global via system_config

class Workspace(WorkspaceBase):
    id: str
    created_at: datetime
    default_text_model: Optional[str] = None
    default_vision_model: Optional[str] = None
    attachment_analysis_model: Optional[str] = None
    # NOTE: available_models removed - model visibility is now global via system_config

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
    # Feature 028: Tags and metadata (T051)
    tags: Optional[List[str]] = None
    campaign_id: Optional[str] = None
    channel: Optional[str] = None

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
    # Feature 028: Tags and metadata (T051)
    tags: Optional[List[str]] = None
    campaign_id: Optional[str] = None
    channel: Optional[str] = None
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

class TemplateVariable(BaseModel):
    """Definition of a variable in a template form"""
    key: str  # Variable key used in prompt: {{key}}
    label: str  # Display label
    type: str = "text"  # text, textarea, select
    placeholder: Optional[str] = None
    required: bool = True
    options: Optional[List[str]] = None  # For select type
    default: Optional[str] = None


class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: str  # 'trafego_pago', 'social_media', 'email', 'copy', 'seo', 'criativo'
    icon: Optional[str] = None
    prompt: str
    variables: Optional[List[TemplateVariable]] = []
    initial_message: Optional[str] = None
    expert_name: Optional[str] = None
    estimated_outputs: Optional[str] = None
    tags: Optional[List[str]] = None


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    prompt: Optional[str] = None
    variables: Optional[List[TemplateVariable]] = None
    initial_message: Optional[str] = None
    expert_name: Optional[str] = None
    estimated_outputs: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class Template(TemplateBase):
    id: str
    workspace_id: Optional[str] = None
    user_id: Optional[str] = None
    is_system: bool
    is_active: bool
    is_featured: bool = False
    usage_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """Response for listing templates"""
    templates: List[Template]
    total: int


class CreateChatFromTemplateRequest(BaseModel):
    """Request to create a chat conversation from a template"""
    template_id: str
    project_id: str
    variables: Dict[str, str]  # key-value pairs for variable substitution
    title: Optional[str] = None  # Optional custom title for the conversation


class CreateChatFromTemplateResponse(BaseModel):
    """Response after creating chat from template"""
    conversation_id: str
    title: str
    first_message: Optional[str] = None  # The AI's first response if generated


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
    user_id: Union[str, UUID]  # Accept both string and UUID from database
    status: str  # pending, running, paused, completed, failed, stopped
    progress_percent: int
    current_node_id: Optional[str] = None
    error_message: Optional[str] = None
    total_cost: Optional[Union[float, Decimal]] = 0.0  # Accept Decimal from database
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    @field_serializer('user_id')
    def serialize_user_id(self, v):
        """Convert UUID to string for JSON serialization"""
        return str(v) if isinstance(v, UUID) else v

    @field_serializer('total_cost')
    def serialize_total_cost(self, v):
        """Convert Decimal to float for JSON serialization"""
        if v is None:
            return 0.0
        return float(v) if isinstance(v, Decimal) else v

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

class DocumentAttachmentCreate(BaseModel):
    """Schema for creating attachments - document_id comes from URL path"""
    image_id: str
    is_primary: Optional[bool] = False
    attachment_order: Optional[int] = 0

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
    created_by: Optional[Union[str, UUID]] = None  # Accept both string and UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    @field_serializer('created_by')
    def serialize_created_by(self, v):
        """Convert UUID to string for JSON serialization"""
        if v is None:
            return None
        return str(v) if isinstance(v, UUID) else v

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
    user_id: Union[str, UUID]  # Accept both string and UUID from database
    status: str  # pending, running, paused, completed, failed, cancelled
    progress_percent: int
    current_node_id: Optional[str] = None
    error_message: Optional[str] = None
    total_cost: Optional[Union[float, Decimal]] = None
    total_tokens_used: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    @field_serializer('user_id')
    def serialize_user_id(self, v):
        """Convert UUID to string for JSON serialization"""
        return str(v) if isinstance(v, UUID) else v

    @field_serializer('total_cost')
    def serialize_total_cost(self, v):
        """Convert Decimal to float for JSON serialization"""
        if v is None:
            return None
        return float(v) if isinstance(v, Decimal) else v

    class Config:
        from_attributes = True

class ExecutionSummary(BaseModel):
    id: str
    workflow_id: str
    workflow_name: str
    status: str
    progress_percent: int
    total_cost: Optional[Union[float, Decimal]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    @field_serializer('total_cost')
    def serialize_total_cost(self, v):
        """Convert Decimal to float for JSON serialization"""
        if v is None:
            return None
        return float(v) if isinstance(v, Decimal) else v

class ExecutionControlResponse(BaseModel):
    execution_id: str
    status: str
    message: str


# ============================================================================
# USER PREFERENCES SCHEMAS
# ============================================================================

class UserPreferencesBase(BaseModel):
    autonomous_mode: bool = False
    max_iterations: int = Field(default=25, ge=1, le=50)  # Changed from 15 to 25 (Feature 023)
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
    REFERENCIA = "Referência"
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
# SYSTEM MESSAGES SCHEMAS (Feature 015 - Admin Panel)
# ============================================================================

class SystemMessage(BaseModel):
    """A system message to display to users"""
    id: str
    type: str  # "maintenance", "announcement", "warning", "info"
    title: str
    content: str
    is_active: bool = True
    starts_at: Optional[datetime] = None  # When to start showing (null = immediately)
    ends_at: Optional[datetime] = None  # When to stop showing (null = until deactivated)
    dismissible: bool = True  # Can users dismiss this message?
    priority: int = 0  # Higher = more important (shown first)
    created_at: datetime
    updated_at: Optional[datetime] = None


class SystemMessageCreate(BaseModel):
    """Create a new system message"""
    type: str = Field(..., pattern="^(maintenance|announcement|warning|info)$")
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=2000)
    is_active: bool = True
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    dismissible: bool = True
    priority: int = Field(default=0, ge=0, le=100)


class SystemMessageUpdate(BaseModel):
    """Update a system message"""
    type: Optional[str] = Field(None, pattern="^(maintenance|announcement|warning|info)$")
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1, max_length=2000)
    is_active: Optional[bool] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    dismissible: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=0, le=100)


class SystemMessagesResponse(BaseModel):
    """List of system messages"""
    messages: List[SystemMessage]
    total: int


class ActiveSystemMessagesResponse(BaseModel):
    """Active messages for users (public endpoint)"""
    messages: List[SystemMessage]


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


# ============================================================================
# PROJECT DELETION SCHEMAS (Feature 020)
# ============================================================================

class CascadeSummary(BaseModel):
    """Summary of cascade-deleted entities"""
    documents: int = 0
    folders: int = 0
    workflow_templates: int = 0
    workflow_executions: int = 0


class DeleteProjectResponse(BaseModel):
    """Response from soft delete project endpoint"""
    success: bool = True
    message: str
    deleted_at: datetime
    cascade_summary: CascadeSummary


# ============================================================================
# AUDIO TRANSCRIPTION SCHEMAS (Feature 021 - Voice Input)
# ============================================================================

class TranscriptionResponse(BaseModel):
    """Response from audio transcription endpoint"""
    text: str
    duration_seconds: float = 0.0
    language: str = "auto"
    processing_time_ms: int = 0


class TranscriptionError(BaseModel):
    """Error response for transcription failures"""
    error: str  # Error type identifier
    message: str  # Human-readable error message in Portuguese


# ============================================================================
# USER MEMORY SYSTEM SCHEMAS (Feature 024)
# ============================================================================

from typing import Literal

MemoryCategory = Literal['personal', 'professional', 'preference', 'plan', 'health', 'other']


class MemoryBase(BaseModel):
    """Base memory schema"""
    content: str = Field(..., min_length=1, max_length=2000)
    category: MemoryCategory = "other"


class MemoryCreate(MemoryBase):
    """Schema for creating a memory manually"""
    pass


class MemoryUpdate(BaseModel):
    """Schema for updating a memory"""
    content: Optional[str] = Field(None, min_length=1, max_length=2000)
    category: Optional[MemoryCategory] = None


class MemoryResponse(MemoryBase):
    """Schema for memory response"""
    id: Union[str, UUID]
    user_id: Union[str, UUID]
    project_id: str
    source_conversation_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_serializer('id', 'user_id')
    def serialize_uuid(self, v):
        """Convert UUID to string for JSON serialization"""
        return str(v) if isinstance(v, UUID) else v

    class Config:
        from_attributes = True


class MemoryListResponse(BaseModel):
    """Schema for listing memories with pagination"""
    memories: List[MemoryResponse]
    total: int
    page: int
    per_page: int


class MemorySearchRequest(BaseModel):
    """Schema for searching memories"""
    query: str = Field(..., min_length=1)
    limit: int = Field(5, ge=1, le=20)
    category: Optional[MemoryCategory] = None


class MemorySearchResponse(BaseModel):
    """Schema for search results"""
    memories: List[MemoryResponse]
    query: str


class DeleteAllMemoriesResponse(BaseModel):
    """Schema for delete all memories response"""
    deleted_count: int


# Internal schemas for extraction/update process
class ExtractedFact(BaseModel):
    """A single extracted fact from conversation"""
    content: str
    category: MemoryCategory = "other"


class FactExtractionResult(BaseModel):
    """Result from fact extraction LLM"""
    facts: List[str]


class MemoryOperation(BaseModel):
    """Single memory operation from update LLM"""
    id: str
    text: str
    event: Literal["ADD", "UPDATE", "DELETE", "NONE"]
    old_memory: Optional[str] = None


class MemoryUpdateResult(BaseModel):
    """Result from memory update LLM"""
    memory: List[MemoryOperation]


# ============================================================================
# IMAGE BATCH GENERATION (Feature 027 - Visual Generation Studio)
# ============================================================================

class ImageBatchRequest(BaseModel):
    """Request to generate multiple image variations"""
    prompt: str = Field(..., min_length=1)
    project_id: str
    count: int = Field(4, ge=1, le=8)
    model: Optional[str] = None
    creative_concept: Optional[str] = None  # Creative concept slug
    size: Optional[str] = "1024x1024"
    aspect_ratio: Optional[str] = None
    creativity: float = Field(0.5, ge=0.0, le=1.0)
    reference_image_url: Optional[str] = None  # Base image URL for variations
    # Feature 028: Visual context and campaign support
    reference_assets: Optional[List[str]] = Field(None, description="Visual asset UUIDs to use as reference")
    asset_mode: Optional[str] = Field("style", description="How to use assets: style, compose, base")
    apply_brand_context: bool = Field(True, description="Whether to apply brand context enrichment")
    campaign_id: Optional[str] = None
    tags: Optional[List[str]] = None
    channel: Optional[str] = None


class ImageBatchImage(BaseModel):
    """Single image result from batch generation"""
    id: str
    url: str
    prompt: str
    variation_index: int
    file_url: Optional[str] = None
    thumbnail_url: Optional[str] = None


class ImageBatchProgress(BaseModel):
    """Progress tracking for batch generation"""
    batch_id: str
    total: int
    completed: int
    failed: int
    images: List[ImageBatchImage] = []
    errors: List[str] = []
    status: str = "processing"


class ImageBatchResponse(BaseModel):
    """Initial response when starting batch generation"""
    batch_id: str
    status: str
    message: str


# ============================================================================
# CREATIVE CONCEPTS (Feature 031 - Creative Concepts Migration)
# ============================================================================

class CreativeConcept(BaseModel):
    """Creative concept for image generation"""
    id: UUID
    name: str
    name_pt: str
    slug: str
    description: Optional[str] = None
    prompt_modifier: str
    thumbnail_url: Optional[str] = None
    prompt_template: Optional[str] = None
    prompt_template_json: Optional[dict] = None
    template_variables: Optional[List[str]] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    niche: Optional[str] = None
    works_for_niches: Optional[List[str]] = None
    example_images: Optional[list] = None
    sort_order: int = 0
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CreativeConceptList(BaseModel):
    """List of creative concepts"""
    concepts: List[CreativeConcept]
    total: int


# ============================================================================
# BOOTSTRAP DATA (Feature 027 - Visual Generation Studio)
# ============================================================================

class ModelsConfig(BaseModel):
    """Available models for text and image generation"""
    text: List[AvailableModel] = []
    image: List[AvailableModel] = []
    default_image_model: Optional[str] = None


class BootstrapData(BaseModel):
    """Optimized bootstrap response for project page loading"""
    project: Optional['Project'] = None
    settings: Optional[dict] = None
    models: ModelsConfig = ModelsConfig()
    visual_context: List[VisualAsset] = []
    memories: List[MemoryResponse] = []
    # Separated by media type
    recent_copies: List['Document'] = []  # media_type='text' only
    recent_media: List['Document'] = []   # media_type='image'/'video' only
    # Deprecated - kept for backwards compatibility
    recent_documents: List['Document'] = []
    creative_concepts: List[CreativeConcept] = []

    class Config:
        from_attributes = True


# ============================================================================
# IMAGE GENERATION CONFIG (Admin Settings)
# ============================================================================

class ImageGenerationConfig(BaseModel):
    """Configuration for image generation variations"""
    count: int = Field(2, ge=1, le=8, description="Number of variations to generate")
    modifiers: List[str] = Field(default_factory=list, description="Prompt modifiers for variations")
    enabled: bool = True

    class Config:
        from_attributes = True


class ImageGenerationConfigUpdate(BaseModel):
    """Update configuration for image generation"""
    count: Optional[int] = Field(None, ge=1, le=8)
    modifiers: Optional[List[str]] = None
    enabled: Optional[bool] = None


# ============================================================================
# AGENCY STUDIO FLOW (Feature 028)
# ============================================================================

# Copy Library schemas
class CopyLibraryItemBase(BaseModel):
    """Base schema for copy library items"""
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1, max_length=10000)
    tags: List[str] = Field(default_factory=list, max_length=20)


class CopyLibraryItemCreate(CopyLibraryItemBase):
    """Schema for creating a copy library item"""
    pass


class CopyLibraryItemUpdate(BaseModel):
    """Schema for updating a copy library item"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1, max_length=10000)
    tags: Optional[List[str]] = Field(None, max_length=20)


class CopyLibraryItem(CopyLibraryItemBase):
    """Schema for copy library item response"""
    id: str
    workspace_id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CopyLibraryList(BaseModel):
    """List of copy library items"""
    items: List[CopyLibraryItem]
    total: int


# Campaign schemas
class CampaignBase(BaseModel):
    """Base schema for campaigns"""
    name: str = Field(..., min_length=1, max_length=255)
    channel: Optional[str] = Field(None, max_length=100)
    metadata: Optional[dict] = Field(default_factory=dict)


class CampaignCreate(CampaignBase):
    """Schema for creating a campaign"""
    pass


class CampaignUpdate(BaseModel):
    """Schema for updating a campaign"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    channel: Optional[str] = Field(None, max_length=100)
    metadata: Optional[dict] = None


class Campaign(CampaignBase):
    """Schema for campaign response"""
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CampaignList(BaseModel):
    """List of campaigns"""
    items: List[Campaign]
    total: int


# Image Mask schemas
class ImageMaskCreate(BaseModel):
    """Schema for creating an image mask"""
    document_id: str
    mask_base64: str = Field(..., description="PNG mask as base64 (white=edit, black=preserve)")
    prompt: str = Field(..., min_length=1, max_length=2000)
    model: Optional[str] = None


class ImageMask(BaseModel):
    """Schema for image mask response"""
    id: str
    document_id: str
    mask_url: str
    prompt: Optional[str] = None
    result_document_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RefineWithMaskResponse(BaseModel):
    """Response from refine with mask endpoint"""
    mask_id: str
    status: str
    result_document_id: Optional[str] = None


# Document Version schemas
class VersionEntry(BaseModel):
    """Single version entry in document history"""
    version: int
    title: str
    content: str
    created_at: datetime
    created_by: Optional[str] = None


class VersionHistoryResponse(BaseModel):
    """Document version history response"""
    document_id: str
    current_version: int
    versions: List[VersionEntry]


# Extended ImageBatchRequest for Feature 028
class ImageBatchRequestExtended(BaseModel):
    """Extended batch request with visual context and campaign support"""
    prompt: str = Field(..., min_length=1)
    project_id: str
    count: int = Field(4, ge=1, le=8)
    model: Optional[str] = None
    creative_concept: Optional[str] = None  # Creative concept slug
    size: Optional[str] = "1024x1024"
    aspect_ratio: Optional[str] = None
    # Feature 028 additions
    reference_assets: Optional[List[str]] = Field(None, description="Visual asset UUIDs to use as reference")
    asset_mode: Optional[str] = Field("style", description="How to use assets: style, compose, base")
    apply_brand_context: bool = Field(True, description="Whether to apply brand context enrichment")
    campaign_id: Optional[str] = None
    tags: Optional[List[str]] = None
    channel: Optional[str] = None


# ============================================================================
# FAL.AI IMAGE OPERATIONS SCHEMAS (Feature 029)
# ============================================================================

class InpaintRequest(BaseModel):
    """Request for mask-based inpainting"""
    image_url: str = Field(..., description="URL of the original image to edit")
    mask_url: str = Field(..., description="URL of the mask image (white=edit, black=preserve)")
    prompt: str = Field(..., description="Instruction for what to add/change in the masked area")
    project_id: str
    model: str = Field("fal-ai/flux-pro/v1/fill", description="Model to use for inpainting")
    guidance_scale: float = Field(7.5, ge=1.0, le=20.0, description="How closely to follow the prompt (fal.ai max: 20)")
    num_inference_steps: int = Field(28, ge=10, le=50, description="Number of denoising steps")


class EditRequest(BaseModel):
    """Request for natural language image editing"""
    image_url: str = Field(..., description="URL of the image to edit")
    prompt: str = Field(..., description="Natural language instruction for editing")
    project_id: str
    model: str = Field("fal-ai/flux-pro/kontext", description="Model to use for editing")
    preserve_elements: Optional[List[str]] = Field(None, description="Elements to preserve during editing (e.g., ['face', 'clothing'])")
    guidance_scale: float = Field(3.5, ge=1.0, le=20.0)


class RemoveBackgroundRequest(BaseModel):
    """Request for background removal"""
    image_url: str = Field(..., description="URL of the image")
    project_id: str
    output_format: str = Field("png", description="Output format (png recommended for transparency)")


class UpscaleRequest(BaseModel):
    """Request for image upscaling"""
    image_url: str = Field(..., description="URL of the image")
    project_id: str
    scale_factor: float = Field(2.0, ge=1.0, le=4.0, description="Upscale factor (2 or 4)")
    model: str = Field("fal-ai/clarity-upscaler", description="Model to use for upscaling")


class EnhanceRequest(BaseModel):
    """Request for image enhancement"""
    image_url: str = Field(..., description="URL of the image")
    project_id: str
    enhancement_type: str = Field("auto", description="Type of enhancement: auto, faces, details, colors")


class ImageOperationResponse(BaseModel):
    """
    Response for fal.ai image/video operations (Feature 029).

    Returns the created document with all operation metadata stored
    in the `generation_metadata` JSONB field.
    """
    document_id: str
    file_url: str
    thumbnail_url: str
    operation_type: str  # inpaint, edit, remove_bg, upscale, enhance, generate, video_generation
    model_used: str
    cost_cents: int = 0
    processing_time_ms: Optional[int] = None


# ============================================================================
# UNIFIED IMAGE GENERATION REQUEST (Feature 029 - Simplified)
# ============================================================================

class UnifiedGenerateRequest(BaseModel):
    """
    Unified request for image generation/editing.

    Automatically selects the appropriate endpoint based on:
    - If image_urls is provided -> uses image-to-image/edit model
    - If mask_url is provided -> uses GPT-Image 1.5/edit (only model with mask support)
    - Otherwise -> uses text-to-image model
    """
    prompt: str = Field(..., description="Text prompt or editing instruction")
    project_id: str = Field(..., description="Project ID for storage")
    model: str = Field("fal-ai/gpt-image-1.5", description="Model ID to use")
    image_urls: Optional[List[str]] = Field(None, description="Reference images (triggers edit mode)")
    mask_url: Optional[str] = Field(None, description="Mask image URL (only for GPT-Image 1.5/edit)")
    params: Optional[Dict[str, Any]] = Field(None, description="Model-specific parameters")


class UnifiedGenerateResponse(BaseModel):
    """Response from unified image generation"""
    success: bool = True
    document_id: str
    file_url: str
    thumbnail_url: str
    title: str
    model_used: str
    model_type: str  # "text-to-image" or "image-to-image"
    supports_mask: bool
    processing_time_ms: int
    generation_metadata: Dict[str, Any]
