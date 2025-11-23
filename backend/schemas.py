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
