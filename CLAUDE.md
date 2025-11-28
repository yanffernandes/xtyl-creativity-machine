# xtyl-creativity-machine Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-25

## Active Technologies
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI (004-agent-tools-enhancement)
- PostgreSQL 15+ with pgvector (004-agent-tools-enhancement)
- Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Next.js 14, React 18, ReactFlow, Shadcn/UI, Tailwind CSS (005-workflow-visual-redesign)

- TypeScript 5.x (Frontend), Node.js 20+ (Build tools) + Next.js 14 (App Router), React 18, Tailwind CSS 3.4+, Shadcn/UI (customized), Framer Motion 10+ (animations), Radix UI (primitives) (001-premium-visual-redesign)

## Design System

### **Ethereal Blue + Liquid Glass (2025)**

#### Color Palette
- **Primary Accent**: #5B8DEF (Ethereal Blue)
- **Secondary Accent**: #4A7AD9 (Darker Blue)
- **Tertiary Accent**: #7AA5F5 (Lighter Blue)
- **Background (Light)**: Gradient from blue-50 via indigo-50 to purple-50
- **Background (Dark)**: #0A0E14 with animated gradient orbs

#### Design Principles
1. **Glassmorphism**: All cards, modals, and containers use backdrop-blur (24px-32px) with semi-transparent backgrounds
2. **Liquid Glass**: Inspired by Apple's 2025 design language with translucent surfaces and depth layering
3. **Soft Corners**: Border radius 8px-16px (no sharp 4px corners)
4. **Microanimations**: Framer Motion powered smooth transitions and hover effects
5. **Depth & Layering**: Multiple shadow layers to create 3D depth effect
6. **Professional Blue**: Replaced green (#10B981) with blue (#5B8DEF) for trust and professionalism

#### Typography
- **Headings**: Font-weight 600-700, tracking-tight
- **Body**: Font-weight 400-500
- **Scale**: h1(32px), h2(24px), h3(20px), h4(16px), body(14px), small(12px)

#### Components
- **Buttons**: Primary (solid blue), Secondary (outline blue), Ghost (transparent)
- **Cards**: Glass effect with backdrop-blur-2xl, soft shadows, gradient overlay
- **Inputs**: Translucent with glass borders, focus states in accent blue
- **Sidebar**: macOS style with rounded pills, active state filled
- **Command Palette**: Raycast-inspired with intense glassmorphism

#### Spacing & Layout
- Generous padding (p-6 standard for cards)
- Spacing scale: xs(4px), sm(8px), md(16px), lg(24px), xl(32px), 2xl(48px), 3xl(64px)

## Project Structure

```text
src/
  lib/design-tokens.ts          # Centralized design tokens
  styles/glass.css               # Glassmorphism utilities
  components/ui/                 # Shadcn/UI components (customized)
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x (Frontend), Node.js 20+ (Build tools): Follow standard conventions

**Design System Style**:
- Use design tokens from `@/lib/design-tokens`
- Apply glass effects via Tailwind utilities or inline styles
- Maintain accessibility (WCAG AA) with proper contrast ratios
- Use Framer Motion for all animations
- Follow mobile-first responsive design

## Recent Changes
- 005-workflow-visual-redesign: Added Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Next.js 14, React 18, ReactFlow, Shadcn/UI, Tailwind CSS
- 004-agent-tools-enhancement: Added Python 3.11 (Backend), TypeScript 5.x (Frontend) + FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI

- 001-premium-visual-redesign: Added TypeScript 5.x (Frontend), Node.js 20+ (Build tools) + Next.js 14 (App Router), React 18, Tailwind CSS 3.4+, Shadcn/UI (customized), Framer Motion 10+ (animations), Radix UI (primitives)

<!-- MANUAL ADDITIONS START -->

## Core Principles

### No Hardcoded Data
**CRITICAL**: Never hardcode lists of models, providers, or similar dynamic data. Always fetch from the appropriate API:
- **Text models**: Use `/chat/models` endpoint
- **Image models**: Use `/image-generation/models` endpoint
- The backend filters models by capability (e.g., `output_modalities` contains "image")
- Display exactly what the API returns - no client-side filtering or hardcoded fallbacks

### API Integration (OpenRouter)
- All LLM/Image generation goes through OpenRouter API
- API key: `OPENROUTER_API_KEY` in `.env` file
- Backend must load dotenv FIRST before any imports in `main.py`
- Use dynamic `get_api_key()` functions, not module-level variables
- Required headers: `Authorization`, `HTTP-Referer`, `X-Title`

## Workflow System Architecture

### Node Types
| Type | Purpose | Outputs |
|------|---------|---------|
| `start` | Entry point | `input_variables` |
| `text_generation` | LLM text generation | `content`, `title` |
| `image_generation` | Image generation | `file_url`, `thumbnail_url`, `title`, `prompt` |
| `processing` | Text processing/transformation | `content`, `title` |
| `context_retrieval` | RAG/document search | `context`, `content`, `documents`, `count` |
| `conditional` | Branching logic | `result`, `branch` |
| `loop` | Iteration | `item`, `current_iteration`, `iterations` |
| `finish` | Workflow end | - |

### Variable System
- Syntax: `{{nodeId.field}}` (e.g., `{{node_abc123.content}}`)
- Variables reference upstream node outputs
- `useVariableAutocomplete` hook provides suggestions based on connected nodes
- Backend resolves variables during execution via `resolve_variable_references()`

### Execution Flow
1. Frontend saves workflow → `POST /workflows/{id}`
2. Execute workflow → `POST /workflows/{id}/execute`
3. Backend streams progress via SSE (Server-Sent Events)
4. Frontend receives updates via `useWorkflowExecution` hook
5. Outputs stored in `execution.execution_context`

### Key Files
- **Frontend**:
  - `components/workflow/WorkflowCanvas.tsx` - ReactFlow canvas
  - `components/workflow/NodeConfigPanel.tsx` - Node configuration
  - `components/workflow/ModelSelector.tsx` - Model selection (API-driven)
  - `components/workflow/VariableAutocomplete.tsx` - Variable insertion
  - `hooks/useVariableAutocomplete.ts` - Variable discovery
  - `hooks/useWorkflowExecution.ts` - Execution state/SSE
  - `lib/stores/workflowStore.ts` - Zustand store

- **Backend**:
  - `routers/workflows.py` - Workflow CRUD
  - `routers/executions.py` - Execution endpoints + SSE
  - `services/workflow_executor.py` - Execution orchestration
  - `services/node_executor.py` - Individual node handlers
  - `image_generation_service.py` - Image generation + model fetching
  - `llm_service.py` - Text generation

### SSE Authentication
- Token passed via query param: `/executions/{id}/stream?token=...`
- Backend validates token in SSE endpoint
- Required for real-time execution updates

## Database

### Key Models
- `WorkflowTemplate` - Workflow definition (nodes_json, edges_json)
- `WorkflowExecution` - Execution instance (status, config_json, execution_context)
- `NodeExecutionJob` - Individual node execution record
- `Document` - Generated content (text/image)
- `Project` - Container for documents and workflows

### Storage
- MinIO for file storage (images, assets)
- PostgreSQL with pgvector for embeddings
- Redis for caching

## Development Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Docker (full stack)
docker-compose up -d
```

<!-- MANUAL ADDITIONS END -->
