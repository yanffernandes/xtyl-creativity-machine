# API Contracts: FastAPI to NestJS Module Migration

> Comprehensive mapping of every FastAPI router endpoint to its NestJS module equivalent.
> Generated from source code analysis of all backend routers, services, and schemas.

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Auth Module](#2-auth-module)
3. [Workspaces Module](#3-workspaces-module)
4. [Projects Module](#4-projects-module)
5. [Documents Module](#5-documents-module)
6. [Chat Module](#6-chat-module)
7. [Workflows Module](#7-workflows-module)
8. [Executions Module](#8-executions-module)
9. [Image Generation Module](#9-image-generation-module)
10. [Templates Module](#10-templates-module)
11. [Admin Module](#11-admin-module)
12. [AI Usage Module](#12-ai-usage-module)
13. [Activity Module](#13-activity-module)
14. [Campaigns Module](#14-campaigns-module)
15. [Conversations Module](#15-conversations-module)
16. [Copies Module](#16-copies-module)
17. [Memories Module](#17-memories-module)
18. [Models Module](#18-models-module)
19. [Project Workflows Module](#19-project-workflows-module)
20. [Prompts Module](#20-prompts-module)
21. [Storage Module](#21-storage-module)
22. [System Module](#22-system-module)
23. [Validation Module](#23-validation-module)
24. [Visual Assets Module](#24-visual-assets-module)
25. [Shared Services](#25-shared-services)
26. [External Integrations](#26-external-integrations)
27. [SSE Streaming Endpoints](#27-sse-streaming-endpoints)
28. [Job Queue Mapping](#28-job-queue-mapping)
29. [Authentication & Authorization](#29-authentication--authorization)

---

## 1. Module Overview

### FastAPI Router to NestJS Module Mapping

| FastAPI Router File | Prefix | NestJS Module | NestJS Controller | NestJS Service |
|---|---|---|---|---|
| `routers/auth.py` | `/auth` | `AuthModule` | `AuthController` | `AuthService` |
| `routers/workspaces.py` | `/workspaces` | `WorkspacesModule` | `WorkspacesController` | `WorkspacesService` |
| `routers/projects.py` | `/projects` | `ProjectsModule` | `ProjectsController` | `ProjectsService` |
| `routers/documents.py` | `/documents` | `DocumentsModule` | `DocumentsController` | `DocumentsService` |
| `routers/chat.py` | `/chat` | `ChatModule` | `ChatController` | `ChatService` |
| `routers/workflows.py` | `/workflows` | `WorkflowsModule` | `WorkflowsController` | `WorkflowsService` |
| `routers/executions.py` | `/workflows/executions` | `ExecutionsModule` | `ExecutionsController` | `ExecutionsService` |
| `routers/image_generation.py` | `/image-generation` | `ImageGenerationModule` | `ImageGenerationController` | `ImageGenerationService` |
| `routers/templates.py` | `/templates` | `TemplatesModule` | `TemplatesController` | `TemplatesService` |
| `routers/admin.py` | `/admin` | `AdminModule` | `AdminController` | `AdminService` |
| `routers/ai_usage.py` | `/ai-usage` | `AiUsageModule` | `AiUsageController` | `AiUsageService` |
| `routers/activity.py` | `/activity` | `ActivityModule` | `ActivityController` | `ActivityService` |
| `routers/campaigns.py` | `/projects/{project_id}/campaigns` | `CampaignsModule` | `CampaignsController` | `CampaignsService` |
| `routers/conversations.py` | `/conversations` | `ConversationsModule` | `ConversationsController` | `ConversationsService` |
| `routers/copies.py` | `/workspaces/{workspace_id}/copies` | `CopiesModule` | `CopiesController` | `CopiesService` |
| `routers/memories.py` | `/projects/{project_id}/memories` | `MemoriesModule` | `MemoriesController` | `MemoriesService` |
| `routers/models.py` | `/models` | `ModelsModule` | `ModelsController` | `ModelsService` |
| `routers/project_workflows.py` | `/projects/{project_id}/workflows` | `ProjectWorkflowsModule` | `ProjectWorkflowsController` | `ProjectWorkflowsService` |
| `routers/prompts.py` | `/prompts` | `PromptsModule` | `PromptsController` | `PromptsService` |
| `routers/storage.py` | `/storage` | `StorageModule` | `StorageController` | `StorageService` |
| `routers/system.py` | `/system` | `SystemModule` | `SystemController` | `SystemService` |
| `routers/validation.py` | `/validation` | `ValidationModule` | `ValidationController` | `ValidationService` |
| `routers/visual_assets.py` | (no prefix - uses full paths) | `VisualAssetsModule` | `VisualAssetsController` | `VisualAssetsService` |

---

## 2. Auth Module

**Source**: `backend/routers/auth.py`
**Prefix**: `/auth`
**Tags**: `["auth"]`

### NestJS Mapping

```
AuthModule
  ├── AuthController         (handles HTTP endpoints)
  ├── AuthService            (business logic)
  ├── SupabaseAuthGuard      (JWT validation via Supabase)
  └── imports: [SupabaseModule]
```

### Endpoints

| # | Method | Path | Auth | Request Schema | Response Schema | Description |
|---|--------|------|------|---------------|-----------------|-------------|
| 1 | `GET` | `/auth/me` | Yes (`get_current_user`) | - | `UserBase` (id, email, full_name, avatar_url, role, is_super_admin, workspace_id, workspace_name) | Get current authenticated user profile |
| 2 | `PUT` | `/auth/me` | Yes (`get_current_user`) | `UserUpdate` (full_name?, avatar_url?) | `UserBase` | Update current user profile |
| 3 | `POST` | `/auth/password-reset/confirm` | No (public) | Body: `{token: str, password: str}` | `{message: str}` | Confirm password reset with token. Rate limited: 5/minute |
| 4 | `POST` | `/auth/signup/invite` | Yes (`get_current_user`) | `InviteSignup` (workspace_id, token, full_name?) | `{message, user_id, email, workspace_id}` | Complete invite-based signup |
| 5 | `GET` | `/auth/invite/{token}/validate` | No (public) | Path: `token` | `{valid, email, workspace_id, workspace_name, inviter_name}` | Validate an invitation token |

### Dependencies

- **Supabase Admin Client**: User management (password reset, user creation)
- **Rate Limiter** (`slowapi`): Applied to password reset endpoint
- **Database**: `User` model via SQLAlchemy

### Pydantic Schemas

```python
class UserBase(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: Optional[str]
    is_super_admin: bool
    workspace_id: Optional[UUID]
    workspace_name: Optional[str]

class UserUpdate(BaseModel):
    full_name: Optional[str]
    avatar_url: Optional[str]

class InviteSignup(BaseModel):
    workspace_id: str
    token: str
    full_name: Optional[str]
```

---

## 3. Workspaces Module

**Source**: `backend/routers/workspaces.py`
**Prefix**: `/workspaces`
**Tags**: `["workspaces"]`

### NestJS Mapping

```
WorkspacesModule
  ├── WorkspacesController
  ├── WorkspacesService
  ├── imports: [AuthModule, EmailModule, SupabaseModule]
  └── providers: [EmailService]
```

### Endpoints

| # | Method | Path | Auth | Request Schema | Response Schema | Description |
|---|--------|------|------|---------------|-----------------|-------------|
| 1 | `POST` | `/workspaces/{workspace_id}/members` | Yes | Body: `{email: str, role?: str}` | `{message, invite_id, email, workspace_id}` | Invite user to workspace. Creates user with temp password if needed, sends invite email via Brevo |
| 2 | `GET` | `/workspaces/{workspace_id}/invites` | Yes | Query: `status?` | `List[InviteResponse]` | List workspace invites |
| 3 | `DELETE` | `/workspaces/{workspace_id}/invites/{invite_id}` | Yes | - | `{message, invite_id}` | Delete/cancel a workspace invite |

### Dependencies

- **Email Service** (Brevo/SendinBlue): Sends invitation emails
- **Supabase Admin Client**: Creates user accounts with temp passwords
- **Database**: `Workspace`, `WorkspaceUser`, `WorkspaceInvite`, `User` models

---

## 4. Projects Module

**Source**: `backend/routers/projects.py`
**Prefix**: `/projects`
**Tags**: `["projects"]`

### NestJS Mapping

```
ProjectsModule
  ├── ProjectsController
  ├── ProjectsService
  ├── ColorExtractionService
  ├── imports: [AuthModule, ModelsModule, MemoriesModule, ImageGenerationModule, VisualAssetsModule]
  └── providers: [SecurityService]
```

### Endpoints

| # | Method | Path | Auth | Request Schema | Response Schema | Description |
|---|--------|------|------|---------------|-----------------|-------------|
| 1 | `GET` | `/projects/{project_id}/settings` | Yes | - | `ProjectSettings` | Get project settings (brand identity, AI preferences, etc.) |
| 2 | `PUT` | `/projects/{project_id}/settings` | Yes | `ProjectSettingsUpdate` | `ProjectSettings` | Update project settings |
| 3 | `GET` | `/projects/{project_id}/settings/context` | Yes | - | `{brand_name, brand_description, target_audience, tone_of_voice, industry, color_palette, typography}` | Get summarized brand context for AI prompts |
| 4 | `POST` | `/projects/{project_id}/extract-colors` | Yes | Body: `{image_url: str}` | `{colors: List[str], dominant_color: str}` | Extract color palette from image URL using K-means clustering |
| 5 | `POST` | `/projects/{project_id}/extract-colors-from-asset` | Yes | Body: `{asset_id: str}` | `{colors: List[str], dominant_color: str}` | Extract color palette from visual asset |
| 6 | `DELETE` | `/projects/{project_id}` | Yes | Query: `hard_delete?: bool` | `{message, project_id, deleted_documents, deleted_workflows}` | Delete project (soft/hard) with cascade |
| 7 | `GET` | `/projects/{project_id}/bootstrap` | Yes | - | `BootstrapData` | Aggregated bootstrap: models, visual context, memories, recent docs, creative concepts |

### Key Schemas

```python
class ProjectSettings(BaseModel):
    brand_identity: Optional[Dict]  # {name, description, tone, target_audience, industry, color_palette, typography}
    ai_preferences: Optional[Dict]  # {default_model, creativity_level, default_language}
    content_guidelines: Optional[Dict]

class BootstrapData(BaseModel):
    models: Dict[str, Any]           # {text_models, image_models}
    visual_context: Optional[Dict]   # Visual assets for generation
    memories: List[Dict]             # User memories for this project
    recent_documents: List[Dict]     # Last 10 documents
    creative_concepts: List[Dict]    # Available creative concepts
    project_settings: Optional[Dict]
```

### Dependencies

- **Color Extraction Service**: K-means clustering via PIL/sklearn
- **Security Service**: `verify_project_access()`
- **Model Config Service**: Get visible text/image models for bootstrap
- **Memory Service**: Get recent memories for bootstrap
- **Visual Asset Service**: Get visual context for bootstrap
- **fal.ai Service**: Get image models list for bootstrap

---

## 5. Documents Module

**Source**: `backend/routers/documents.py`
**Prefix**: `/documents`
**Tags**: `["documents"]`

### NestJS Mapping

```
DocumentsModule
  ├── DocumentsController
  ├── DocumentsService
  ├── imports: [AuthModule, StorageModule]
  └── providers: [SecurityService]
```

### Endpoints

| # | Method | Path | Auth | Request Schema | Response Schema | Description |
|---|--------|------|------|---------------|-----------------|-------------|
| 1 | `POST` | `/documents/upload` | Yes | Form: `file`, `project_id`, `folder_id?`, `title?`, `media_type?` | `DocumentResponse` | Upload file to R2 and create document record |
| 2 | `GET` | `/documents/` | Yes | Query: `project_id`, `folder_id?`, `media_type?`, `status?`, `search?`, `include_deleted?`, `sort_by?`, `sort_order?`, `limit?`, `offset?` | `{documents: List[DocumentResponse], total: int}` | List documents with filtering and pagination |
| 3 | `POST` | `/documents/` | Yes | `DocumentCreate` (title, content?, project_id, folder_id?, media_type?, status?) | `DocumentResponse` | Create new document (text-based) |
| 4 | `GET` | `/documents/{document_id}` | Yes | - | `DocumentResponse` | Get single document by ID |
| 5 | `PUT` | `/documents/{document_id}` | Yes | `DocumentUpdate` (title?, content?, status?, media_type?, folder_id?) | `DocumentResponse` | Update document fields |
| 6 | `DELETE` | `/documents/{document_id}` | Yes | Query: `hard_delete?: bool` | `{message}` | Soft or hard delete document |
| 7 | `POST` | `/documents/{document_id}/move` | Yes | Body: `{folder_id: str or null}` | `DocumentResponse` | Move document to different folder |
| 8 | `POST` | `/documents/{document_id}/restore` | Yes | - | `DocumentResponse` | Restore soft-deleted document |
| 9 | `GET` | `/documents/{document_id}/export/{format}` | Yes | Path: `format` (pdf, docx, markdown) | StreamingResponse / `{content, filename}` | Export document to PDF/DOCX/Markdown |
| 10 | `POST` | `/documents/{document_id}/share` | Yes | Body: `{expires_in_hours?: int}` | `{share_token, public_url, expires_at?}` | Create public share link |
| 11 | `POST` | `/documents/{document_id}/unshare` | Yes | - | `{message}` | Revoke share link |
| 12 | `GET` | `/documents/shared/{share_token}` | No (public) | - | `{id, title, content, media_type, shared_at, has_expired}` | Access shared document (public) |
| 13 | `GET` | `/documents/{document_id}/attachments` | Yes | - | `List[AttachmentResponse]` | List document attachments |
| 14 | `POST` | `/documents/{document_id}/attachments` | Yes | Form: `file`, `description?` | `AttachmentResponse` | Upload attachment to document |
| 15 | `DELETE` | `/documents/{document_id}/attachments/{attachment_id}` | Yes | - | `{message}` | Delete document attachment |
| 16 | `GET` | `/documents/{document_id}/versions` | Yes | - | `List[VersionResponse]` | Get document version history |
| 17 | `POST` | `/documents/{document_id}/versions/{version_id}/restore` | Yes | - | `DocumentResponse` | Restore document to specific version |
| 18 | `GET` | `/documents/project/{project_id}/media` | Yes | Query: `media_type?`, `limit?`, `offset?` | `{documents: List, total: int}` | List project media (images, files) |

### Key Schemas

```python
class DocumentCreate(BaseModel):
    title: str
    content: Optional[str]
    project_id: str
    folder_id: Optional[str]
    media_type: Optional[str] = "text"
    status: Optional[str] = "draft"

class DocumentUpdate(BaseModel):
    title: Optional[str]
    content: Optional[str]
    status: Optional[str]
    media_type: Optional[str]
    folder_id: Optional[str]
```

### Dependencies

- **Security Service**: `verify_project_access()`, `verify_document_access()`
- **Storage Service**: File upload/download to Cloudflare R2
- **Database**: `Document`, `DocumentAttachment`, `DocumentVersion` models

---

## 6. Chat Module

**Source**: `backend/routers/chat.py`
**Prefix**: `/chat`
**Tags**: `["chat"]`

### NestJS Mapping

```
ChatModule
  ├── ChatController
  ├── ChatService
  ├── ChatStreamGateway      (WebSocket/SSE gateway)
  ├── ToolExecutionService
  ├── imports: [AuthModule, ModelsModule, MemoriesModule, StorageModule, VisualAssetsModule]
  └── providers: [LlmService, RagService, VisionService, RedisService]
```

### Endpoints

| # | Method | Path | Auth | Request Schema | Response Schema | Description |
|---|--------|------|------|---------------|-----------------|-------------|
| 1 | `GET` | `/chat/models` | Yes | - | `List[ModelInfo]` | Get available chat models (filtered by admin visibility settings) |
| 2 | `POST` | `/chat/upload-attachment` | Yes | Form: `file`, `project_id` | `{url, filename, content_type, size}` | Upload chat attachment to R2 |
| 3 | `POST` | `/chat/transcribe` | Yes | Form: `audio_file`, `language?` | `{text, language, duration}` | Transcribe audio using Whisper via OpenRouter |
| 4 | `POST` | `/chat/tool-approval` | Yes | Body: `{execution_id: str, approved: bool}` | `{message}` | Approve or reject a pending tool execution (stored in Redis) |
| 5 | `POST` | `/chat/tool-cancel` | Yes | Body: `{execution_id: str}` | `{message}` | Cancel a pending tool execution |
| 6 | `POST` | `/chat/completion` | Yes | `ChatCompletionRequest` | `ChatCompletionResponse` | Non-streaming chat completion |
| 7 | `POST` | `/chat/completion-stream` | Yes | `ChatCompletionRequest` | **SSE Stream** (see [SSE Endpoints](#27-sse-streaming-endpoints)) | Streaming chat completion with tool calling loop |
| 8 | `POST` | `/chat/analyze-image` | Yes | Body: `{image_url: str, prompt?: str}` | `{analysis: str}` | Analyze image using vision model |
| 9 | `POST` | `/chat/analyze-document-image` | Yes | Body: `{image_url: str, document_context?: str}` | `{analysis: str}` | Analyze document screenshot with context |

### Key Schemas

```python
class ChatCompletionRequest(BaseModel):
    messages: List[Dict[str, Any]]   # [{role, content, ...}]
    model: Optional[str]
    project_id: Optional[str]
    conversation_id: Optional[str]
    stream: bool = False
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int]
    tools_enabled: bool = True
    attachments: Optional[List[Dict]]
```

### Dependencies

- **LLM Service**: OpenRouter API for text generation
- **RAG Service**: Context retrieval from documents via pgvector
- **Vision Service**: Image analysis via vision-capable models
- **Memory Service**: Extract and save memories from conversation
- **Redis**: Tool approval polling (cross-worker state)
- **Model Config Service**: Get configured chat/vision models
- **AI Usage Service**: Log token usage

---

## 7. Workflows Module

**Source**: `backend/routers/workflows.py`
**Prefix**: `/workflows`
**Tags**: `["workflows"]`

### NestJS Mapping

```
WorkflowsModule
  ├── WorkflowsController
  ├── WorkflowsService
  ├── WorkflowValidatorService
  └── imports: [AuthModule]
```

### Endpoints

| # | Method | Path | Auth | Request Schema | Response Schema | Description |
|---|--------|------|------|---------------|-----------------|-------------|
| 1 | `GET` | `/workflows/` | Yes | Query: `project_id?`, `category?`, `search?`, `limit?`, `offset?` | `{workflows: List[WorkflowTemplateSummary], total: int}` | List workflow templates |
| 2 | `GET` | `/workflows/{template_id}` | Yes | - | `WorkflowTemplateDetail` | Get workflow template with full node/edge data |
| 3 | `POST` | `/workflows/` | Yes | `WorkflowTemplateCreate` | `WorkflowTemplateDetail` | Create new workflow template |
| 4 | `PUT` | `/workflows/{template_id}` | Yes | `WorkflowTemplateUpdate` | `WorkflowTemplateDetail` | Update workflow template |
| 5 | `DELETE` | `/workflows/{template_id}` | Yes | - | `{message}` | Delete workflow template |
| 6 | `POST` | `/workflows/{template_id}/duplicate` | Yes | - | `WorkflowTemplateDetail` | Duplicate workflow template |
| 7 | `POST` | `/workflows/validate` | Yes | `WorkflowValidationRequest` (nodes, edges) | `WorkflowValidationResponse` | Validate workflow structure |
| 8 | `GET` | `/workflows/categories/list` | Yes | - | `List[str]` | List available workflow categories |

### Key Schemas

```python
class WorkflowTemplateCreate(BaseModel):
    name: str
    description: Optional[str]
    project_id: str
    category: Optional[str]
    nodes_json: List[Dict]  # ReactFlow nodes
    edges_json: List[Dict]  # ReactFlow edges

class WorkflowTemplateDetail(BaseModel):
    id: str
    name: str
    description: Optional[str]
    project_id: str
    category: Optional[str]
    nodes_json: List[Dict]
    edges_json: List[Dict]
    created_at: datetime
    updated_at: datetime
```

---

## 8. Executions Module

**Source**: `backend/routers/executions.py`
**Prefix**: `/workflows/executions`
**Tags**: `["workflows"]`

### NestJS Mapping

```
ExecutionsModule
  ├── ExecutionsController
  ├── ExecutionsService
  ├── WorkflowExecutorService
  ├── ExecutionStreamGateway    (SSE gateway)
  ├── imports: [AuthModule, WorkflowsModule]
  └── providers: [WorkflowExecutor, NodeExecutor, VariableResolver, LoopExecutor, ConditionalExecutor]
```

### Endpoints

| # | Method | Path | Auth | Request Schema | Response Schema | Description |
|---|--------|------|------|---------------|-----------------|-------------|
| 1 | `POST` | `/workflows/executions/` | Yes | `ExecutionStartRequest` (template_id, input_variables?, config?) | `{execution_id, status, message}` | Start new workflow execution |
| 2 | `GET` | `/workflows/executions/{execution_id}` | Yes | - | `ExecutionDetail` | Get execution details |
| 3 | `GET` | `/workflows/executions/` | Yes | Query: `template_id?`, `status?`, `limit?`, `offset?` | `{executions: List, total: int}` | List executions |
| 4 | `GET` | `/workflows/executions/{execution_id}/jobs` | Yes | - | `List[NodeExecutionJob]` | Get individual node execution jobs |
| 5 | `POST` | `/workflows/executions/{execution_id}/pause` | Yes | - | `{message}` | Pause running execution |
| 6 | `POST` | `/workflows/executions/{execution_id}/resume` | Yes | - | `{message}` | Resume paused execution |
| 7 | `POST` | `/workflows/executions/{execution_id}/stop` | Yes | - | `{message}` | Stop running execution |
| 8 | `GET` | `/workflows/executions/{execution_id}/status` | Yes | - | `{status, progress, current_node}` | Get execution status summary |
| 9 | `GET` | `/workflows/executions/{execution_id}/stream` | Via query param `token` | Query: `token` | **SSE Stream** (see [SSE Endpoints](#27-sse-streaming-endpoints)) | Stream execution progress via SSE |

### Key Schemas

```python
class ExecutionStartRequest(BaseModel):
    template_id: str
    input_variables: Optional[Dict[str, Any]]
    config: Optional[Dict[str, Any]]

class ExecutionDetail(BaseModel):
    id: str
    template_id: str
    status: str  # "pending", "running", "paused", "completed", "failed", "stopped"
    config_json: Optional[Dict]
    execution_context: Optional[Dict]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error: Optional[str]
```

### Dependencies

- **Workflow Executor Service**: Core execution engine
- **Node Executor**: Individual node type handlers (text_generation, image_generation, processing, etc.)
- **Variable Resolver**: `{{nodeId.field}}` variable resolution
- **Celery App** (attempted): Async task queue, falls back to SSE streaming

---

## 9. Image Generation Module

**Source**: `backend/routers/image_generation.py`
**Prefix**: `/image-generation`
**Tags**: `["image-generation"]`

### NestJS Mapping

```
ImageGenerationModule
  ├── ImageGenerationController
  ├── ImageGenerationService
  ├── FalAiService
  ├── PromptEnrichmentService
  ├── BatchGenerationGateway    (SSE gateway for batch)
  ├── imports: [AuthModule, StorageModule, VisualAssetsModule, ProjectsModule]
  └── providers: [RedisService]
```

### Endpoints

| # | Method | Path | Auth | Request Schema | Response Schema | Description |
|---|--------|------|------|---------------|-----------------|-------------|
| 1 | `GET` | `/image-generation/models` | Yes | - | `List[ImageModelInfo]` | Get available fal.ai image models (8 models: 4 text-to-image + 4 image-to-image) |
| 2 | `POST` | `/image-generation/generate-unified` | Yes | `UnifiedGenerateRequest` | `UnifiedGenerateResponse` | Unified generation: auto-selects model type based on whether reference image is provided |
| 3 | `POST` | `/image-generation/generate` | Yes | Body: `{prompt, model?, project_id, n?, size?, quality?, aspect_ratio?, creative_concept_id?}` | `ImageOperationResponse` | Generate image from text prompt |
| 4 | `POST` | `/image-generation/refine` | Yes | Body: `{prompt, image_url, strength?, model?}` | `ImageOperationResponse` | Refine existing image with text instructions |
| 5 | `GET` | `/image-generation/document/{document_id}/metadata` | Yes | - | `{document_id, metadata}` | Get image generation metadata for a document |
| 6 | `GET` | `/image-generation/creative-concepts` | Yes | Query: `project_id?` | `List[CreativeConcept]` | Get creative concepts (style presets) |
| 7 | `POST` | `/image-generation/generate-batch` | Yes | `ImageBatchRequest` | `{batch_id, count, status}` | Start batch image generation (async) |
| 8 | `GET` | `/image-generation/batch/{batch_id}/stream` | Yes | - | **SSE Stream** (see [SSE Endpoints](#27-sse-streaming-endpoints)) | Stream batch generation progress |
| 9 | `GET` | `/image-generation/batch/{batch_id}/status` | Yes | - | `{batch_id, progress: {total, completed, failed, status}, images: List}` | Get batch status (polling alternative to SSE) |
| 10 | `POST` | `/image-generation/inpaint` | Yes | `InpaintRequest` | `ImageOperationResponse` | Inpaint image using mask (only GPT-Image 1.5/edit supports masks) |
| 11 | `POST` | `/image-generation/edit` | Yes | `EditRequest` | `ImageOperationResponse` | Edit image with natural language instructions |
| 12 | `POST` | `/image-generation/remove-background` | Yes | Body: `{image_url: str}` | `ImageOperationResponse` | Remove background using fal.ai/bria |
| 13 | `POST` | `/image-generation/upscale` | Yes | `UpscaleRequest` | `ImageOperationResponse` | Upscale image using fal.ai/clarity-upscaler |
| 14 | `POST` | `/image-generation/enhance` | Yes | `EnhanceRequest` | `ImageOperationResponse` | Enhance image quality (auto, faces, details, colors) |

### Key Schemas

```python
class UnifiedGenerateRequest(BaseModel):
    prompt: str
    project_id: str
    model_id: Optional[str]
    image_urls: Optional[List[str]]       # Reference images (triggers image-to-image)
    mask_url: Optional[str]               # Mask for inpainting (GPT-Image 1.5/edit only)
    num_images: int = 1
    aspect_ratio: Optional[str]
    image_size: Optional[str]
    quality: Optional[str]
    creative_concept_id: Optional[str]
    enrich_prompt: bool = True
    save_to_project: bool = True

class UnifiedGenerateResponse(BaseModel):
    images: List[Dict[str, Any]]          # [{url, document_id?, thumbnail_url?}]
    model_used: str
    enriched_prompt: Optional[str]
    original_prompt: str

class InpaintRequest(BaseModel):
    image_url: str
    mask_url: str
    prompt: str
    model: Optional[str]
    project_id: str

class EditRequest(BaseModel):
    image_url: str
    prompt: str
    model: Optional[str]
    project_id: str

class UpscaleRequest(BaseModel):
    image_url: str
    scale_factor: float = 2.0
    project_id: str

class EnhanceRequest(BaseModel):
    image_url: str
    enhancement_type: str = "auto"  # auto, faces, details, colors
    project_id: str

class ImageOperationResponse(BaseModel):
    success: bool
    image_url: Optional[str]
    document_id: Optional[str]
    thumbnail_url: Optional[str]
    model_used: Optional[str]
    error: Optional[str]

class ImageBatchRequest(BaseModel):
    prompts: List[str]
    model: Optional[str]
    project_id: str
    creative_concept_id: Optional[str]
    enrich_prompts: bool = True

class CreativeConcept(BaseModel):
    id: str
    name: str
    description: Optional[str]
    thumbnail_url: Optional[str]
    prompt_template: str
    category: Optional[str]
    style_modifiers: Optional[List[str]]
```

### Dependencies

- **fal.ai Service**: All image generation operations (text-to-image, edit, inpaint, upscale, enhance, remove-background)
- **Prompt Enrichment Service**: Enriches user prompts with brand context + quality modifiers
- **Visual Asset Service**: Provides visual context (reference images) for generation
- **Storage Service**: Upload generated images to R2
- **Redis Service**: Batch progress tracking
- **Semaphore**: Max 3 concurrent fal.ai calls (`asyncio.Semaphore(3)`)

---

## 10. Templates Module

**Source**: `backend/routers/templates.py`
**Prefix**: `/templates`
**Tags**: `["templates"]`

### NestJS Mapping

```
TemplatesModule
  ├── TemplatesController
  ├── TemplatesService
  └── imports: [AuthModule]
```

### Endpoints

| # | Method | Path | Auth | Request Schema | Response Schema | Description |
|---|--------|------|------|---------------|-----------------|-------------|
| 1 | `GET` | `/templates/` | Yes | Query: `category?`, `search?`, `workspace_id?`, `limit?`, `offset?` | `{templates: List, total: int}` | List content templates |
| 2 | `GET` | `/templates/categories` | Yes | - | `List[str]` | List template categories |
| 3 | `GET` | `/templates/{template_id}` | Yes | - | `TemplateDetail` | Get single template |
| 4 | `POST` | `/templates/` | Yes | `TemplateCreate` (name, description?, category?, content, variables?, workspace_id?) | `TemplateDetail` | Create template |
| 5 | `PUT` | `/templates/{template_id}` | Yes | `TemplateUpdate` | `TemplateDetail` | Update template |
| 6 | `DELETE` | `/templates/{template_id}` | Yes | - | `{message}` | Delete template |
| 7 | `POST` | `/templates/start-chat` | Yes | Body: `{template_id, variables: Dict, project_id}` | `{message, conversation_id}` | Start chat from template with variable substitution (`{{variable}}` and `{{#if variable}}...{{/if}}`) |

---

## 11. Admin Module

**Source**: `backend/routers/admin.py`
**Prefix**: `/admin`
**Tags**: `["admin"]`

### NestJS Mapping

```
AdminModule
  ├── AdminController
  ├── AdminService
  ├── AdminGuard              (require_admin decorator equivalent)
  ├── imports: [AuthModule, ModelsModule, MemoriesModule]
  └── providers: [ModelConfigService, AuditLogService]
```

### Endpoints

All endpoints require **admin authentication** (`require_admin` dependency).

#### Admin Verification
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `GET` | `/admin/verify` | Admin | - | `{is_admin: true, user_id, email}` | Verify current user is admin |

#### AI Model Configuration
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 2 | `GET` | `/admin/ai-models` | Admin | - | `AIModelConfig` | Get AI model configuration (defaults, fallbacks, visible models) |
| 3 | `PUT` | `/admin/ai-models` | Admin | `AIModelConfigUpdate` | `AIModelConfig` | Update AI model configuration |
| 4 | `GET` | `/admin/available-models` | Admin | Query: `type?` (text/image/embedding/all) | `List[ModelInfo]` | Get all available models from OpenRouter |
| 5 | `POST` | `/admin/validate-model` | Admin | Body: `{model_id: str}` | `{valid: bool, model_info?}` | Validate a model ID exists on OpenRouter |

#### User Management
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 6 | `GET` | `/admin/users` | Admin | Query: `search?`, `role?`, `status?`, `workspace_id?`, `limit?`, `offset?` | `{users: List[AdminUserDetails], total: int}` | List all users with admin details |
| 7 | `GET` | `/admin/users/{user_id}` | Admin | - | `AdminUserDetails` | Get user details with workspace/project counts |
| 8 | `POST` | `/admin/users/{user_id}/block` | Admin | Body: `{reason?: str}` | `{message}` | Block user account |
| 9 | `POST` | `/admin/users/{user_id}/unblock` | Admin | - | `{message}` | Unblock user account |
| 10 | `POST` | `/admin/users/{user_id}/promote` | Admin | - | `{message}` | Promote user to super_admin |
| 11 | `POST` | `/admin/users/{user_id}/demote` | Admin | - | `{message}` | Demote user from super_admin |

#### Workspace Management
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 12 | `GET` | `/admin/workspaces` | Admin | Query: `search?`, `limit?`, `offset?` | `{workspaces: List, total: int}` | List all workspaces |
| 13 | `GET` | `/admin/workspaces/{workspace_id}` | Admin | - | `WorkspaceAdminDetail` | Get workspace with members, projects, stats |
| 14 | `DELETE` | `/admin/workspaces/{workspace_id}/members/{user_id}` | Admin | - | `{message}` | Remove member from workspace |
| 15 | `POST` | `/admin/workspaces/{workspace_id}/transfer` | Admin | Body: `{new_owner_id: str}` | `{message}` | Transfer workspace ownership |

#### Dashboard / Metrics
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 16 | `GET` | `/admin/dashboard/metrics` | Admin | - | `{total_users, total_workspaces, total_projects, total_documents, total_conversations, ai_usage_stats}` | Get system-wide metrics |
| 17 | `GET` | `/admin/dashboard/activity` | Admin | Query: `days?: int` | `{activity_by_day: List}` | Get activity trend by day |
| 18 | `GET` | `/admin/dashboard/recent-activity` | Admin | Query: `limit?` | `List[ActivityEntry]` | Get recent admin activity |

#### Audit Logs
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 19 | `GET` | `/admin/audit-logs` | Admin | Query: `action?`, `entity_type?`, `admin_id?`, `limit?`, `offset?` | `{logs: List[AuditLogEntry], total: int}` | Get admin audit logs |

#### System Settings
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 20 | `GET` | `/admin/settings` | Admin | - | `Dict[str, Any]` | Get all system settings from system_config table |
| 21 | `PUT` | `/admin/settings` | Admin | Body: `{key: str, value: Any}` | `{message}` | Update a system setting |
| 22 | `GET` | `/admin/settings/limits` | Admin | - | `{max_projects, max_documents, max_file_size, ...}` | Get system limits |
| 23 | `GET` | `/admin/settings/features` | Admin | - | `{memory_enabled, visual_assets_enabled, ...}` | Get feature flags |

#### System Messages
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 24 | `GET` | `/admin/system-messages` | Admin | - | `List[SystemMessage]` | Get all system messages |
| 25 | `POST` | `/admin/system-messages` | Admin | `SystemMessage` (type, title, content, priority, dismissible, starts_at?, ends_at?) | `SystemMessage` | Create system message |
| 26 | `PUT` | `/admin/system-messages/{message_id}` | Admin | `SystemMessageUpdate` | `SystemMessage` | Update system message |
| 27 | `DELETE` | `/admin/system-messages/{message_id}` | Admin | - | `{message}` | Delete system message |

#### Memory Configuration
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 28 | `GET` | `/admin/memory-config` | Admin | - | `{enabled, extraction_model, max_per_project, stats}` | Get memory system config |
| 29 | `PUT` | `/admin/memory-config` | Admin | Body: `{enabled?, extraction_model?, max_per_project?}` | `{message}` | Update memory config |

#### Image Generation Configuration
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 30 | `GET` | `/admin/image-generation-config` | Admin | - | `{default_model, visible_models, settings}` | Get image generation config |
| 31 | `PUT` | `/admin/image-generation-config` | Admin | Body: `{default_model?, visible_models?, settings?}` | `{message}` | Update image generation config |

### Key Schemas

```python
class AdminUserDetails(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    role: Optional[str]
    is_super_admin: bool
    is_blocked: bool
    blocked_reason: Optional[str]
    workspace_count: int
    project_count: int
    document_count: int
    last_login: Optional[datetime]
    created_at: datetime

class AIModelConfig(BaseModel):
    defaults: Dict[str, str]           # {chat, embedding, vision, document, image_generation, prompt_enrichment}
    fallbacks: Dict[str, str]
    visible_text_models: List[str]
    visible_image_models: List[str]

class SystemMessage(BaseModel):
    id: Optional[str]
    type: str                          # "info", "warning", "error", "maintenance"
    title: str
    content: str
    priority: int = 0
    dismissible: bool = True
    is_active: bool = True
    starts_at: Optional[datetime]
    ends_at: Optional[datetime]
```

### Dependencies

- **Admin Service**: Audit logging, user management, statistics
- **Model Config Service**: AI model configuration CRUD
- **Memory Service**: Memory statistics and configuration

---

## 12. AI Usage Module

**Source**: `backend/routers/ai_usage.py`
**Prefix**: `/ai-usage`
**Tags**: `["ai-usage"]`

### NestJS Mapping

```
AiUsageModule
  ├── AiUsageController
  ├── AiUsageService
  └── imports: [AuthModule]
```

### Endpoints

| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `GET` | `/ai-usage/stats` | Yes | Query: `project_id?`, `period?` (7d/30d/90d) | `{total_tokens, total_cost, by_model, by_type}` | Get AI usage statistics |
| 2 | `GET` | `/ai-usage/summary` | Yes | Query: `project_id?` | `{total_requests, total_tokens, total_cost, avg_tokens_per_request}` | Get usage summary |
| 3 | `GET` | `/ai-usage/logs` | Yes | Query: `project_id?`, `model?`, `type?`, `limit?`, `offset?` | `{logs: List[UsageLog], total: int}` | Get detailed usage logs |
| 4 | `GET` | `/ai-usage/trend` | Yes | Query: `project_id?`, `days?` | `{trend: List[{date, tokens, cost, requests}]}` | Get usage trend over time |

---

## 13. Activity Module

**Source**: `backend/routers/activity.py`
**Prefix**: `/activity`
**Tags**: `["activity"]`

### NestJS Mapping

```
ActivityModule
  ├── ActivityController
  ├── ActivityService
  └── imports: [AuthModule]
```

### Endpoints

| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `GET` | `/activity/{entity_type}/{entity_id}` | Yes | Query: `limit?`, `offset?` | `{activities: List[ActivityLog], total: int}` | Get activity for any entity |
| 2 | `GET` | `/activity/project/{project_id}/recent` | Yes | Query: `limit?` | `List[ActivityLog]` | Get recent project activity |
| 3 | `GET` | `/activity/user/{user_id}/recent` | Yes | Query: `limit?` | `List[ActivityLog]` | Get recent user activity |
| 4 | `GET` | `/activity/stats/ai-vs-human/{project_id}` | Yes | - | `{ai_generated: int, human_created: int, ratio: float}` | Get AI vs human content ratio |

---

## 14. Campaigns Module

**Source**: `backend/routers/campaigns.py`
**Prefix**: `/projects/{project_id}/campaigns`
**Tags**: `["campaigns"]`

### NestJS Mapping

```
CampaignsModule
  ├── CampaignsController
  ├── CampaignsService
  └── imports: [AuthModule, ProjectsModule]
```

### Endpoints

| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `GET` | `/projects/{project_id}/campaigns` | Yes | Query: `status?`, `limit?`, `offset?` | `{campaigns: List, total: int}` | List campaigns for project |
| 2 | `POST` | `/projects/{project_id}/campaigns` | Yes | `CampaignCreate` (name, description?, type?, status?, content?, metadata?) | `CampaignResponse` | Create campaign |
| 3 | `GET` | `/projects/{project_id}/campaigns/{campaign_id}` | Yes | - | `CampaignResponse` | Get single campaign |
| 4 | `PUT` | `/projects/{project_id}/campaigns/{campaign_id}` | Yes | `CampaignUpdate` | `CampaignResponse` | Update campaign |
| 5 | `DELETE` | `/projects/{project_id}/campaigns/{campaign_id}` | Yes | - | `{message}` | Delete campaign |

### Key Schemas

```python
class CampaignCreate(BaseModel):
    name: str
    description: Optional[str]
    type: Optional[str]
    status: Optional[str] = "draft"
    content: Optional[Dict]
    metadata: Optional[Dict]
```

---

## 15. Conversations Module

**Source**: `backend/routers/conversations.py`
**Prefix**: `/conversations`
**Tags**: `["conversations"]`

### NestJS Mapping

```
ConversationsModule
  ├── ConversationsController
  ├── ConversationsService
  └── imports: [AuthModule]
```

### Endpoints

| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `POST` | `/conversations/{conversation_id}/messages` | Yes | Body: `{role: str, content: str, metadata?: Dict}` | `{message_id}` | Add message to conversation |
| 2 | `POST` | `/conversations/{conversation_id}/add-document` | Yes | Body: `{document_id: str, title?: str}` | `{message}` | Attach document to conversation |

> **Note**: Main conversation CRUD (create, list, get, delete) is handled via Supabase Client directly from the frontend, not through this router.

---

## 16. Copies Module

**Source**: `backend/routers/copies.py`
**Prefix**: `/workspaces/{workspace_id}/copies`
**Tags**: `["copy-library"]`

### NestJS Mapping

```
CopiesModule
  ├── CopiesController
  ├── CopiesService
  └── imports: [AuthModule, WorkspacesModule]
```

### Endpoints

| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `GET` | `/workspaces/{workspace_id}/copies` | Yes | Query: `category?`, `search?`, `limit?`, `offset?` | `{copies: List, total: int}` | List copy library items |
| 2 | `POST` | `/workspaces/{workspace_id}/copies` | Yes | `CopyLibraryItemCreate` (title, content, category?, tags?, metadata?) | `CopyLibraryItemResponse` | Create copy library item |
| 3 | `GET` | `/workspaces/{workspace_id}/copies/{copy_id}` | Yes | - | `CopyLibraryItemResponse` | Get single copy |
| 4 | `PUT` | `/workspaces/{workspace_id}/copies/{copy_id}` | Yes | `CopyLibraryItemUpdate` | `CopyLibraryItemResponse` | Update copy |
| 5 | `DELETE` | `/workspaces/{workspace_id}/copies/{copy_id}` | Yes | - | `{message}` | Delete copy |

### Key Schemas

```python
class CopyLibraryItemCreate(BaseModel):
    title: str
    content: str
    category: Optional[str]
    tags: Optional[List[str]]
    metadata: Optional[Dict]
```

---

## 17. Memories Module

**Source**: `backend/routers/memories.py`
**Prefix**: `/projects/{project_id}/memories`
**Tags**: `["memories"]`

### NestJS Mapping

```
MemoriesModule
  ├── MemoriesController
  ├── MemoriesService          (wraps MemoryService)
  └── imports: [AuthModule, ProjectsModule]
```

### Endpoints

| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `GET` | `/projects/{project_id}/memories` | Yes | Query: `category?`, `page?`, `per_page?` | `{memories: List[MemoryResponse], total: int, page: int, per_page: int}` | List user memories for project |
| 2 | `POST` | `/projects/{project_id}/memories` | Yes | `MemoryCreate` (content, category?) | `MemoryResponse` | Manually add a memory |
| 3 | `GET` | `/projects/{project_id}/memories/{memory_id}` | Yes | - | `MemoryResponse` | Get single memory |
| 4 | `PUT` | `/projects/{project_id}/memories/{memory_id}` | Yes | `MemoryUpdate` (content?, category?) | `MemoryResponse` | Update memory |
| 5 | `DELETE` | `/projects/{project_id}/memories/{memory_id}` | Yes | - | `{message}` | Delete single memory |
| 6 | `DELETE` | `/projects/{project_id}/memories` | Yes | - | `{message, deleted_count}` | Delete all memories for project |
| 7 | `POST` | `/projects/{project_id}/memories/search` | Yes | Body: `{query: str, limit?: int, category?: str}` | `List[MemoryResponse]` | Semantic search memories using pgvector |

### Key Schemas

```python
class MemoryCreate(BaseModel):
    content: str
    category: Optional[str] = "other"  # personal, professional, preferences, context, other

class MemoryResponse(BaseModel):
    id: UUID
    user_id: UUID
    project_id: str
    content: str
    category: str
    source_conversation_id: Optional[str]
    created_at: datetime
    updated_at: datetime
```

### Dependencies

- **Memory Service**: Core memory operations with pgvector embeddings
- **OpenRouter API**: Embedding generation (`text-embedding-3-small`)
- **OpenRouter API**: LLM for fact extraction (`gpt-4.1-nano`)

---

## 18. Models Module

**Source**: `backend/routers/models.py`
**Prefix**: `/models`
**Tags**: `["models"]`

### NestJS Mapping

```
ModelsModule
  ├── ModelsController
  ├── ModelsService
  └── imports: [AuthModule]
```

### Endpoints

| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `GET` | `/models/text` | Yes | - | `List[ModelInfo]` | Get available text/LLM models (filtered by admin visibility) |
| 2 | `GET` | `/models/image` | Yes | - | `List[ModelInfo]` | Get available image generation models |
| 3 | `GET` | `/models/{model_id}` | Yes | - | `ModelDetail` | Get model details from OpenRouter |
| 4 | `GET` | `/models/{model_id}/pricing` | Yes | - | `{model_id, prompt_price, completion_price, image_price?}` | Get model pricing info |
| 5 | `POST` | `/models/{model_id}/estimate-cost` | Yes | Body: `{tokens: int, type?: str}` | `{estimated_cost: float}` | Estimate cost for token usage |
| 6 | `GET` | `/models/defaults/{task_type}` | Yes | Path: `task_type` (chat, vision, embedding, etc.) | `{task_type, model_id, fallback_id}` | Get default model for task type |

---

## 19. Project Workflows Module

**Source**: `backend/routers/project_workflows.py`
**Prefix**: `/projects/{project_id}/workflows`
**Tags**: `["project-workflows"]`

### NestJS Mapping

```
ProjectWorkflowsModule
  ├── ProjectWorkflowsController
  ├── ProjectWorkflowsService
  └── imports: [AuthModule, WorkflowsModule, ExecutionsModule, DocumentsModule]
```

### Endpoints

| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `GET` | `/projects/{project_id}/workflows/available` | Yes | - | `List[WorkflowTemplateSummary]` | Get available workflow templates for project |
| 2 | `GET` | `/projects/{project_id}/workflows/history` | Yes | Query: `limit?`, `offset?` | `{executions: List, total: int}` | Get execution history for project |
| 3 | `POST` | `/projects/{project_id}/workflows/{execution_id}/save-to-project` | Yes | Body: `{folder_id?: str}` | `{documents: List, count: int}` | Save execution outputs as documents |
| 4 | `GET` | `/projects/{project_id}/workflows/{execution_id}/generated-documents` | Yes | - | `List[DocumentResponse]` | Get documents generated by execution |
| 5 | `GET` | `/projects/{project_id}/workflows/stats` | Yes | - | `{total_executions, successful, failed, total_documents_generated}` | Get workflow stats for project |

---

## 20. Prompts Module

**Source**: `backend/routers/prompts.py`
**Prefix**: `/prompts`
**Tags**: `["prompts"]`

### NestJS Mapping

```
PromptsModule
  ├── PromptsController
  ├── PromptsService
  └── imports: [AuthModule, ProjectsModule]
```

### Endpoints

| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `POST` | `/prompts/enrich` | Yes | Body: `{prompt: str, project_id: str}` | `{original_prompt, enriched_prompt, brand_context_applied, model_used}` | Enrich image generation prompt with brand context and quality modifiers |

### Dependencies

- **Prompt Enrichment Service**: LLM-powered prompt enhancement
- **Brand Context**: Extracted from project settings (color palette, typography)

---

## 21. Storage Module

**Source**: `backend/routers/storage.py`
**Prefix**: `/storage`
**Tags**: `["storage"]`

### NestJS Mapping

```
StorageModule
  ├── StorageController
  ├── StorageService (R2)
  └── imports: [AuthModule]
```

### Endpoints

| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `POST` | `/storage/upload-mask` | Yes | Form: `file` (PNG), `project_id` | `{url: str}` | Upload mask image for inpainting. Stored at `projects/{project_id}/masks/` in R2 |

### Dependencies

- **Storage Service**: Cloudflare R2 upload via boto3 S3 client

---

## 22. System Module

**Source**: `backend/routers/system.py`
**Prefix**: `/system`
**Tags**: `["system"]`

### NestJS Mapping

```
SystemModule
  ├── SystemController
  ├── SystemService
  └── imports: []  (no auth required)
```

### Endpoints

| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `GET` | `/system/messages` | **No** (public) | - | `{messages: List[SystemMessage]}` | Get active system messages (maintenance, announcements). Filtered by is_active, starts_at, ends_at. Sorted by priority desc |

### Response Schema

```python
# Each message in the list:
{
    "id": str,
    "type": str,           # "info", "warning", "error", "maintenance"
    "title": str,
    "content": str,
    "dismissible": bool,
    "priority": int
}
```

---

## 23. Validation Module

**Source**: `backend/routers/validation.py`
**Prefix**: `/validation`
**Tags**: `["validation"]`

### NestJS Mapping

```
ValidationModule
  ├── ValidationController
  ├── ValidationService
  └── providers: [VariableResolverService, WorkflowValidatorService]
```

### Endpoints

| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `POST` | `/validation/variables` | **No** | `VariableValidationRequest` | `VariableValidationResponse` | Validate `{{nodeId.field}}` variable references against available nodes |
| 2 | `POST` | `/validation/workflow` | **No** | `WorkflowValidationRequest` | `WorkflowValidationResponse` | Validate complete workflow structure (cycles, disconnected nodes, start/finish) |
| 3 | `GET` | `/validation/node-fields/{node_type}` | **No** | Path: `node_type` | `List[str]` | Get available output fields for a node type |
| 4 | `POST` | `/validation/execution-order` | **No** | `WorkflowValidationRequest` | `List[str]` | Calculate topological execution order for workflow nodes |

### Request/Response Schemas

```python
class VariableValidationRequest(BaseModel):
    text: str
    available_nodes: List[Dict[str, Any]]

class VariableValidationResponse(BaseModel):
    valid: bool
    variables: List[Dict[str, Any]]  # [{node_id, field_name, valid, node_exists, field_supported}]
    errors: List[str]
    warnings: List[str]

class WorkflowValidationRequest(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class WorkflowValidationResponse(BaseModel):
    valid: bool
    errors: List[str]
    warnings: List[str]
    execution_order: Optional[List[str]]
```

### Node Output Fields Map

| Node Type | Available Fields |
|-----------|-----------------|
| `start` | `input` |
| `text_generation` | `content`, `title`, `summary`, `body`, `introduction`, `conclusion` |
| `image_generation` | `url`, `prompt`, `size`, `style` |
| `processing` | `content`, `result`, `data` |
| `context_retrieval` | `documents`, `count`, `context` |
| `conditional` | `condition_result`, `branch_taken` |
| `loop` | `iteration`, `items`, `current_item` |
| `finish` | `final_output` |

---

## 24. Visual Assets Module

**Source**: `backend/routers/visual_assets.py`
**Prefix**: (no prefix - uses full paths)
**Tags**: (none specified)

### NestJS Mapping

```
VisualAssetsModule
  ├── VisualAssetsController
  ├── VisualAssetsService
  ├── AssetClassificationService
  ├── imports: [AuthModule, StorageModule]
  └── providers: [VisionService]
```

### Endpoints

#### Core Asset CRUD
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 1 | `POST` | `/projects/{project_id}/assets/upload` | Yes | Form: `file`, `asset_type`, `folder_id?`, `name?`, `tags?` (comma-sep) | `{id, title, asset_type, file_url, thumbnail_url, asset_metadata, created_at}` | Upload visual asset. Validates format (PNG/JPEG/WebP/GIF) and size (max 10MB). Generates 400x400 WebP thumbnail. Max 100 assets per project |
| 2 | `GET` | `/projects/{project_id}/assets` | Yes | Query: `asset_type?`, `folder_id?`, `tags?`, `search?`, `limit?`, `offset?` | `{total, limit, offset, assets: List}` | List visual assets with filtering |
| 3 | `GET` | `/projects/{project_id}/assets/{asset_id}` | Yes | - | Asset detail object | Get single visual asset |
| 4 | `PUT` | `/projects/{project_id}/assets/{asset_id}` | Yes | Form: `title?`, `asset_type?`, `tags?`, `folder_id?` | Updated asset object | Update visual asset metadata |
| 5 | `DELETE` | `/projects/{project_id}/assets/{asset_id}` | Yes | Query: `hard_delete?: bool` | `{message}` | Soft or hard delete visual asset |

#### Smart Classification (Feature 011)
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 6 | `POST` | `/assets/{asset_id}/classify` | Yes | Query: `force?: bool` | `AssetClassificationResult` | AI classification using vision model. Returns suggested category, tags (max 10), description |
| 7 | `PATCH` | `/assets/{asset_id}/metadata` | Yes | `AssetMetadataUpdate` (category?, tags?, ai_description?) | Updated asset metadata | Update classification metadata manually or confirm AI suggestion |

#### Smart Visual Assets List
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 8 | `GET` | `/projects/{project_id}/visual-assets` | Yes | Query: `category?`, `include_unclassified?` | `VisualAssetList` | List assets organized by category |
| 9 | `GET` | `/projects/{project_id}/visual-assets/summary` | Yes | - | `VisualAssetsSummary` | Asset count summary by category |

#### Visual Context Settings
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 10 | `GET` | `/projects/{project_id}/assistant/visual-settings` | Yes | - | `AssistantVisualSettings` | Get visual context settings (creates defaults if none) |
| 11 | `PUT` | `/projects/{project_id}/assistant/visual-settings` | Yes | `AssistantVisualSettingsUpdate` (is_enabled?, mode?, assets_per_category?) | Updated settings | Update visual context settings |

#### Asset Selections (Manual Mode)
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 12 | `GET` | `/projects/{project_id}/assistant/visual-settings/selections` | Yes | - | `AssetSelectionList` | Get manual mode selections |
| 13 | `PUT` | `/projects/{project_id}/assistant/visual-settings/selections` | Yes | `AssetSelectionUpdate` (asset_ids: List[str]) | `AssetSelectionList` | Replace all selections (max 20) |

#### Visual Context for Generation
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 14 | `GET` | `/projects/{project_id}/assistant/visual-context` | Yes | Query: `limit?` (1-5) | `VisualContextResponse` | Get resolved visual context. Auto-rotation: logos first, then least-used assets by category |

#### Usage Tracking
| # | Method | Path | Auth | Request | Response | Description |
|---|--------|------|------|---------|----------|-------------|
| 15 | `POST` | `/projects/{project_id}/assistant/visual-context/record-usage` | Yes | `AssetUsageRecord` (asset_ids: List[str], generation_id?: str) | `{message, count}` | Record asset usage for rotation algorithm |

### Key Schemas

```python
class AssetCategory(str, Enum):
    LOGO = "Logo"
    PESSOA = "Pessoa"
    BACKGROUND = "Background"
    PRODUTO = "Produto"
    REFERENCIA = "Referencia"
    OUTRO = "Outro"

class VisualContextMode(str, Enum):
    MANUAL = "manual"
    AUTO = "auto"

class AssetClassificationResult(BaseModel):
    asset_id: str
    suggested_category: AssetCategory
    suggested_tags: List[str]
    ai_description: str
    confidence: float

class VisualContextResponse(BaseModel):
    is_enabled: bool
    mode: VisualContextMode
    assets: List[VisualAsset]
    message: str
```

### Dependencies

- **Visual Asset Service**: Classification, context resolution, rotation algorithm
- **Vision Service**: AI image analysis for classification
- **Storage Service**: R2 upload (originals + thumbnails)
- **PIL (Pillow)**: Image processing, thumbnail generation

---

## 25. Shared Services

These services are used across multiple modules and should be implemented as NestJS shared/global modules.

### 25.1 LLM Service

**Current**: `backend/llm_service.py`
**NestJS**: `LlmModule` (global)

| Method | Description | External API |
|--------|-------------|-------------|
| `generate_completion()` | Text generation via OpenRouter | OpenRouter `/chat/completions` |
| `generate_completion_stream()` | Streaming text generation | OpenRouter `/chat/completions` (stream=true) |
| `generate_embedding()` | Vector embeddings | OpenRouter `/embeddings` |

**Configuration**: Uses `ModelConfigService` for model selection.

### 25.2 Storage Service

**Current**: `backend/storage_service.py`
**NestJS**: `StorageModule` (global)

| Method | Description | External API |
|--------|-------------|-------------|
| `upload_file()` | Upload file to R2 | Cloudflare R2 (S3-compatible via boto3) |
| `delete_file()` | Delete file from R2 | Cloudflare R2 |
| `get_presigned_url()` | Generate presigned URL | Cloudflare R2 |

**Configuration**: `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`

### 25.3 Email Service

**Current**: `backend/email_service.py`
**NestJS**: `EmailModule` (global)

| Method | Description | External API |
|--------|-------------|-------------|
| `send_email()` | Send transactional email | Brevo (SendinBlue) SMTP API |
| `send_invite_email()` | Send workspace invite | Brevo |
| `send_password_reset_email()` | Send password reset | Brevo |

**Configuration**: `BREVO_API_KEY`, `FROM_EMAIL`, `FROM_NAME`, `FRONTEND_URL`

### 25.4 fal.ai Service

**Current**: `backend/services/fal_ai_service.py`
**NestJS**: `FalAiModule`

| Method | Description | External API |
|--------|-------------|-------------|
| `generate_image()` | Unified text-to-image / image-to-image | fal.ai queue API |
| `inpaint()` | Inpaint with mask (GPT-Image 1.5/edit only) | fal.ai |
| `edit()` | Natural language image editing | fal.ai |
| `remove_background()` | Background removal | fal.ai/bria/background/remove |
| `upscale()` | Image upscaling | fal.ai/clarity-upscaler |
| `enhance()` | Image quality enhancement | fal.ai/clarity-upscaler |

**Models (hardcoded):**

| Model ID | Name | Type | Supports Mask |
|----------|------|------|--------------|
| `fal-ai/gpt-image-1.5` | GPT-Image 1.5 | text-to-image | No |
| `fal-ai/gemini-3-pro-image-preview` | Gemini 3 Pro | text-to-image | No |
| `fal-ai/gemini-25-flash-image` | Gemini 2.5 Flash | text-to-image | No |
| `fal-ai/bytedance/seedream/v4.5/text-to-image` | Seedream 4.5 | text-to-image | No |
| `fal-ai/gpt-image-1.5/edit` | GPT-Image 1.5 Edit | image-to-image | **Yes** |
| `fal-ai/gemini-3-pro-image-preview/edit` | Gemini 3 Pro Edit | image-to-image | No |
| `fal-ai/gemini-25-flash-image/edit` | Gemini 2.5 Flash Edit | image-to-image | No |
| `fal-ai/bytedance/seedream/v4.5/edit` | Seedream 4.5 Edit | image-to-image | No |

**Configuration**: `FAL_API_KEY`
**Retry**: 3 attempts with exponential backoff (2s-30s) for rate limit errors
**Queue Polling**: Polls `status_url` every 2s, max 300s timeout

### 25.5 Memory Service

**Current**: `backend/services/memory_service.py`
**NestJS**: `MemoryModule`

| Method | Description | External API |
|--------|-------------|-------------|
| `add()` | Add memory with embedding | OpenRouter (embeddings) |
| `get()` | Get single memory | - |
| `list()` | List memories with pagination | - |
| `update()` | Update memory + re-embed | OpenRouter (embeddings) |
| `delete()` / `delete_all()` | Delete memories | - |
| `search()` | Vector similarity search | pgvector |
| `search_relevant()` | Search for chat context | pgvector |
| `extract_facts()` | Extract facts from conversation | OpenRouter (LLM) |
| `process_facts_and_update()` | ADD/UPDATE/DELETE memory operations | OpenRouter (LLM) |
| `extract_and_save()` | Main entry: extract + save | OpenRouter (LLM + embeddings) |
| `build_memory_context()` | Format memories for system prompt | - |

### 25.6 Prompt Enrichment Service

**Current**: `backend/services/prompt_enrichment_service.py`
**NestJS**: Part of `ImageGenerationModule`

| Method | Description | External API |
|--------|-------------|-------------|
| `enrich_prompt()` | Enhance image prompt with brand context + quality modifiers | OpenRouter (LLM) |

**Retry**: 3 attempts with exponential backoff for rate limits
**Fallback**: Template-based enrichment when LLM call fails

### 25.7 Visual Asset Service

**Current**: `backend/services/visual_asset_service.py`
**NestJS**: `VisualAssetsModule`

| Method | Description | External API |
|--------|-------------|-------------|
| `classify_asset()` | AI classification via vision | Vision Service (OpenRouter) |
| `update_asset_metadata()` | Update classification data | - |
| `get_visual_assets()` | List with category grouping | - |
| `get_visual_assets_summary()` | Count by category | - |
| `get_visual_context()` | Resolve visual context (auto-rotation) | - |
| `get_intelligent_visual_context()` | AI-selected assets based on prompt | OpenRouter (LLM) |
| `record_asset_usage()` | Track usage for rotation | - |

### 25.8 Security Service

**Current**: `backend/services/security_service.py`
**NestJS**: Guards and decorators

| Method | NestJS Equivalent | Description |
|--------|-------------------|-------------|
| `verify_project_access()` | `@UseGuards(ProjectAccessGuard)` | Verify user workspace membership for project |
| `verify_document_access()` | `@UseGuards(DocumentAccessGuard)` | Verify user access to document via project |
| `verify_workflow_access()` | `@UseGuards(WorkflowAccessGuard)` | Verify user access to workflow via project |
| `validate_file_path()` | `FilePathPipe` | Prevent path traversal attacks |
| `verify_admin_access()` | `@UseGuards(AdminGuard)` | Verify super_admin status |

### 25.9 Model Config Service

**Current**: `backend/services/model_config_service.py`
**NestJS**: Part of `ModelsModule` or global `ConfigModule`

| Method | Description |
|--------|-------------|
| `get_model(type)` | Get configured model ID for task type (chat, vision, embedding, etc.) |
| `get_fallback_model(type)` | Get fallback model for task type |
| `get_visible_text_models()` | Get admin-configured visible text models |
| `get_visible_image_models()` | Get admin-configured visible image models |
| `update_model_config()` | Update default/fallback models |
| `update_visible_text_models()` | Update visible text model list |
| `update_visible_image_models()` | Update visible image model list |

**Caching**: In-memory cache with 60s TTL. Invalidated on updates.
**Storage**: `system_config` table (JSONB values)

### 25.10 Redis Service

**Current**: `backend/services/redis_service.py`
**NestJS**: `RedisModule` (global), use `@nestjs/bullmq` for queue

| Method | Description |
|--------|-------------|
| `get_redis()` | Get async Redis client with connection pooling |
| `create_batch()` | Initialize batch progress tracking |
| `update_image_status()` | Update single image status in batch |
| `get_batch_status()` | Get batch progress + image statuses |
| `delete_batch()` | Delete batch data |
| `check_redis_health()` | Health check |

**Configuration**: `REDIS_URL` (default: `redis://localhost:6379/0`)
**Graceful Degradation**: Falls back if redis package unavailable

### 25.11 Admin Service

**Current**: `backend/services/admin_service.py`
**NestJS**: Part of `AdminModule`

| Method | Description |
|--------|-------------|
| `audit_log()` | Create audit log entry with IP, user agent, old/new values |
| Various user/workspace management methods | Block, unblock, promote, demote, etc. |
| Dashboard statistics methods | Aggregate metrics across system |

---

## 26. External Integrations

### 26.1 OpenRouter API

**Base URL**: `https://openrouter.ai/api/v1`
**Auth Header**: `Authorization: Bearer {OPENROUTER_API_KEY}`
**Additional Headers**: `HTTP-Referer`, `X-Title`

| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `POST /chat/completions` | ChatModule, MemoryService, PromptEnrichmentService, VisualAssetService | Text generation, fact extraction, prompt enrichment, asset selection |
| `POST /chat/completions` (stream) | ChatModule | Streaming chat completion |
| `POST /embeddings` | MemoryService | Vector embeddings for semantic search |
| `GET /models` | ModelsModule, AdminModule | List available models |
| `GET /models/{id}` | ModelsModule | Get model details and pricing |

### 26.2 fal.ai API

**Base URLs**:
- Queue: `https://queue.fal.run`
- Sync: `https://fal.run`
**Auth Header**: `Authorization: Key {FAL_API_KEY}`

| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `POST /{model_id}` | ImageGenerationModule | Text-to-image and image-to-image generation |
| `POST /fal-ai/bria/background/remove` | ImageGenerationModule | Background removal |
| `POST /fal-ai/clarity-upscaler` | ImageGenerationModule | Image upscaling and enhancement |
| `GET {status_url}` | ImageGenerationModule | Poll queue job status |
| `GET {response_url}` | ImageGenerationModule | Fetch completed job result |

### 26.3 Brevo (SendinBlue)

**Base URL**: `https://api.brevo.com/v3/smtp/email`
**Auth Header**: `api-key: {BREVO_API_KEY}`

| Endpoint | Used By | Purpose |
|----------|---------|---------|
| `POST /smtp/email` | WorkspacesModule (invites) | Send transactional emails |

### 26.4 Supabase Auth

**Integration**: JWT validation + Admin Client for user management

| Operation | Used By | Purpose |
|-----------|---------|---------|
| JWT validation (`get_current_user`) | All authenticated endpoints | Extract user from Bearer token |
| Admin: create user | WorkspacesModule | Create invited users |
| Admin: update user | AuthModule | Password reset |
| Admin: get user | AuthModule | Validate invites |

### 26.5 Cloudflare R2 (S3-Compatible)

**Client**: boto3 S3 client
**Configuration**: `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`

| Operation | Used By | Purpose |
|-----------|---------|---------|
| `put_object` | StorageModule, DocumentsModule, VisualAssetsModule, ImageGenerationModule | Upload files |
| `delete_object` | DocumentsModule | Delete files |
| Public URL construction | All modules with file storage | `{R2_PUBLIC_URL}/{folder}/{filename}` |

---

## 27. SSE Streaming Endpoints

Three endpoints use Server-Sent Events for real-time streaming. These require special migration handling in NestJS.

### 27.1 Chat Completion Stream

**Endpoint**: `POST /chat/completion-stream`
**Auth**: Bearer token in header
**Current Implementation**: FastAPI `StreamingResponse` with `text/event-stream`

**Event Types**:
```
event: content
data: {"delta": "text chunk", "model": "model_id"}

event: tool_call
data: {"tool_name": "...", "arguments": {...}, "execution_id": "..."}

event: tool_approval_required
data: {"execution_id": "...", "tool_name": "...", "description": "..."}

event: tool_result
data: {"execution_id": "...", "result": {...}}

event: memory_update
data: {"added": 1, "updated": 0, "deleted": 0}

event: error
data: {"message": "error description"}

event: done
data: {"usage": {"prompt_tokens": N, "completion_tokens": N}}
```

**NestJS Migration**: Use `@Sse()` decorator or custom `StreamableFile` with `text/event-stream` content type. Tool approval requires Redis pub/sub or similar cross-worker messaging.

### 27.2 Workflow Execution Stream

**Endpoint**: `GET /workflows/executions/{execution_id}/stream`
**Auth**: Query parameter `token` (not header)
**Current Implementation**: FastAPI `StreamingResponse`

**Event Types**:
```
event: progress
data: {"node_id": "...", "message": "...", "progress": 50}

event: node_complete
data: {"node_id": "...", "outputs": {...}, "progress": 75}

event: error
data: {"node_id": "...", "message": "...", "progress": 0}

event: complete
data: {"execution_id": "...", "progress": 100, "outputs": {...}}
```

**NestJS Migration**: Use `@Sse()` decorator. Token-based auth should use a custom guard that extracts token from query params.

### 27.3 Batch Image Generation Stream

**Endpoint**: `GET /image-generation/batch/{batch_id}/stream`
**Auth**: Bearer token in header
**Current Implementation**: FastAPI `StreamingResponse` polling Redis

**Event Types**:
```
event: progress
data: {"batch_id": "...", "completed": 2, "total": 5, "failed": 0, "status": "processing"}

event: image_complete
data: {"index": 0, "document_id": "...", "file_url": "...", "thumbnail_url": "..."}

event: image_failed
data: {"index": 1, "error": "..."}

event: batch_complete
data: {"batch_id": "...", "completed": 4, "failed": 1, "total": 5}
```

**NestJS Migration**: Use `@Sse()` with Redis pub/sub or BullMQ events. The current implementation polls Redis every 1 second, which can be replaced with Redis SUBSCRIBE for real-time push.

---

## 28. Job Queue Mapping

### Current Background Tasks

The current system uses FastAPI `BackgroundTasks` and attempted Celery integration.

| Current Mechanism | Task | NestJS Equivalent |
|-------------------|------|-------------------|
| `BackgroundTasks` | Memory extraction after chat | BullMQ queue: `memory-extraction` |
| `BackgroundTasks` | AI usage logging | BullMQ queue: `ai-usage-logging` |
| `BackgroundTasks` | Activity logging | BullMQ queue: `activity-logging` |
| `asyncio.Semaphore(3)` + concurrent tasks | Batch image generation (max 3 concurrent) | BullMQ queue: `image-generation` with concurrency=3 |
| Celery (attempted, with SSE fallback) | Workflow execution | BullMQ queue: `workflow-execution` |
| Redis polling (1s interval) | Batch progress tracking | BullMQ events or Redis pub/sub |
| Redis get/set | Tool approval cross-worker | Redis pub/sub or BullMQ |

### Proposed BullMQ Queues

| Queue Name | Concurrency | Purpose | Processors |
|------------|-------------|---------|-----------|
| `memory-extraction` | 2 | Extract and save memories from conversations | `MemoryProcessor` |
| `image-generation` | 3 | fal.ai image generation (single + batch) | `ImageGenerationProcessor` |
| `workflow-execution` | 2 | Complete workflow execution | `WorkflowExecutionProcessor` |
| `email-sending` | 5 | Transactional emails via Brevo | `EmailProcessor` |
| `asset-classification` | 2 | AI visual asset classification | `AssetClassificationProcessor` |
| `usage-logging` | 10 | AI usage and activity logging | `UsageLoggingProcessor` |

---

## 29. Authentication & Authorization

### Current Implementation

| Dependency | Purpose | Where Used |
|-----------|---------|-----------|
| `get_current_user` | Extract user from JWT Bearer token (Supabase Auth) | All authenticated endpoints |
| `require_admin` | Verify `is_super_admin=True` on user | All `/admin/*` endpoints |
| Rate limiter (`slowapi`) | Rate limiting on specific endpoints | `POST /auth/password-reset/confirm` (5/min) |

### NestJS Migration

| FastAPI | NestJS Equivalent |
|---------|-------------------|
| `Depends(get_current_user)` | `@UseGuards(SupabaseAuthGuard)` + `@CurrentUser()` param decorator |
| `Depends(require_admin)` | `@UseGuards(SupabaseAuthGuard, AdminGuard)` or `@Roles('admin')` decorator |
| `Depends(get_db)` | `@InjectRepository()` or `@InjectDataSource()` via TypeORM/Prisma |
| `slowapi` rate limiter | `@nestjs/throttler` module |
| SSE token query param | Custom `SseAuthGuard` that reads `?token=` |

### Authorization Patterns

| Pattern | Current | NestJS |
|---------|---------|--------|
| Workspace membership check | `verify_project_access()` in security_service | `ProjectAccessGuard` |
| Document ownership via project | `verify_document_access()` in security_service | `DocumentAccessGuard` |
| Workflow ownership via project | `verify_workflow_access()` in security_service | `WorkflowAccessGuard` |
| Admin-only operations | `require_admin` dependency | `AdminGuard` |
| Path traversal prevention | `validate_file_path()` | `FilePathValidationPipe` |

---

## Appendix: Environment Variables Required

| Variable | Service | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | LLM, Memory, PromptEnrichment, VisualAsset, Models | OpenRouter API authentication |
| `FAL_API_KEY` | fal.ai Service | fal.ai API authentication |
| `BREVO_API_KEY` | Email Service | Brevo transactional email |
| `SUPABASE_URL` | Auth, Database | Supabase project URL |
| `SUPABASE_KEY` | Auth | Supabase anon key (JWT validation) |
| `SUPABASE_SERVICE_KEY` | Auth (admin operations) | Supabase service role key |
| `DATABASE_URL` | All modules | PostgreSQL connection string |
| `R2_ENDPOINT` | Storage Service | Cloudflare R2 endpoint |
| `R2_ACCESS_KEY` | Storage Service | R2 access key |
| `R2_SECRET_KEY` | Storage Service | R2 secret key |
| `R2_BUCKET` | Storage Service | R2 bucket name |
| `R2_PUBLIC_URL` | Storage Service | R2 public access URL |
| `REDIS_URL` | Redis Service | Redis connection URL |
| `FROM_EMAIL` | Email Service | Sender email address |
| `FROM_NAME` | Email Service | Sender display name |
| `FRONTEND_URL` | Email Service, Auth | Frontend URL for links in emails |

---

## Appendix: Total Endpoint Count

| Module | Endpoint Count |
|--------|---------------|
| Auth | 5 |
| Workspaces | 3 |
| Projects | 7 |
| Documents | 18 |
| Chat | 9 |
| Workflows | 8 |
| Executions | 9 |
| Image Generation | 14 |
| Templates | 7 |
| Admin | 31 |
| AI Usage | 4 |
| Activity | 4 |
| Campaigns | 5 |
| Conversations | 2 |
| Copies | 5 |
| Memories | 7 |
| Models | 6 |
| Project Workflows | 5 |
| Prompts | 1 |
| Storage | 1 |
| System | 1 |
| Validation | 4 |
| Visual Assets | 15 |
| **Total** | **171** |
